import { v } from "convex/values";
import { isValidISODate, todayInSaoPaulo } from "../lib/domain/dates";
import {
	generateInstallments,
	suggestVendorStatus,
	sumPaidCents,
} from "../lib/domain/finance";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { deleteAttachmentsFor } from "./attachments";
import { paymentsOf } from "./lib/db";

function validatePayment(args: { amountCents?: number; dueDate?: string }) {
	if (args.amountCents !== undefined && args.amountCents <= 0) {
		throw new Error("O valor do pagamento deve ser positivo");
	}
	if (args.dueDate !== undefined && !isValidISODate(args.dueDate)) {
		throw new Error("Data de vencimento inválida");
	}
}

/** Re-derives the vendor status (fechado ⇄ parcialmente_pago ⇄ pago) from payments. */
async function recomputeVendorStatus(
	ctx: MutationCtx,
	vendorId: Id<"vendors">,
) {
	const vendor = await ctx.db.get(vendorId);
	if (!vendor) return;
	const payments = await paymentsOf(ctx, vendorId);
	const suggested = suggestVendorStatus(
		vendor.status,
		sumPaidCents(payments),
		vendor.contractedCents ?? 0,
	);
	if (suggested !== vendor.status) {
		await ctx.db.patch(vendorId, { status: suggested });
	}
}

export const listByVendor = query({
	args: { vendorId: v.id("vendors") },
	handler: async (ctx, { vendorId }) => {
		const payments = await paymentsOf(ctx, vendorId);
		return payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
	},
});

/** All pending payments of active vendors, with vendor names, by due date. */
export const listPending = query({
	args: {},
	handler: async (ctx) => {
		const [pending, vendors] = await Promise.all([
			ctx.db
				.query("payments")
				.withIndex("by_status_dueDate", (q) => q.eq("status", "pendente"))
				.collect(),
			ctx.db.query("vendors").collect(),
		]);
		const vendorById = new Map(vendors.map((vendor) => [vendor._id, vendor]));

		const result = [];
		for (const payment of pending) {
			const vendor = vendorById.get(payment.vendorId);
			if (!vendor || vendor.status === "cancelado") continue;
			result.push({ ...payment, vendorName: vendor.name });
		}
		return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
	},
});

export const create = mutation({
	args: {
		vendorId: v.id("vendors"),
		description: v.string(),
		amountCents: v.number(),
		dueDate: v.string(),
		isDownPayment: v.optional(v.boolean()),
		paymentMethod: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const vendor = await ctx.db.get(args.vendorId);
		if (!vendor) throw new Error("Fornecedor não encontrado");
		validatePayment(args);
		if (args.description.trim().length === 0) {
			throw new Error("Informe a descrição do pagamento");
		}
		return await ctx.db.insert("payments", { ...args, status: "pendente" });
	},
});

/**
 * Generates the full payment schedule (entrada + parcelas) for a vendor.
 * Pending payments are replaced; paid ones are preserved.
 */
export const createSchedule = mutation({
	args: {
		vendorId: v.id("vendors"),
		totalCents: v.number(),
		downPaymentCents: v.number(),
		installmentsCount: v.number(),
		downPaymentDate: v.optional(v.string()),
		firstInstallmentDate: v.optional(v.string()),
		paymentMethod: v.optional(v.string()),
	},
	handler: async (ctx, { vendorId, paymentMethod, ...plan }) => {
		const vendor = await ctx.db.get(vendorId);
		if (!vendor) throw new Error("Fornecedor não encontrado");
		if (
			plan.downPaymentDate !== undefined &&
			!isValidISODate(plan.downPaymentDate)
		) {
			throw new Error("Data da entrada inválida");
		}
		if (
			plan.firstInstallmentDate !== undefined &&
			!isValidISODate(plan.firstInstallmentDate)
		) {
			throw new Error("Data da primeira parcela inválida");
		}

		const planned = generateInstallments(plan);

		const existing = await paymentsOf(ctx, vendorId);
		for (const payment of existing) {
			if (payment.status === "pendente") {
				await deleteAttachmentsFor(ctx, { paymentId: payment._id });
				await ctx.db.delete(payment._id);
			}
		}

		for (const payment of planned) {
			await ctx.db.insert("payments", {
				vendorId,
				description: payment.description,
				amountCents: payment.amountCents,
				dueDate: payment.dueDate,
				isDownPayment: payment.isDownPayment,
				status: "pendente",
				paymentMethod,
			});
		}

		await recomputeVendorStatus(ctx, vendorId);
	},
});

export const update = mutation({
	args: {
		id: v.id("payments"),
		description: v.optional(v.string()),
		amountCents: v.optional(v.number()),
		dueDate: v.optional(v.string()),
		paymentMethod: v.optional(v.string()),
	},
	handler: async (ctx, { id, ...patch }) => {
		const payment = await ctx.db.get(id);
		if (!payment) throw new Error("Pagamento não encontrado");
		validatePayment(patch);
		await ctx.db.patch(id, patch);
		await recomputeVendorStatus(ctx, payment.vendorId);
	},
});

export const markPaid = mutation({
	args: {
		id: v.id("payments"),
		paidDate: v.optional(v.string()),
		paymentMethod: v.optional(v.string()),
	},
	handler: async (ctx, { id, paidDate, paymentMethod }) => {
		const payment = await ctx.db.get(id);
		if (!payment) throw new Error("Pagamento não encontrado");
		const date = paidDate ?? todayInSaoPaulo();
		if (!isValidISODate(date)) throw new Error("Data de pagamento inválida");

		await ctx.db.patch(id, {
			status: "pago",
			paidDate: date,
			...(paymentMethod ? { paymentMethod } : {}),
		});
		await recomputeVendorStatus(ctx, payment.vendorId);
	},
});

export const markPending = mutation({
	args: { id: v.id("payments") },
	handler: async (ctx, { id }) => {
		const payment = await ctx.db.get(id);
		if (!payment) throw new Error("Pagamento não encontrado");

		await ctx.db.patch(id, { status: "pendente", paidDate: undefined });
		await recomputeVendorStatus(ctx, payment.vendorId);
	},
});

export const remove = mutation({
	args: { id: v.id("payments") },
	handler: async (ctx, { id }) => {
		const payment = await ctx.db.get(id);
		if (!payment) throw new Error("Pagamento não encontrado");
		await deleteAttachmentsFor(ctx, { paymentId: id });
		await ctx.db.delete(id);
		await recomputeVendorStatus(ctx, payment.vendorId);
	},
});
