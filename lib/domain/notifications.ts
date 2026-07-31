// Daily e-mail reminder selection. Pure calendar logic — the Convex cron
// gathers the data and calls these to decide who hears about what today.

import { daysBetween } from "./dates";

/** Days-until-due values that trigger a payment digest (D+1 = newly overdue). */
const PAYMENT_TRIGGER_DAYS = new Set([7, 3, 1, 0, -1]);

/** Subscription expiry warnings go out with this many days left. */
const SUBSCRIPTION_TRIGGER_DAYS = new Set([7, 3, 1]);

/** Upcoming payments listed in the digest look this far ahead. */
export const DIGEST_WINDOW_DAYS = 14;

export type ReminderPayment = {
	description: string;
	vendorName: string;
	amountCents: number;
	dueDate: string; // ISO yyyy-MM-dd
};

/**
 * True when at least one pending payment hits a nudge day today. The digest
 * itself then shows the full picture (everything overdue + the next 14 days),
 * but only trigger days put it in the inbox — no daily spam.
 */
export function shouldSendPaymentDigest(
	payments: ReminderPayment[],
	today: string,
): boolean {
	return payments.some((payment) =>
		PAYMENT_TRIGGER_DAYS.has(daysBetween(today, payment.dueDate)),
	);
}

/** The digest body: overdue and due-in-14-days payments, sorted by due date. */
export function digestPayments(
	payments: ReminderPayment[],
	today: string,
): { overdue: ReminderPayment[]; upcoming: ReminderPayment[] } {
	const byDueDate = (a: ReminderPayment, b: ReminderPayment) =>
		a.dueDate.localeCompare(b.dueDate);
	const overdue = payments
		.filter((p) => daysBetween(today, p.dueDate) < 0)
		.sort(byDueDate);
	const upcoming = payments
		.filter((p) => {
			const days = daysBetween(today, p.dueDate);
			return days >= 0 && days <= DIGEST_WINDOW_DAYS;
		})
		.sort(byDueDate);
	return { overdue, upcoming };
}

/**
 * Days left when today is a subscription-expiry warning day, else null.
 * Missing `activeUntil` means unlimited — never warns.
 */
export function subscriptionReminderDaysLeft(
	activeUntil: string | undefined,
	today: string,
): number | null {
	if (!activeUntil) return null;
	const days = daysBetween(today, activeUntil);
	return SUBSCRIPTION_TRIGGER_DAYS.has(days) ? days : null;
}
