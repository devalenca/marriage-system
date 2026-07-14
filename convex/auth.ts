import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import {
	superadminEmails,
	viewerIsSuperadmin,
	viewerIsWeddingAdmin,
} from "./lib/auth";
import { canCreateUser } from "./lib/userCreation";

const DAY_MS = 24 * 60 * 60 * 1000;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Password({
			profile(params) {
				return {
					email: String(params.email ?? "")
						.trim()
						.toLowerCase(),
				};
			},
		}),
	],
	// Persistent login: the session survives up to a year, as long as the
	// app is used at least once every 90 days. Tokens refresh automatically.
	session: {
		totalDurationMs: 365 * DAY_MS,
		inactiveDurationMs: 90 * DAY_MS,
	},
	callbacks: {
		// Single gate for account creation: the admin creates accounts from
		// Ajustes; the only self-service path is the first-run bootstrap of
		// the admin account itself (empty users table + AUTH_ADMIN_EMAIL).
		async createOrUpdateUser(ctx, args) {
			if (args.existingUserId !== null) {
				return args.existingUserId;
			}
			const mutationCtx = ctx as unknown as MutationCtx;
			const email = String(args.profile.email ?? "")
				.trim()
				.toLowerCase();
			const allowed = canCreateUser({
				callerIsSuperadmin: await viewerIsSuperadmin(mutationCtx),
				callerIsWeddingAdmin: await viewerIsWeddingAdmin(mutationCtx),
				anyUserExists: (await mutationCtx.db.query("users").first()) !== null,
				email,
				superadminEmails: superadminEmails(),
			});
			if (!allowed) {
				throw new ConvexError(
					"Cadastro desabilitado. Peça acesso ao administrador.",
				);
			}
			return await mutationCtx.db.insert("users", { email });
		},
	},
});
