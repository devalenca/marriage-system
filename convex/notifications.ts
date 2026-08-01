import { ConvexError, v } from "convex/values";
import { daysBetween, todayInSaoPaulo } from "../lib/domain/dates";
import {
	DIGEST_WINDOW_DAYS,
	digestPayments,
	type ReminderPayment,
	shouldSendPaymentDigest,
	subscriptionReminderDaysLeft,
} from "../lib/domain/notifications";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction, internalQuery } from "./_generated/server";
import {
	authedMutation,
	authedQuery,
	getViewer,
	superadminEmails,
} from "./lib/auth";
import { sendEmail } from "./lib/email";
import {
	type EmailContent,
	paymentDigestEmail,
	subscriptionEndingEmail,
	testEmail,
} from "./lib/emailTemplates";

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

/** The caller's own address — the only place a test message may go. */
export const myEmail = internalQuery({
	args: {},
	handler: async (ctx): Promise<string> => {
		const viewer = await getViewer(ctx);
		if (!viewer?.email) throw new ConvexError("Não autenticado");
		return viewer.email;
	},
});

/**
 * Sends a message to the caller so a deployment's email setup can be proven
 * end to end — in dev and, more importantly, in production, where a wrong
 * SMTP password otherwise only shows up when a reminder silently fails.
 */
export const sendTestEmail = action({
	args: {},
	handler: async (ctx): Promise<{ to: string; delivered: boolean }> => {
		const to: string = await ctx.runQuery(internal.notifications.myEmail, {});
		let outcome: "sent" | "skipped";
		try {
			outcome = await sendEmail({ to, ...testEmail() });
		} catch (error) {
			// The transport's own words are the whole point of a test send, and a
			// plain Error would be redacted before reaching the browser.
			throw new ConvexError(
				`Falha no envio: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		return { to, delivered: outcome === "sent" };
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
		async function deliver(to: string, content: EmailContent) {
			try {
				await sendEmail({ to, ...content });
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
				const digest = paymentDigestEmail(
					wedding.coupleNames,
					overdue,
					upcoming,
				);
				for (const recipient of wedding.recipients) {
					if (!recipient.paymentReminders) continue;
					await deliver(recipient.email, digest);
				}
			}

			const daysLeft = subscriptionReminderDaysLeft(
				wedding.subscriptionActiveUntil,
				today,
			);
			if (daysLeft !== null) {
				const warning = subscriptionEndingEmail(
					wedding.coupleNames,
					wedding.subscriptionActiveUntil ?? today,
					daysLeft,
					supportEmail,
				);
				for (const recipient of wedding.recipients) {
					// Renewal is the admin's call; members aren't nagged about it.
					if (recipient.role !== "admin" || !recipient.subscriptionReminders) {
						continue;
					}
					await deliver(recipient.email, warning);
				}
			}
		}
		// Surfaced in the Convex dashboard's cron history, so a silent day is
		// visible without digging through logs.
		return { sentCount, failed };
	},
});
