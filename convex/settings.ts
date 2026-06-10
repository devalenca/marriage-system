import { v } from "convex/values";
import { isValidISODate } from "../lib/domain/dates";
import { mutation, query } from "./_generated/server";

// Single-user local app: no auth layer by design (see AGENTS.md).
// Clerk + requireAccess must be added before any deployment.

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

		const existing = await ctx.db.query("settings").first();
		if (existing) {
			await ctx.db.patch(existing._id, args);
			return existing._id;
		}
		return await ctx.db.insert("settings", args);
	},
});
