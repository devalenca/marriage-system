// Shared read helpers used by vendors, payments and dashboard.

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// Tables whose rows belong to a wedding (carry weddingId).
export type TenantTable =
	| "vendors"
	| "payments"
	| "attachments"
	| "galleries"
	| "inspirationImages"
	| "invites"
	| "guests"
	| "tasks";

/**
 * Reads a caller-supplied id with tenancy enforced: a row of another wedding
 * behaves exactly like a missing row, so ids can't be probed across tenants.
 * Every wedding-scoped function that receives an id MUST read it through
 * this helper (or re-check weddingId itself).
 */
export async function getOwned<T extends TenantTable>(
	ctx: Pick<QueryCtx, "db"> & { weddingId: Id<"weddings"> },
	_table: T,
	id: Id<T>,
): Promise<Doc<T> | null> {
	const doc = await ctx.db.get(id);
	if (doc === null || doc.weddingId !== ctx.weddingId) return null;
	return doc;
}

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
