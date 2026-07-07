import { v } from "convex/values";
import { isValidISODate, isValidISOTime } from "../lib/domain/dates";
import { authedMutation as mutation, authedQuery as query } from "./lib/auth";

export const get = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("settings").first();
	},
});

export const save = mutation({
	args: {
		coupleNames: v.string(),
		weddingDate: v.string(),
		budgetGoalCents: v.number(),
		ceremonyVenue: v.optional(v.string()),
		receptionVenue: v.optional(v.string()),
		weddingTime: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
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

		const doc = {
			coupleNames: args.coupleNames.trim(),
			weddingDate: args.weddingDate,
			budgetGoalCents: args.budgetGoalCents,
			ceremonyVenue: ceremonyVenue || undefined,
			receptionVenue: receptionVenue || undefined,
			weddingTime: weddingTime || undefined,
		};

		const existing = await ctx.db.query("settings").first();
		if (existing) {
			// Replace so cleared optionals are removed, not left stale.
			await ctx.db.replace(existing._id, doc);
			return existing._id;
		}
		return await ctx.db.insert("settings", doc);
	},
});
