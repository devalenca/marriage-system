import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { attachmentKindValidator } from "./lib/validators";

// Single-user local app: no auth layer by design (see AGENTS.md). Auth must be
// added (Clerk) before deploying to Vercel.

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
		if (vendorId && !(await ctx.db.get(vendorId))) {
			throw new Error("Fornecedor não encontrado");
		}
		if (paymentId && !(await ctx.db.get(paymentId))) {
			throw new Error("Pagamento não encontrado");
		}
		if (args.name.trim().length === 0) {
			throw new Error("Informe o nome do arquivo");
		}
		return await ctx.db.insert("attachments", {
			...args,
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
		const rows = await ctx.db
			.query("attachments")
			.withIndex("by_payment", (q) => q.eq("paymentId", paymentId))
			.collect();
		return Promise.all(rows.map((row) => withUrl(ctx, row)));
	},
});

export const remove = mutation({
	args: { id: v.id("attachments") },
	handler: async (ctx, { id }) => {
		const attachment = await ctx.db.get(id);
		if (!attachment) return;
		await ctx.storage.delete(attachment.storageId);
		await ctx.db.delete(id);
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
