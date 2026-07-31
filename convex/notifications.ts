import { ConvexError, v } from "convex/values";
import {
	daysBetween,
	formatDateBR,
	todayInSaoPaulo,
} from "../lib/domain/dates";
import { formatBRL } from "../lib/domain/money";
import {
	DIGEST_WINDOW_DAYS,
	digestPayments,
	type ReminderPayment,
	shouldSendPaymentDigest,
	subscriptionReminderDaysLeft,
} from "../lib/domain/notifications";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import {
	authedMutation,
	authedQuery,
	getViewer,
	superadminEmails,
} from "./lib/auth";
import { appBaseUrl, escapeHtml, renderEmail, sendEmail } from "./lib/email";

// Daily e-mail reminders (payments due / subscription expiring), driven by
// the cron in convex/crons.ts. Per-user opt-outs live in notificationPrefs.

export type ReminderRecipient = {
	email: string;
	role: "admin" | "member";
	paymentReminders: boolean;
	subscriptionReminders: boolean;
};

export type WeddingReminderData = {
	coupleNames: string;
	subscriptionActiveUntil?: string;
	recipients: ReminderRecipient[];
	pendingPayments: ReminderPayment[];
};

/** Stored switches for `userId`, with the "everything on" defaults applied. */
function withPrefDefaults(row: Doc<"notificationPrefs"> | null) {
	return {
		paymentReminders: row?.paymentReminders ?? true,
		subscriptionReminders: row?.subscriptionReminders ?? true,
	};
}

/** The caller's own reminder switches (defaults: everything on). */
export const myPrefs = authedQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await getViewer(ctx);
		if (viewer === null) throw new ConvexError("Não autenticado");
		return withPrefDefaults(
			await ctx.db
				.query("notificationPrefs")
				.withIndex("by_user", (q) => q.eq("userId", viewer._id))
				.unique(),
		);
	},
});

export const savePrefs = authedMutation({
	args: {
		paymentReminders: v.boolean(),
		subscriptionReminders: v.boolean(),
	},
	handler: async (ctx, prefs) => {
		const viewer = await getViewer(ctx);
		if (viewer === null) throw new ConvexError("Não autenticado");
		const row = await ctx.db
			.query("notificationPrefs")
			.withIndex("by_user", (q) => q.eq("userId", viewer._id))
			.unique();
		if (row === null) {
			await ctx.db.insert("notificationPrefs", {
				userId: viewer._id,
				...prefs,
			});
		} else {
			await ctx.db.patch(row._id, prefs);
		}
		return null;
	},
});

/** Everything the daily cron needs, gathered in one read. */
export const dailyReminderData = internalQuery({
	args: {},
	handler: async (ctx): Promise<WeddingReminderData[]> => {
		const today = todayInSaoPaulo();
		const weddings = await ctx.db.query("weddings").collect();
		return await Promise.all(
			weddings.map(async (wedding) => {
				const [memberships, payments] = await Promise.all([
					ctx.db
						.query("memberships")
						.withIndex("by_wedding_user", (q) => q.eq("weddingId", wedding._id))
						.collect(),
					ctx.db
						.query("payments")
						.withIndex("by_wedding", (q) => q.eq("weddingId", wedding._id))
						.collect(),
				]);
				const recipients = await Promise.all(
					memberships.map(async (membership) => {
						const [user, prefs] = await Promise.all([
							ctx.db.get(membership.userId),
							ctx.db
								.query("notificationPrefs")
								.withIndex("by_user", (q) => q.eq("userId", membership.userId))
								.unique(),
						]);
						if (!user?.email) return null;
						return {
							email: user.email,
							role: membership.role,
							...withPrefDefaults(prefs),
						};
					}),
				);
				// Only payments the digest can actually mention are worth naming a
				// vendor for — everything overdue plus the next DIGEST_WINDOW_DAYS.
				const relevant = payments.filter(
					(payment) =>
						payment.status === "pendente" &&
						daysBetween(today, payment.dueDate) <= DIGEST_WINDOW_DAYS,
				);
				const vendorNames = new Map(
					(
						await ctx.db
							.query("vendors")
							.withIndex("by_wedding", (q) => q.eq("weddingId", wedding._id))
							.collect()
					).map((vendor) => [vendor._id, vendor.name] as const),
				);
				return {
					coupleNames: wedding.coupleNames,
					subscriptionActiveUntil: wedding.subscriptionActiveUntil,
					recipients: recipients.filter((r) => r !== null),
					pendingPayments: relevant.map((payment) => ({
						description: payment.description,
						vendorName: vendorNames.get(payment.vendorId) ?? "Fornecedor",
						amountCents: payment.amountCents,
						dueDate: payment.dueDate,
					})),
				};
			}),
		);
	},
});

