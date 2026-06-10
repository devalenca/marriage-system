// Shared read helpers used by vendors, payments and dashboard.

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function paymentsOf(
	ctx: QueryCtx,
	vendorId: Id<"vendors">,
): Promise<Doc<"payments">[]> {
	return await ctx.db
		.query("payments")
		.withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
		.collect();
}

export function groupPaymentsByVendor(
	payments: Doc<"payments">[],
): Map<Id<"vendors">, Doc<"payments">[]> {
	const byVendor = new Map<Id<"vendors">, Doc<"payments">[]>();
	for (const payment of payments) {
		const group = byVendor.get(payment.vendorId) ?? [];
		group.push(payment);
		byVendor.set(payment.vendorId, group);
	}
	return byVendor;
}
