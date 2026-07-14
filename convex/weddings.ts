import { v } from "convex/values";
import { isValidISODate, isValidISOTime } from "../lib/domain/dates";
import { weddingAdminMutation, weddingQuery } from "./lib/auth";

export const weddingFields = {
	coupleNames: v.string(),
	weddingDate: v.string(),
	budgetGoalCents: v.number(),
	ceremonyVenue: v.optional(v.string()),
	receptionVenue: v.optional(v.string()),
	weddingTime: v.optional(v.string()),
};

/** Validates and normalizes wedding fields (same rules as legacy settings). */
export function normalizeWeddingFields(args: {
	coupleNames: string;
	weddingDate: string;
	budgetGoalCents: number;
	ceremonyVenue?: string;
	receptionVenue?: string;
	weddingTime?: string;
}) {
	if (!isValidISODate(args.weddingDate)) {
		throw new Error("Data do casamento inválida");
	}
	if (args.budgetGoalCents < 0) {
		throw new Error("A meta de orçamento não pode ser negativa");
	}
	if (args.coupleNames.trim().length === 0) {
		throw new Error("Informe os nomes do casal");
	}

	const ceremonyVenue = args.ceremonyVenue?.trim();
	const receptionVenue = args.receptionVenue?.trim();
	const weddingTime = args.weddingTime?.trim();
	if (weddingTime && !isValidISOTime(weddingTime)) {
		throw new Error("Horário inválido");
	}

	return {
		coupleNames: args.coupleNames.trim(),
		weddingDate: args.weddingDate,
		budgetGoalCents: args.budgetGoalCents,
		ceremonyVenue: ceremonyVenue || undefined,
		receptionVenue: receptionVenue || undefined,
		weddingTime: weddingTime || undefined,
	};
}

/** The caller's wedding — the multi-tenant successor of `settings.get`. */
export const getCurrent = weddingQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.get(ctx.weddingId);
	},
});

/** Updates the caller's wedding — the multi-tenant successor of `settings.save`. */
export const save = weddingAdminMutation({
	args: weddingFields,
	handler: async (ctx, args) => {
		// Replace so cleared optionals are removed, not left stale.
		await ctx.db.replace(ctx.weddingId, normalizeWeddingFields(args));
		return ctx.weddingId;
	},
});
