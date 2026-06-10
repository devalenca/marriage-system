import {
	customCtx,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "../_generated/server";

// The only module allowed to call ctx.auth.getUserIdentity(). Feature code
// must use the authed builders below instead of the raw query/mutation.
async function requireUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (identity === null) {
		throw new Error("Não autenticado");
	}
	return identity;
}

/** Drop-in replacement for `query` that rejects anonymous callers. */
export const authedQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		await requireUser(ctx);
		return {};
	}),
);

/** Drop-in replacement for `mutation` that rejects anonymous callers. */
export const authedMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		await requireUser(ctx);
		return {};
	}),
);
