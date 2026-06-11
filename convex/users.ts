import {
	createAccount,
	invalidateSessions,
	modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	internalQuery,
	type MutationCtx,
	query,
} from "./_generated/server";
import {
	adminMutation,
	adminQuery,
	authedQuery,
	getViewer,
	isAdminEmail,
	requireAdmin,
} from "./lib/auth";

const PASSWORD_PROVIDER = "password";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function validatePassword(password: string) {
	if (password.length < 8) {
		throw new ConvexError("A senha deve ter pelo menos 8 caracteres");
	}
}

/**
 * The ONE intentionally public query: the login page needs to know, before
 * any session exists, whether the admin account still has to be created
 * (first run). Exposes a single boolean, nothing else.
 */
export const bootstrapStatus = query({
	args: {},
	handler: async (ctx) => ({
		needsBootstrap: (await ctx.db.query("users").first()) === null,
	}),
});

/** Who am I — drives admin-only UI like the Acessos card. */
export const viewer = authedQuery({
	args: {},
	handler: async (ctx) => {
		const user = await getViewer(ctx);
		return {
			email: user?.email ?? null,
			isAdmin: isAdminEmail(user?.email),
		};
	},
});

export const list = adminQuery({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query("users").collect();
		return users
			.map((user) => ({
				_id: user._id,
				email: user.email ?? "",
				isAdmin: isAdminEmail(user.email),
			}))
			.sort((a, b) => a.email.localeCompare(b.email));
	},
});

/** Deletes a user's auth rows (accounts, sessions, refresh tokens). */
async function purgeAuthRows(ctx: MutationCtx, userId: Id<"users">) {
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

export const remove = adminMutation({
	args: { id: v.id("users") },
	handler: async (ctx, { id }) => {
		const user = await ctx.db.get(id);
		if (!user) return;
		if (isAdminEmail(user.email)) {
			throw new ConvexError("A conta do administrador não pode ser removida");
		}
		await purgeAuthRows(ctx, id);
		await ctx.db.delete(id);
	},
});

// Actions run without direct db access, so the admin gate and lookups go
// through internal queries; account writes go through Convex Auth helpers.

export const assertAdmin = internalQuery({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
	},
});

export const emailTaken = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const users = await ctx.db.query("users").collect();
		return users.some((user) => user.email === email);
	},
});

export const emailById = internalQuery({
	args: { id: v.id("users") },
	handler: async (ctx, { id }) => {
		return (await ctx.db.get(id))?.email ?? null;
	},
});

export const create = action({
	args: { email: v.string(), password: v.string() },
	handler: async (ctx, args) => {
		await ctx.runQuery(internal.users.assertAdmin, {});
		const email = normalizeEmail(args.email);
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			throw new ConvexError("E-mail inválido");
		}
		validatePassword(args.password);
		if (await ctx.runQuery(internal.users.emailTaken, { email })) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		await createAccount(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: args.password },
			profile: { email },
		});
		return null;
	},
});

export const resetPassword = action({
	args: { id: v.id("users"), password: v.string() },
	handler: async (ctx, args) => {
		await ctx.runQuery(internal.users.assertAdmin, {});
		validatePassword(args.password);
		const email = await ctx.runQuery(internal.users.emailById, {
			id: args.id,
		});
		if (email === null) {
			throw new ConvexError("Usuário não encontrado");
		}
		await modifyAccountCredentials(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: args.password },
		});
		// Old sessions stop working immediately after a password reset.
		await invalidateSessions(ctx, { userId: args.id });
		return null;
	},
});
