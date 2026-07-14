import { ConvexError, v } from "convex/values";
import { isValidISODate, todayInSaoPaulo } from "../lib/domain/dates";
import {
	subscriptionStatus as computeStatus,
	trialUntil,
} from "../lib/domain/subscription";
import { isWeddingTheme } from "../lib/domain/themes";
import { normalizeWeddingFields } from "../lib/domain/wedding";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { purgeAuthRows } from "./lib/accounts";
import {
	authedMutation,
	authedQuery,
	getViewer,
	isSuperadminEmail,
	requireWeddingAdmin,
	superadminMutation,
	superadminQuery,
	weddingAdminMutation,
	weddingQuery,
} from "./lib/auth";
import { weddingFieldValidators } from "./lib/validators";

/**
 * Inserts a wedding for `adminUserId`, starting a fresh trial, and links them
 * as its admin. Shared by the existing-user path (`create`) and the
 * new-account provisioning flow. Enforces the one-wedding-per-user invariant.
 */
export async function createWeddingWithAdmin(
	ctx: MutationCtx,
	adminUserId: Id<"users">,
	fields: Parameters<typeof normalizeWeddingFields>[0],
	opts?: { termsAcceptedAt?: number },
): Promise<Id<"weddings">> {
	const doc = normalizeWeddingFields(fields);
	const [adminUser, linked] = await Promise.all([
		ctx.db.get(adminUserId),
		ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", adminUserId))
			.first(),
	]);
	if (adminUser === null) {
		throw new ConvexError("Usuário não encontrado");
	}
	if (linked !== null) {
		throw new ConvexError("Este usuário já está vinculado a um casamento");
	}
	const weddingId = await ctx.db.insert("weddings", {
		...doc,
		subscriptionActiveUntil: trialUntil(todayInSaoPaulo()),
		termsAcceptedAt: opts?.termsAcceptedAt,
	});
	await ctx.db.insert("memberships", {
		weddingId,
		userId: adminUserId,
		role: "admin",
	});
	return weddingId;
}

// Tenant tables holding stored blobs (delete storage before the row) and the
// plain tenant tables. Kept in sync with the by_wedding index on each table.
const STORAGE_TABLES = ["attachments", "inspirationImages"] as const;
const PLAIN_TENANT_TABLES = [
	"vendors",
	"payments",
	"tasks",
	"invites",
	"guests",
	"galleries",
] as const;

/**
 * Permanently deletes a wedding and everything under it: stored files, all
 * tenant rows, memberships, and the member accounts (never a superadmin's).
 */
export async function deleteWeddingCascade(
	ctx: MutationCtx,
	weddingId: Id<"weddings">,
) {
	for (const table of STORAGE_TABLES) {
		const rows = await ctx.db
			.query(table)
			.withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
			.collect();
		for (const row of rows) {
			await ctx.storage.delete(row.storageId);
			await ctx.db.delete(row._id);
		}
	}
	for (const table of PLAIN_TENANT_TABLES) {
		const rows = await ctx.db
			.query(table)
			.withIndex("by_wedding", (q) => q.eq("weddingId", weddingId))
			.collect();
		for (const row of rows) {
			await ctx.db.delete(row._id);
		}
	}
	const memberships = await ctx.db
		.query("memberships")
		.withIndex("by_wedding_user", (q) => q.eq("weddingId", weddingId))
		.collect();
	for (const membership of memberships) {
		await ctx.db.delete(membership._id);
		const user = await ctx.db.get(membership.userId);
		if (user !== null && !isSuperadminEmail(user.email)) {
			await purgeAuthRows(ctx, membership.userId);
			await ctx.db.delete(membership.userId);
		}
	}
	await ctx.db.delete(weddingId);
}

/**
 * Lightweight identity of the caller's wedding for the nav brand and accent
 * theme. Unlike getCurrent it never throws for an account without a wedding
 * (a wedding-less superadmin included) — it just returns null.
 */
export const currentIdentity = authedQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await getViewer(ctx);
		if (viewer === null) return null;
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", viewer._id))
			.first();
		if (membership === null) return null;
		const wedding = await ctx.db.get(membership.weddingId);
		if (wedding === null) return null;
		return {
			coupleNames: wedding.coupleNames,
			weddingDate: wedding.weddingDate,
			theme: wedding.theme ?? null,
		};
	},
});

/** The caller's wedding — the multi-tenant successor of `settings.get`. */
export const getCurrent = weddingQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.get(ctx.weddingId);
	},
});

/**
 * The caller's subscription state — drives the read-only banner. `canManage`
 * tells the UI whether this viewer (admin/superadmin) can act on it.
 */
export const subscriptionStatus = weddingQuery({
	args: {},
	handler: async (ctx) => {
		const wedding = await ctx.db.get(ctx.weddingId);
		return {
			...computeStatus(wedding?.subscriptionActiveUntil, todayInSaoPaulo()),
			isAdmin: ctx.role === "admin",
			isSuperadmin: ctx.isSuperadmin,
		};
	},
});

