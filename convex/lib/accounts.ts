// Shared account helpers for the password provider, used by users.ts
// (superadmin account management) and access.ts (per-wedding members).

import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const PASSWORD_PROVIDER = "password";

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** Throws unless `email` is a normalized, syntactically valid address. */
export function assertValidEmail(email: string): void {
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new ConvexError("E-mail inválido");
	}
}

export function assertValidPassword(password: string): void {
	if (password.length < 8) {
		throw new ConvexError("A senha deve ter pelo menos 8 caracteres");
	}
}

/** Deletes a user's auth rows (accounts, sessions, refresh tokens). */
export async function purgeAuthRows(ctx: MutationCtx, userId: Id<"users">) {
	const accounts = await ctx.db
		.query("authAccounts")
		.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
		.collect();
	for (const account of accounts) {
		await ctx.db.delete(account._id);
	}
	const sessions = await ctx.db
		.query("authSessions")
		.withIndex("userId", (q) => q.eq("userId", userId))
		.collect();
	for (const session of sessions) {
		const tokens = await ctx.db
			.query("authRefreshTokens")
			.withIndex("sessionId", (q) => q.eq("sessionId", session._id))
			.collect();
		for (const token of tokens) {
			await ctx.db.delete(token._id);
		}
		await ctx.db.delete(session._id);
	}
}
