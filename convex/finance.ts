import { v } from "convex/values";
import { daysBetween, isValidISODate } from "../lib/domain/dates";
import {
	categoryBreakdown,
	financialSummary,
	paymentMethodBreakdown,
	type VendorWithPayments,
	vendorFinancials,
} from "../lib/domain/finance";
import type { Doc, Id } from "./_generated/dataModel";
import { weddingQuery as query } from "./lib/auth";
import { groupPaymentsByVendor } from "./lib/db";

function isActive(vendor: Doc<"vendors">) {
	return vendor.status !== "cancelado";
}

/**
 * Everything the Financeiro screen needs in one read: totals, category and
 * payment-method breakdowns, the paid-history ledger (with a receipt flag),
 * pending installments and a per-vendor installment summary.
 */
export const overview = query({
	args: { today: v.string() },
	handler: async (ctx, { today }) => {
		if (!isValidISODate(today)) throw new Error("Invalid reference date");

		const [settings, vendors, payments, attachments] = await Promise.all([
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
				.query("attachments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);

		const byVendor = groupPaymentsByVendor(payments);
		const vendorById = new Map(vendors.map((vendor) => [vendor._id, vendor]));
		const items: VendorWithPayments[] = vendors.map((vendor) => ({
			vendor,
			payments: byVendor.get(vendor._id) ?? [],
		}));

		const receiptPaymentIds = new Set(
			attachments
				.map((a) => a.paymentId)
				.filter((id): id is Id<"payments"> => id !== undefined),
		);

		const decorate = (payment: Doc<"payments">) => {
			const vendor = vendorById.get(payment.vendorId);
			return {
				...payment,
				vendorName: vendor?.name ?? "—",
				hasReceipt: receiptPaymentIds.has(payment._id),
			};
		};

		const paid = payments
			.filter((p) => p.status === "pago")
			.map(decorate)
			.sort((a, b) => (b.paidDate ?? "").localeCompare(a.paidDate ?? ""));

		const pending = payments
			.filter((p) => {
				const vendor = vendorById.get(p.vendorId);
				return p.status === "pendente" && vendor && isActive(vendor);
			})
			.map(decorate)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

		const installments = vendors
			.filter((vendor) => isActive(vendor) && vendor.contractedCents)
			.map((vendor) => {
				const vendorPayments = byVendor.get(vendor._id) ?? [];
				const fin = vendorFinancials(vendor, vendorPayments);
				const nextDue = vendorPayments
					.filter((p) => p.status === "pendente")
					.map((p) => p.dueDate)
					.sort()[0];
				return {
					vendorId: vendor._id,
					vendorName: vendor.name,
					category: vendor.category,
					paymentMethod: vendor.paymentMethod,
					contractedCents: vendor.contractedCents ?? 0,
					paidCents: fin.paidCents,
					pendingCents: fin.pendingCents,
					totalInstallments: vendorPayments.length,
					remainingInstallments: fin.remainingInstallments,
					progress: fin.progress,
					nextDueDate: nextDue,
				};
			})
			.sort((a, b) => b.pendingCents - a.pendingCents);

		return {
			settings,
			countdownDays: settings ? daysBetween(today, settings.weddingDate) : null,
			finance: financialSummary(settings?.budgetGoalCents ?? 0, items, today),
			categories: categoryBreakdown(items),
			byMethod: paymentMethodBreakdown(items),
			paid,
			pending,
			installments,
		};
	},
});

/** Flat rows for CSV export — one per payment, with vendor + category. */
export const exportRows = query({
	args: {},
	handler: async (ctx) => {
		const [vendors, payments] = await Promise.all([
			ctx.db
				.query("vendors")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("payments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);
		const vendorById = new Map(vendors.map((vendor) => [vendor._id, vendor]));

		return payments
			.map((payment) => {
				const vendor = vendorById.get(payment.vendorId);
				return {
					vendorName: vendor?.name ?? "—",
					category: vendor?.category ?? ("outros" as const),
					description: payment.description,
					method: payment.paymentMethod,
					status: payment.status,
					dueDate: payment.dueDate,
					paidDate: payment.paidDate,
					amountCents: payment.amountCents,
				};
			})
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
	},
});
