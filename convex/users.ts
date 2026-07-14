import {
	createAccount,
	invalidateSessions,
	modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalQuery, query } from "./_generated/server";
import { assertValidPassword, PASSWORD_PROVIDER } from "./lib/accounts";
import {
	authedQuery,
	getViewer,
	isSuperadminEmail,
	requireSuperadmin,
	superadminEmails,
} from "./lib/auth";

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

/**
 * The second deliberately public function: creates the superadmin account
 * from the deployment env vars (AUTH_ADMIN_EMAIL + AUTH_ADMIN_PASSWORD) when
 * the users table is still empty. The login page calls it before the first
 * sign-in; it takes no caller input and is idempotent, so exposing it is
 * harmless — it can only ever materialize the env-configured superadmin.
 */
export const ensureAdminSeeded = action({
	args: {},
	handler: async (ctx) => {
		// With several superadmins configured, bootstrap seeds only the first
		// operator's account; the others are added as normal accounts later.
		const email = superadminEmails()[0] ?? "";
		const password = process.env.AUTH_ADMIN_PASSWORD ?? "";
		if (email.length === 0 || password.length < 8) return null;

		const { needsBootstrap } = await ctx.runQuery(
			api.users.bootstrapStatus,
			{},
		);
		if (!needsBootstrap) return null;

		try {
			await createAccount(ctx, {
				provider: PASSWORD_PROVIDER,
				account: { id: email, secret: password },
				profile: { email },
			});
		} catch {
			// A concurrent call seeded first — nothing left to do.
		}
		return null;
	},
});

/** Who am I — drives superadmin-only UI like the platform panel. */
export const viewer = authedQuery({
	args: {},
	handler: async (ctx) => {
		const user = await getViewer(ctx);
		return {
			email: user?.email ?? null,
			isSuperadmin: isSuperadminEmail(user?.email),
		};
	},
});

// Actions run without direct db access, so the superadmin gate and lookups go
// through internal queries; account writes go through Convex Auth helpers.

export const assertAdmin = internalQuery({
	args: {},
	handler: async (ctx) => {
		await requireSuperadmin(ctx);
	},
});

export const emailById = internalQuery({
	args: { id: v.id("users") },
	handler: async (ctx, { id }) => {
		return (await ctx.db.get(id))?.email ?? null;
	},
});

/**
 * Superadmin-only: resets any account's password (e.g. a wedding admin who
 * is locked out — there is no self-service e-mail reset yet).
 */
export const resetPassword = action({
	args: { id: v.id("users"), password: v.string() },
	handler: async (ctx, args) => {
		await ctx.runQuery(internal.users.assertAdmin, {});
		assertValidPassword(args.password);
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
