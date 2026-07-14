import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
	customCtx,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";
import { todayInSaoPaulo } from "../../lib/domain/dates";
import { isSubscriptionActive } from "../../lib/domain/subscription";
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
 * The platform superadmins, configured via AUTH_ADMIN_EMAIL as one e-mail or
 * a comma/semicolon-separated list (e.g. two operators). These are the
 * product owners who manage weddings and accounts across all tenants — not to
 * be confused with a wedding's admin (the "admin" membership role).
 */
export function superadminEmails(): string[] {
	return (process.env.AUTH_ADMIN_EMAIL ?? "")
		.split(/[,;]/)
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.length > 0);
}

/** True when the e-mail belongs to one of the configured superadmins. */
export function isSuperadminEmail(email: string | undefined): boolean {
	const target = (email ?? "").trim().toLowerCase();
	return target.length > 0 && superadminEmails().includes(target);
}

/**
 * Public self-signup is on by default (the product's front door) and can be
 * shut with AUTH_SIGNUP_DISABLED=true — e.g. to pause new couples without a
 * deploy. Drives both the account-creation policy and the signup UI.
 */
export function isSelfSignupEnabled(): boolean {
	return (
		(process.env.AUTH_SIGNUP_DISABLED ?? "").trim().toLowerCase() !== "true"
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

/** True when the caller is the admin of some wedding (via their membership). */
export async function viewerIsWeddingAdmin(ctx: QueryCtx | MutationCtx) {
	const userId = await getAuthUserId(ctx);
	if (userId === null) return false;
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first();
	return membership?.role === "admin";
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

/**
 * Resolves the caller as the admin of their own wedding — for actions (which
 * can't use the wedding builders). Throws when the caller isn't a wedding
 * admin. Returns the trusted weddingId so callers never take it as an arg.
 */
export async function requireWeddingAdmin(ctx: QueryCtx | MutationCtx) {
	const w = await resolveWeddingCtx(ctx, undefined);
	if (w.role !== "admin") {
		throw new Error("Acesso restrito ao administrador do casamento");
	}
	return { weddingId: w.weddingId, viewerId: w.viewer._id };
}

// Every wedding-scoped function accepts an optional explicit target; the
// builder consumes it, so handlers only ever see ctx.weddingId. This makes
// `weddingId` a RESERVED argument name — feature functions built on these
// builders must not declare their own.
const weddingScopedArgs = { weddingId: v.optional(v.id("weddings")) };

/**
 * Message thrown by wedding writes when the subscription has lapsed. Carried
 * as a ConvexError so it survives to the client (plain Errors are redacted in
 * production) and the UI can recognize the read-only state.
 */
export const SUBSCRIPTION_EXPIRED =
	"Assinatura expirada. O acesso está em modo somente leitura até a renovação.";

/**
 * A wedding whose subscription lapsed is read-only: queries keep working so
 * the couple can still see their data, but writes are blocked. The superadmin
 * is never blocked (they extend the subscription and provide support).
 */
async function assertWritable(ctx: QueryCtx | MutationCtx, w: WeddingCtx) {
	if (w.isSuperadmin) return;
	const wedding = await ctx.db.get(w.weddingId);
	const activeUntil = wedding?.subscriptionActiveUntil;
	if (!isSubscriptionActive(activeUntil, todayInSaoPaulo())) {
		throw new ConvexError(SUBSCRIPTION_EXPIRED);
	}
}

function weddingScoped(opts?: {
	requiredRole?: "admin";
	enforceSubscription?: boolean;
}) {
	return {
		args: weddingScopedArgs,
		input: async (
			ctx: QueryCtx | MutationCtx,
			{ weddingId }: { weddingId?: Id<"weddings"> },
		) => {
			const weddingCtx = await resolveWeddingCtx(ctx, weddingId);
			if (
				opts?.requiredRole !== undefined &&
				weddingCtx.role !== opts.requiredRole
			) {
				throw new Error("Acesso restrito ao administrador do casamento");
			}
			if (opts?.enforceSubscription) {
				await assertWritable(ctx, weddingCtx);
			}
			return { ctx: weddingCtx, args: {} };
		},
	};
}

/** Query builder scoped to the caller's wedding (allowed when read-only). */
export const weddingQuery = customQuery(query, weddingScoped());

/** Mutation builder scoped to the caller's wedding; blocked when read-only. */
export const weddingMutation = customMutation(
	mutation,
	weddingScoped({ enforceSubscription: true }),
);

/** Mutation builder for the wedding's admin; blocked when read-only. */
export const weddingAdminMutation = customMutation(
	mutation,
	weddingScoped({ requiredRole: "admin", enforceSubscription: true }),
);
