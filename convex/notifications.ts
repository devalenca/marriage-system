import { ConvexError, v } from "convex/values";
import { formatDateBR, todayInSaoPaulo } from "../lib/domain/dates";
import { formatBRL } from "../lib/domain/money";
import {
	digestPayments,
	type ReminderPayment,
	shouldSendPaymentDigest,
	subscriptionReminderDaysLeft,
} from "../lib/domain/notifications";
import { internal } from "./_generated/api";
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

/** The caller's own reminder switches (defaults: everything on). */
export const myPrefs = authedQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await getViewer(ctx);
		if (viewer === null) throw new ConvexError("Não autenticado");
		const row = await ctx.db
			.query("notificationPrefs")
			.withIndex("by_user", (q) => q.eq("userId", viewer._id))
			.unique();
		return {
			paymentReminders: row?.paymentReminders ?? true,
			subscriptionReminders: row?.subscriptionReminders ?? true,
		};
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
		const weddings = await ctx.db.query("weddings").collect();
		const result: WeddingReminderData[] = [];
		for (const wedding of weddings) {
			const memberships = await ctx.db
				.query("memberships")
				.withIndex("by_wedding_user", (q) => q.eq("weddingId", wedding._id))
				.collect();
			const recipients: ReminderRecipient[] = [];
			for (const membership of memberships) {
				const user = await ctx.db.get(membership.userId);
				if (!user?.email) continue;
				const prefs = await ctx.db
					.query("notificationPrefs")
					.withIndex("by_user", (q) => q.eq("userId", membership.userId))
					.unique();
				recipients.push({
					email: user.email,
					role: membership.role,
					paymentReminders: prefs?.paymentReminders ?? true,
					subscriptionReminders: prefs?.subscriptionReminders ?? true,
				});
			}
			const payments = await ctx.db
				.query("payments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", wedding._id))
				.collect();
			const pendingPayments: ReminderPayment[] = [];
			for (const payment of payments) {
				if (payment.status !== "pendente") continue;
				const vendor = await ctx.db.get(payment.vendorId);
				pendingPayments.push({
					description: payment.description,
					vendorName: vendor?.name ?? "Fornecedor",
					amountCents: payment.amountCents,
					dueDate: payment.dueDate,
				});
			}
			result.push({
				coupleNames: wedding.coupleNames,
				subscriptionActiveUntil: wedding.subscriptionActiveUntil,
				recipients,
				pendingPayments,
			});
		}
		return result;
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
					await sendEmail({
						to: recipient.email,
						subject: "Vencimentos chegando — Nosso Casamento",
						html,
					});
					sentCount++;
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
					await sendEmail({
						to: recipient.email,
						subject: "Sua assinatura está chegando ao fim — Nosso Casamento",
						html,
					});
					sentCount++;
				}
			}
		}
		return { sentCount };
	},
});
