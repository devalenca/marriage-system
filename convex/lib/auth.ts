import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
	customCtx,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import type { Doc, Id } from "../_generated/dataModel";
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

// ---------------------------------------------------------------------------
// Wedding-scoped access (multi-tenant): a user reaches exactly one wedding
// through their membership. Feature code receives weddingId/role on ctx and
// must never query tenant data without filtering by that weddingId.

export type WeddingCtx = {
	viewer: Doc<"users">;
	weddingId: Id<"weddings">;
	/** Caller's power inside this wedding. Superadmin acts as "admin". */
	role: "admin" | "member";
};

async function resolveWeddingCtx(
	ctx: QueryCtx | MutationCtx,
	weddingIdArg: Id<"weddings"> | undefined,
): Promise<WeddingCtx> {
	const viewer = await getViewer(ctx);
	if (viewer === null) {
		throw new Error("Não autenticado");
	}

	// Explicit target: allowed for members of that wedding and the superadmin
	// (who acts as admin anywhere — the support/oversight path).
	if (weddingIdArg !== undefined) {
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_wedding_user", (q) =>
				q.eq("weddingId", weddingIdArg).eq("userId", viewer._id),
			)
			.unique();
		if (membership !== null) {
			return { viewer, weddingId: weddingIdArg, role: membership.role };
		}
		if (isAdminEmail(viewer.email)) {
			return { viewer, weddingId: weddingIdArg, role: "admin" };
		}
		throw new Error("Acesso negado a este casamento");
	}

	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", viewer._id))
		.first();
	if (membership === null) {
		throw new Error("Este acesso não está vinculado a nenhum casamento");
	}
	return { viewer, weddingId: membership.weddingId, role: membership.role };
}

// Every wedding-scoped function accepts an optional explicit target; the
// builder consumes it, so handlers only ever see ctx.weddingId.
const weddingScopedArgs = { weddingId: v.optional(v.id("weddings")) };

/** Query builder scoped to the caller's wedding. */
export const weddingQuery = customQuery(query, {
	args: weddingScopedArgs,
	input: async (ctx, { weddingId }) => ({
		ctx: await resolveWeddingCtx(ctx, weddingId),
		args: {},
	}),
});

/** Mutation builder scoped to the caller's wedding. */
export const weddingMutation = customMutation(mutation, {
	args: weddingScopedArgs,
	input: async (ctx, { weddingId }) => ({
		ctx: await resolveWeddingCtx(ctx, weddingId),
		args: {},
	}),
});

/** Mutation builder for the wedding's admin (settings, access management). */
export const weddingAdminMutation = customMutation(mutation, {
	args: weddingScopedArgs,
	input: async (ctx, { weddingId }) => {
		const weddingCtx = await resolveWeddingCtx(ctx, weddingId);
		if (weddingCtx.role !== "admin") {
			throw new Error("Acesso restrito ao administrador do casamento");
		}
		return { ctx: weddingCtx, args: {} };
	},
});
