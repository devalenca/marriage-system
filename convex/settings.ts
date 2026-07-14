import { normalizeWeddingFields } from "../lib/domain/wedding";
import { authedMutation as mutation, authedQuery as query } from "./lib/auth";
import { weddingFieldValidators } from "./lib/validators";

// Legacy singleton, superseded by the weddings module. Dies once the UI is
// rewired to weddings.getCurrent/save in the multi-tenant rollout.

export const get = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("settings").first();
	},
});

export const save = mutation({
	args: weddingFieldValidators,
	handler: async (ctx, args) => {
		const doc = normalizeWeddingFields(args);

		const existing = await ctx.db.query("settings").first();
		if (existing) {
			// Replace so cleared optionals are removed, not left stale.
			await ctx.db.replace(existing._id, doc);
			return existing._id;
		}
		return await ctx.db.insert("settings", doc);
	},
});
