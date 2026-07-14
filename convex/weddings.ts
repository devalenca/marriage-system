import { v } from "convex/values";
import { normalizeWeddingFields } from "../lib/domain/wedding";
import {
	superadminMutation,
	weddingAdminMutation,
	weddingQuery,
} from "./lib/auth";
import { weddingFieldValidators } from "./lib/validators";

/** The caller's wedding — the multi-tenant successor of `settings.get`. */
export const getCurrent = weddingQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.get(ctx.weddingId);
	},
});

/** Superadmin-only: creates a wedding and links its admin user to it. */
export const create = superadminMutation({
	args: { ...weddingFieldValidators, adminUserId: v.id("users") },
	handler: async (ctx, { adminUserId, ...fields }) => {
		const doc = normalizeWeddingFields(fields);
		const [adminUser, linked] = await Promise.all([
			ctx.db.get(adminUserId),
			ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", adminUserId))
				.first(),
		]);
		if (adminUser === null) {
			throw new Error("Usuário não encontrado");
		}
		if (linked !== null) {
			throw new Error("Este usuário já está vinculado a um casamento");
		}
		const weddingId = await ctx.db.insert("weddings", doc);
		await ctx.db.insert("memberships", {
			weddingId,
			userId: adminUserId,
			role: "admin",
		});
		return weddingId;
	},
});

/** Updates the caller's wedding — the multi-tenant successor of `settings.save`. */
export const save = weddingAdminMutation({
	args: weddingFieldValidators,
	handler: async (ctx, args) => {
		// Replace so cleared optionals are removed, not left stale.
		await ctx.db.replace(ctx.weddingId, normalizeWeddingFields(args));
		return ctx.weddingId;
	},
});
