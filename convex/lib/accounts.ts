// Shared account helpers for the password provider, used by users.ts
// (superadmin account management) and access.ts (per-wedding members).

import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

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

/**
 * The password credential registered for `email`, if any. This is the row
 * sign-in resolves through, so it — not `users.email` — is the uniqueness
 * constraint that actually matters when an address moves.
 */
export async function passwordAccountByEmail(ctx: QueryCtx, email: string) {
	return await ctx.db
		.query("authAccounts")
		.withIndex("providerAndAccountId", (q) =>
			q.eq("provider", PASSWORD_PROVIDER).eq("providerAccountId", email),
		)
		.unique();
}

/**
 * Points a user's password credential at a new address, keeping the two
 * places the e-mail lives in sync (the user doc and the credential id).
 *
 * Convex Auth exposes no supported rename — `modifyAccountCredentials` only
 * rotates the secret — so this reaches into `authAccounts` directly. Keeping
 * that reach in ONE named function bounds the blast radius if the library
 * changes shape (pinned at @convex-dev/auth 0.0.x).
 */
export async function renamePasswordAccount(
	ctx: MutationCtx,
	userId: Id<"users">,
	newEmail: string,
) {
	await ctx.db.patch(userId, { email: newEmail });
	const account = await ctx.db
		.query("authAccounts")
		.withIndex("userIdAndProvider", (q) =>
			q.eq("userId", userId).eq("provider", PASSWORD_PROVIDER),
		)
		.unique();
	if (account !== null) {
		await ctx.db.patch(account._id, { providerAccountId: newEmail });
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