function paymentRows(payments: ReminderPayment[]): string {
	return payments
		.map(
			(p) =>
				`<tr><td style="padding:6px 12px 6px 0">${formatDateBR(p.dueDate)}</td><td style="padding:6px 12px 6px 0">${escapeHtml(p.vendorName)}</td><td style="padding:6px 12px 6px 0">${escapeHtml(p.description)}</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${formatBRL(p.amountCents)}</td></tr>`,
		)
		.join("");
}

/** Runs once a day (cron): payment digests + subscription expiry warnings. */
export const runDailyReminders = internalAction({
	args: {},
	handler: async (ctx) => {
		const today = todayInSaoPaulo();
		const weddings: WeddingReminderData[] = await ctx.runQuery(
			internal.notifications.dailyReminderData,
			{},
		);
		const supportEmail = superadminEmails()[0];
		let sentCount = 0;
		const failed: string[] = [];

		// Sends stay sequential (Resend's free tier allows ~2 req/s) and each
		// one is isolated: a single bad address must not cost every other
		// couple their reminder, and the cron is not retried.
		async function deliver(to: string, subject: string, html: string) {
			try {
				await sendEmail({ to, subject, html });
				sentCount++;
			} catch (error) {
				failed.push(to);
				console.error(`[reminders] falha ao enviar para ${to}`, error);
			}
		}

		for (const wedding of weddings) {
			if (shouldSendPaymentDigest(wedding.pendingPayments, today)) {
				const { overdue, upcoming } = digestPayments(
					wedding.pendingPayments,
					today,
				);
				const sections: string[] = [];
				if (overdue.length > 0) {
					sections.push(
						`<p><b>Atrasados:</b></p><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${paymentRows(overdue)}</table>`,
					);
				}
				if (upcoming.length > 0) {
					sections.push(
						`<p><b>Próximos 14 dias:</b></p><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${paymentRows(upcoming)}</table>`,
					);
				}
				const html = renderEmail({
					heading: "Pagamentos do casamento no radar",
					bodyHtml: `<p>Um resumo rápido para ${escapeHtml(wedding.coupleNames)} não deixar nada passar:</p>${sections.join("")}`,
					ctaLabel: "Ver no app",
					ctaUrl: `${appBaseUrl()}/financeiro`,
				});
				for (const recipient of wedding.recipients) {
					if (!recipient.paymentReminders) continue;
					await deliver(
						recipient.email,
						"Vencimentos chegando — Nosso Casamento",
						html,
					);
				}
			}

			const daysLeft = subscriptionReminderDaysLeft(
				wedding.subscriptionActiveUntil,
				today,
			);
			if (daysLeft !== null) {
				const contact = supportEmail
					? `<p>Para renovar, fale com a gente: <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`
					: "";
				const html = renderEmail({
					heading: `Seu acesso expira em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`,
					bodyHtml: `<p>O período de acesso do casamento de ${escapeHtml(wedding.coupleNames)} termina em ${formatDateBR(wedding.subscriptionActiveUntil ?? today)}.</p>
						<p>Depois disso o painel fica em modo somente leitura — nada é apagado.</p>${contact}`,
				});
				for (const recipient of wedding.recipients) {
					// Renewal is the admin's call; members aren't nagged about it.
					if (recipient.role !== "admin" || !recipient.subscriptionReminders) {
						continue;
					}
					await deliver(
						recipient.email,
						"Sua assinatura está chegando ao fim — Nosso Casamento",
						html,
					);
				}
			}
		}
		// Surfaced in the Convex dashboard's cron history, so a silent day is
		// visible without digging through logs.
		return { sentCount, failed };
	},
});
