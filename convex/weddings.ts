import { ConvexError, v } from "convex/values";
import { isValidISODate, todayInSaoPaulo } from "../lib/domain/dates";
import { normalizeWeddingFields } from "../lib/domain/wedding";
import {
	subscriptionStatus as computeStatus,
	trialUntil,
} from "../lib/domain/subscription";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
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
	});
	await ctx.db.insert("memberships", {
		weddingId,
		userId: adminUserId,
		role: "admin",
	});
	return weddingId;
}

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

/** Updates the caller's wedding — the multi-tenant successor of `settings.save`. */
export const save = weddingAdminMutation({
	args: weddingFieldValidators,
	handler: async (ctx, args) => {
		// Replace preserving the superadmin-owned subscription field, and so
		// that cleared optionals are removed rather than left stale.
		const current = await ctx.db.get(ctx.weddingId);
		await ctx.db.replace(ctx.weddingId, {
			...normalizeWeddingFields(args),
			subscriptionActiveUntil: current?.subscriptionActiveUntil,
		});
		return ctx.weddingId;
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
					subscription: computeStatus(
						wedding.subscriptionActiveUntil,
						today,
					),
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

// The account-creation side of provisioning lives in convex/access.ts (it
// needs an action to call Convex Auth) and reuses createWeddingWithAdmin.