/** Superadmin-only: creates a wedding for an existing user and links them. */
export const create = superadminMutation({
	args: { ...weddingFieldValidators, adminUserId: v.id("users") },
	handler: async (ctx, { adminUserId, ...fields }) => {
		return await createWeddingWithAdmin(ctx, adminUserId, fields);
	},
});

/**
 * Public self-signup's second step: the freshly-registered user creates their
 * own wedding (as its admin) with a trial, recording their terms acceptance.
 * The account itself is created by the Convex Auth signUp flow beforehand.
 */
export const createForSelf = authedMutation({
	args: { ...weddingFieldValidators, acceptedTerms: v.boolean() },
	handler: async (ctx, { acceptedTerms, ...fields }) => {
		if (!acceptedTerms) {
			throw new ConvexError("É preciso aceitar os termos para continuar");
		}
		const viewer = await getViewer(ctx);
		if (viewer === null) {
			throw new ConvexError("Não autenticado");
		}
		return await createWeddingWithAdmin(ctx, viewer._id, fields, {
			termsAcceptedAt: Date.now(),
		});
	},
});

/** Updates the caller's wedding — the multi-tenant successor of `settings.save`. */
export const save = weddingAdminMutation({
	args: weddingFieldValidators,
	handler: async (ctx, args) => {
		// Replace preserving the fields this form doesn't own (subscription,
		// theme, terms), and so that cleared optionals are removed, not stale.
		const current = await ctx.db.get(ctx.weddingId);
		await ctx.db.replace(ctx.weddingId, {
			...normalizeWeddingFields(args),
			subscriptionActiveUntil: current?.subscriptionActiveUntil,
			theme: current?.theme,
			termsAcceptedAt: current?.termsAcceptedAt,
		});
		return ctx.weddingId;
	},
});

/** Sets the couple's accent theme (see lib/domain/themes). */
export const setTheme = weddingAdminMutation({
	args: { theme: v.string() },
	handler: async (ctx, { theme }) => {
		if (!isWeddingTheme(theme)) {
			throw new ConvexError("Tema inválido");
		}
		await ctx.db.patch(ctx.weddingId, { theme });
		return null;
	},
});

/** Superadmin-only: every wedding with its subscription state and admin. */
export const listAll = superadminQuery({
	args: {},
	handler: async (ctx) => {
		const today = todayInSaoPaulo();
		const weddings = await ctx.db.query("weddings").collect();
		return await Promise.all(
			weddings.map(async (wedding) => {
				const memberships = await ctx.db
					.query("memberships")
					.withIndex("by_wedding_user", (q) => q.eq("weddingId", wedding._id))
					.collect();
				const admin = memberships.find((m) => m.role === "admin");
				const adminUser = admin ? await ctx.db.get(admin.userId) : null;
				return {
					_id: wedding._id,
					coupleNames: wedding.coupleNames,
					weddingDate: wedding.weddingDate,
					memberCount: memberships.length,
					adminUserId: admin?.userId ?? null,
					adminEmail: adminUser?.email ?? null,
					subscription: computeStatus(wedding.subscriptionActiveUntil, today),
				};
			}),
		);
	},
});

/**
 * Superadmin-only: sets (or clears, with null) a wedding's active-until date.
 * This is the manual billing lever — extended after a payment link is paid.
 */
export const setSubscription = superadminMutation({
	args: {
		weddingId: v.id("weddings"),
		activeUntil: v.union(v.string(), v.null()),
	},
	handler: async (ctx, { weddingId, activeUntil }) => {
		if (activeUntil !== null && !isValidISODate(activeUntil)) {
			throw new ConvexError("Data de validade inválida");
		}
		if ((await ctx.db.get(weddingId)) === null) {
			throw new ConvexError("Casamento não encontrado");
		}
		await ctx.db.patch(weddingId, {
			subscriptionActiveUntil: activeUntil ?? undefined,
		});
		return null;
	},
});

/**
 * LGPD: the wedding admin permanently deletes their own wedding and all of
 * its data. Allowed even on a lapsed subscription (it's not subscription
 * enforced), so it uses requireWeddingAdmin rather than the write builder.
 */
export const deleteOwn = authedMutation({
	args: {},
	handler: async (ctx) => {
		const { weddingId } = await requireWeddingAdmin(ctx);
		await deleteWeddingCascade(ctx, weddingId);
		return null;
	},
});

/** Superadmin-only: permanently deletes any wedding and all of its data. */
export const remove = superadminMutation({
	args: { weddingId: v.id("weddings") },
	handler: async (ctx, { weddingId }) => {
		if ((await ctx.db.get(weddingId)) === null) {
			throw new ConvexError("Casamento não encontrado");
		}
		await deleteWeddingCascade(ctx, weddingId);
		return null;
	},
});

// The account-creation side of provisioning lives in convex/access.ts (it
// needs an action to call Convex Auth) and reuses createWeddingWithAdmin.
