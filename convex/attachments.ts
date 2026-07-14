import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { weddingMutation as mutation, weddingQuery as query } from "./lib/auth";
import { getOwned } from "./lib/db";
import { attachmentKindValidator } from "./lib/validators";

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

export const create = mutation({
	args: {
		storageId: v.id("_storage"),
		name: v.string(),
		kind: attachmentKindValidator,
		vendorId: v.optional(v.id("vendors")),
		paymentId: v.optional(v.id("payments")),
		mimeType: v.optional(v.string()),
		sizeBytes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { vendorId, paymentId } = args;
		if ((vendorId === undefined) === (paymentId === undefined)) {
			throw new Error("Anexe a um fornecedor OU a um pagamento");
		}
		if (vendorId && !(await getOwned(ctx, "vendors", vendorId))) {
			throw new Error("Fornecedor não encontrado");
		}
		if (paymentId && !(await getOwned(ctx, "payments", paymentId))) {
			throw new Error("Pagamento não encontrado");
		}
		if (args.name.trim().length === 0) {
			throw new Error("Informe o nome do arquivo");
		}
		return await ctx.db.insert("attachments", {
			...args,
			weddingId: ctx.weddingId,
			name: args.name.trim(),
			uploadedAt: Date.now(),
		});
	},
});

async function withUrl(ctx: QueryCtx, attachment: Doc<"attachments">) {
	return { ...attachment, url: await ctx.storage.getUrl(attachment.storageId) };
}

export const listByVendor = query({
	args: { vendorId: v.id("vendors") },
	handler: async (ctx, { vendorId }) => {
		// A vendor of another wedding behaves exactly like a missing one.
		if (!(await getOwned(ctx, "vendors", vendorId))) return [];
		const rows = await ctx.db
			.query("attachments")
			.withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
			.collect();
		return Promise.all(rows.map((row) => withUrl(ctx, row)));
	},
});

export const listByPayment = query({
	args: { paymentId: v.id("payments") },
	handler: async (ctx, { paymentId }) => {
		// A payment of another wedding behaves exactly like a missing one.
		if (!(await getOwned(ctx, "payments", paymentId))) return [];
		const rows = await ctx.db
			.query("attachments")
			.withIndex("by_payment", (q) => q.eq("paymentId", paymentId))
			.collect();
		return Promise.all(rows.map((row) => withUrl(ctx, row)));
	},
});

export const listAll = query({
	args: {},
	handler: async (ctx) => {
		const [attachments, vendors, payments] = await Promise.all([
			ctx.db
				.query("attachments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("vendors")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("payments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);
		const vendorById = new Map(vendors.map((v) => [v._id, v]));
		const paymentById = new Map(payments.map((p) => [p._id, p]));

		const rows = await Promise.all(
			attachments.map(async (a) => {
				const base = await withUrl(ctx, a);
				let source: {
					type: "vendor" | "payment";
					vendorId: Id<"vendors"> | null;
					vendorName: string | null;
					paymentDescription?: string;
				};
				if (a.vendorId) {
					const vendor = vendorById.get(a.vendorId);
					source = {
						type: "vendor",
						vendorId: a.vendorId,
						vendorName: vendor?.name ?? null,
					};
				} else if (a.paymentId) {
					const payment = paymentById.get(a.paymentId);
					const vendor = payment ? vendorById.get(payment.vendorId) : undefined;
					source = {
						type: "payment",
						vendorId: payment?.vendorId ?? null,
						vendorName: vendor?.name ?? null,
						paymentDescription: payment?.description,
					};
				} else {
					// Unreachable (create enforces exactly one source); keep for exhaustiveness.
					source = { type: "vendor", vendorId: null, vendorName: null };
				}
				return { ...base, source };
			}),
		);

		// Newest first.
		return rows.sort((a, b) => b.uploadedAt - a.uploadedAt);
	},
});

export const remove = mutation({
	args: { id: v.id("attachments") },
	handler: async (ctx, { id }) => {
		// Missing and foreign rows are indistinguishable: both are a no-op.
		const attachment = await getOwned(ctx, "attachments", id);
		if (!attachment) return;
		await ctx.storage.delete(attachment.storageId);
		await ctx.db.delete(attachment._id);
	},
});

/** Deletes every attachment (and its stored blob) for a vendor or payment. */
export async function deleteAttachmentsFor(
	ctx: MutationCtx,
	target: { vendorId: Id<"vendors"> } | { paymentId: Id<"payments"> },
) {
	const rows =
		"vendorId" in target
			? await ctx.db
					.query("attachments")
					.withIndex("by_vendor", (q) => q.eq("vendorId", target.vendorId))
					.collect()
			: await ctx.db
					.query("attachments")
					.withIndex("by_payment", (q) => q.eq("paymentId", target.paymentId))
					.collect();
	for (const row of rows) {
		await ctx.storage.delete(row.storageId);
		await ctx.db.delete(row._id);
	}
}
