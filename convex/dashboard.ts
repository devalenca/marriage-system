import { v } from "convex/values";
import { daysBetween, isValidISODate } from "../lib/domain/dates";
import {
	categoryBreakdown,
	financialSummary,
	paymentIsDueSoon,
	paymentIsOverdue,
	type VendorWithPayments,
} from "../lib/domain/finance";
import type { Doc } from "./_generated/dataModel";
import { weddingQuery as query } from "./lib/auth";
import { groupPaymentsByVendor } from "./lib/db";

/** Same wire shape as payments.listPending rows. */
type PaymentWithVendor = Doc<"payments"> & { vendorName: string };

export const summary = query({
	args: { today: v.string() },
	handler: async (ctx, { today }) => {
		if (!isValidISODate(today)) throw new Error("Invalid reference date");

		const [settings, vendors, payments, tasks] = await Promise.all([
			ctx.db.get(ctx.weddingId),
			ctx.db
				.query("vendors")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("payments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("tasks")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);

		const paymentsByVendor = groupPaymentsByVendor(payments);
		const items: VendorWithPayments[] = vendors.map((vendor) => ({
			vendor,
			payments: paymentsByVendor.get(vendor._id) ?? [],
		}));

		const overdue: PaymentWithVendor[] = [];
		const dueSoon: PaymentWithVendor[] = [];
		for (const vendor of vendors) {
			if (vendor.status === "cancelado") continue;
			for (const payment of paymentsByVendor.get(vendor._id) ?? []) {
				if (paymentIsOverdue(payment, today)) {
					overdue.push({ ...payment, vendorName: vendor.name });
				} else if (paymentIsDueSoon(payment, today)) {
					dueSoon.push({ ...payment, vendorName: vendor.name });
				}
			}
		}
		overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
		dueSoon.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

		const currentMonth = today.slice(0, 7);
		const monthTasks = tasks
			.filter(
				(task) =>
					task.status !== "concluida" && task.dueDate?.startsWith(currentMonth),
			)
			.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

		return {
			settings,
			countdownDays: settings ? daysBetween(today, settings.weddingDate) : null,
			finance: financialSummary(settings?.budgetGoalCents ?? 0, items, today),
			categories: categoryBreakdown(items),
			overdue,
			dueSoon,
			monthTasks,
		};
	},
});
