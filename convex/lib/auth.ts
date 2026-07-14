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

/**
 * True when the e-mail belongs to the platform superadmin (AUTH_ADMIN_EMAIL)
 * — the product owner, who manages weddings and accounts across all tenants.
 * Not to be confused with a wedding's admin (the "admin" membership role).
 */
export function isSuperadminEmail(email: string | undefined): boolean {
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

export async function viewerIsSuperadmin(ctx: QueryCtx | MutationCtx) {
	const viewer = await getViewer(ctx);
	return isSuperadminEmail(viewer?.email);
}

export async function requireSuperadmin(ctx: QueryCtx | MutationCtx) {
	await requireUser(ctx);
	if (!(await viewerIsSuperadmin(ctx))) {
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

/** Query builder restricted to the platform superadmin. */
export const superadminQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		await requireSuperadmin(ctx);
		return {};
	}),
);

/** Mutation builder restricted to the platform superadmin. */
export const superadminMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		await requireSuperadmin(ctx);
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
	/** True when the caller is the platform superadmin (support/oversight). */
	isSuperadmin: boolean;
};

async function resolveWeddingCtx(
	ctx: QueryCtx | MutationCtx,
	weddingIdArg: Id<"weddings"> | undefined,
): Promise<WeddingCtx> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new Error("Não autenticado");
	}
	// Independent point reads — one round-trip of latency on the hot path.
	// A user holds at most one membership (weddings.create enforces it), so
	// .unique() makes any violation of that invariant fail loudly.
	const [viewer, membership] = await Promise.all([
		ctx.db.get(userId),
		weddingIdArg === undefined
			? ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", userId))
					.unique()
			: ctx.db
					.query("memberships")
					.withIndex("by_wedding_user", (q) =>
						q.eq("weddingId", weddingIdArg).eq("userId", userId),
					)
					.unique(),
	]);
	if (viewer === null) {
		throw new Error("Não autenticado");
	}
	const isSuperadmin = isSuperadminEmail(viewer.email);

	// Explicit target: allowed for members of that wedding and the superadmin
	// (who acts as admin anywhere — the support/oversight path).
	if (weddingIdArg !== undefined) {
		if (membership !== null) {
			return {
				viewer,
				weddingId: weddingIdArg,
				role: membership.role,
				isSuperadmin,
			};
		}
		if (isSuperadmin) {
			return { viewer, weddingId: weddingIdArg, role: "admin", isSuperadmin };
		}
		throw new Error("Acesso negado a este casamento");
	}

	if (membership === null) {
		throw new Error("Este acesso não está vinculado a nenhum casamento");
	}
	return {
		viewer,
		weddingId: membership.weddingId,
		role: membership.role,
		isSuperadmin,
	};
}

// Every wedding-scoped function accepts an optional explicit target; the
// builder consumes it, so handlers only ever see ctx.weddingId. This makes
// `weddingId` a RESERVED argument name — feature functions built on these
// builders must not declare their own.
const weddingScopedArgs = { weddingId: v.optional(v.id("weddings")) };

function weddingScoped(requiredRole?: "admin") {
	return {
		args: weddingScopedArgs,
		input: async (
			ctx: QueryCtx | MutationCtx,
			{ weddingId }: { weddingId?: Id<"weddings"> },
		) => {
			const weddingCtx = await resolveWeddingCtx(ctx, weddingId);
			if (requiredRole !== undefined && weddingCtx.role !== requiredRole) {
				throw new Error("Acesso restrito ao administrador do casamento");
			}
			return { ctx: weddingCtx, args: {} };
		},
	};
}

/** Query builder scoped to the caller's wedding. */
export const weddingQuery = customQuery(query, weddingScoped());

/** Mutation builder scoped to the caller's wedding. */
export const weddingMutation = customMutation(mutation, weddingScoped());

/** Mutation builder for the wedding's admin (settings, access management). */
export const weddingAdminMutation = customMutation(
	mutation,
	weddingScoped("admin"),
);
