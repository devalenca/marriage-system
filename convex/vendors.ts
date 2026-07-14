import { v } from "convex/values";
import {
	CONTRACTED_STATUSES,
	type VendorStatus,
} from "../lib/domain/categories";
import { isValidISODate } from "../lib/domain/dates";
import { vendorFinancials } from "../lib/domain/finance";
import type { Doc } from "./_generated/dataModel";
import { deleteAttachmentsFor } from "./attachments";
import { weddingMutation as mutation, weddingQuery as query } from "./lib/auth";
import { getOwned, groupPaymentsByVendor, paymentsOf } from "./lib/db";
import {
	vendorCategoryValidator,
	vendorStatusValidator,
} from "./lib/validators";

const optionalFields = {
	contactName: v.optional(v.string()),
	phone: v.optional(v.string()),
	instagram: v.optional(v.string()),
	website: v.optional(v.string()),
	notes: v.optional(v.string()),
	estimateCents: v.optional(v.number()),
	contractedCents: v.optional(v.number()),
	closedDate: v.optional(v.string()),
	paymentMethod: v.optional(v.string()),
	links: v.optional(v.array(v.object({ label: v.string(), url: v.string() }))),
};

function validateVendorFields(args: {
	name?: string;
	estimateCents?: number;
	contractedCents?: number;
	closedDate?: string;
}) {
	if (args.name !== undefined && args.name.trim().length === 0) {
		throw new Error("Informe o nome do fornecedor");
	}
	if (args.estimateCents !== undefined && args.estimateCents < 0) {
		throw new Error("O orçamento inicial não pode ser negativo");
	}
	if (args.contractedCents !== undefined && args.contractedCents < 0) {
		throw new Error("O valor fechado não pode ser negativo");
	}
	if (args.closedDate !== undefined && !isValidISODate(args.closedDate)) {
		throw new Error("Data de fechamento inválida");
	}
}

/** Contracted statuses require a positive contracted value — the budget math depends on it. */
function validateContractInvariant(vendor: {
	status: VendorStatus;
	contractedCents?: number;
}) {
	if (
		CONTRACTED_STATUSES.includes(vendor.status) &&
		!(vendor.contractedCents && vendor.contractedCents > 0)
	) {
		throw new Error("Informe o valor fechado do contrato");
	}
}

function withFinancials(vendor: Doc<"vendors">, payments: Doc<"payments">[]) {
	return {
		...vendor,
		financials: vendorFinancials(vendor, payments),
	};
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const [vendors, allPayments] = await Promise.all([
			ctx.db
				.query("vendors")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("payments")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);
		const byVendor = groupPaymentsByVendor(allPayments);
		return vendors.map((vendor) =>
			withFinancials(vendor, byVendor.get(vendor._id) ?? []),
		);
	},
});

export const get = query({
	args: { id: v.id("vendors") },
	handler: async (ctx, { id }) => {
		const vendor = await getOwned(ctx, "vendors", id);
		if (!vendor) return null;
		return withFinancials(vendor, await paymentsOf(ctx, id));
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		category: vendorCategoryValidator,
		status: vendorStatusValidator,
		...optionalFields,
	},
	handler: async (ctx, args) => {
		validateVendorFields(args);
		validateContractInvariant(args);
		return await ctx.db.insert("vendors", {
			...args,
			weddingId: ctx.weddingId,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("vendors"),
		name: v.optional(v.string()),
		category: v.optional(vendorCategoryValidator),
		status: v.optional(vendorStatusValidator),
		...optionalFields,
	},
	handler: async (ctx, { id, ...patch }) => {
		const vendor = await getOwned(ctx, "vendors", id);
		if (!vendor) throw new Error("Fornecedor não encontrado");
		validateVendorFields(patch);
		validateContractInvariant({
			status: patch.status ?? vendor.status,
			contractedCents: patch.contractedCents ?? vendor.contractedCents,
		});
		await ctx.db.patch(id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("vendors") },
	handler: async (ctx, { id }) => {
		const vendor = await getOwned(ctx, "vendors", id);
		if (!vendor) throw new Error("Fornecedor não encontrado");
		const payments = await paymentsOf(ctx, id);
		for (const payment of payments) {
			await deleteAttachmentsFor(ctx, { paymentId: payment._id });
			await ctx.db.delete(payment._id);
		}
		await deleteAttachmentsFor(ctx, { vendorId: id });
		await ctx.db.delete(id);
	},
});
