import { weddingQuery } from "./lib/auth";

/** The caller's wedding — the multi-tenant successor of `settings.get`. */
export const getCurrent = weddingQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.get(ctx.weddingId);
	},
});
