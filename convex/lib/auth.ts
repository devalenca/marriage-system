import { getAuthUserId } from "@convex-dev/auth/server";
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

/** True when the e-mail belongs to the configured admin (AUTH_ADMIN_EMAIL). */
export function isAdminEmail(email: string | undefined): boolean {
	const adminEmail = (process.env.AUTH_ADMIN_EMAIL ?? "").trim().toLowerCase();
	return (
		adminEmail.length > 0 && (email ?? "").trim().toLowerCase() === adminEmail
	);
}

/** The signed-in user's document, or null when there is none. */
export async function getViewer(ctx: QueryCtx | MutationCtx) {
	const userId = await getAuthUserId(ctx);
	return userId === null ? null : await ctx.db.get(userId);
}

export async function viewerIsAdmin(ctx: QueryCtx | MutationCtx) {
	const viewer = await getViewer(ctx);
	return isAdminEmail(viewer?.email);
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
	await requireUser(ctx);
	if (!(await viewerIsAdmin(ctx))) {
		throw new Error("Acesso restrito ao administrador");
	}
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

/** Query builder restricted to the admin (access management). */
export const adminQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		await requireAdmin(ctx);
		return {};
	}),
);

/** Mutation builder restricted to the admin (access management). */
export const adminMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		await requireAdmin(ctx);
		return {};
	}),
);
