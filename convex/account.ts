import {
	invalidateSessions,
	modifyAccountCredentials,
	retrieveAccount,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
	type ActionCtx,
	action,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import {
	assertValidEmail,
	assertValidPassword,
	normalizeEmail,
	PASSWORD_PROVIDER,
	passwordAccountByEmail,
	renamePasswordAccount,
} from "./lib/accounts";
import { getViewer, isSuperadminEmail } from "./lib/auth";
import { sendEmail } from "./lib/email";
import { emailChangeEmail } from "./lib/emailTemplates";
import { generateNumericCode, sha256Hex } from "./lib/otp";

// "Minha conta": self-service credential management for the signed-in user.
// Every flow re-verifies the CURRENT password before touching anything, so a
// stolen open session cannot silently take the account over.

const EMAIL_CHANGE_MAX_AGE_MS = 15 * 60 * 1000;

/** The caller's user doc — throws for anonymous callers. */
export const me = internalQuery({
	args: {},
	handler: async (ctx) => {
		const viewer = await getViewer(ctx);
		if (viewer === null) {
			throw new ConvexError("Faça login para continuar");
		}
		return { userId: viewer._id, email: viewer.email ?? "" };
	},
});

/** Proves the caller knows their current password (or throws). */
async function verifyCurrentPassword(
	ctx: ActionCtx,
	email: string,
	password: string,
) {
	try {
		await retrieveAccount(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: password },
		});
	} catch {
		throw new ConvexError("Senha atual incorreta");
	}
}

export const changePassword = action({
	args: { currentPassword: v.string(), newPassword: v.string() },
	handler: async (ctx, { currentPassword, newPassword }): Promise<null> => {
		const { userId, email } = await ctx.runQuery(internal.account.me, {});
		assertValidPassword(newPassword);
		await verifyCurrentPassword(ctx, email, currentPassword);
		await modifyAccountCredentials(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: newPassword },
		});
		// Every session (including this one) stops working — the client signs
		// back in with the new password right away.
		await invalidateSessions(ctx, { userId });
		return null;
	},
});

export const requestEmailChange = action({
	args: { newEmail: v.string(), password: v.string() },
	handler: async (ctx, { newEmail: rawEmail, password }): Promise<null> => {
		const { userId, email } = await ctx.runQuery(internal.account.me, {});
		if (isSuperadminEmail(email)) {
			// Superadmin privileges derive from AUTH_ADMIN_EMAIL; changing the
			// account's e-mail here would silently drop them.
			throw new ConvexError(
				"O e-mail do administrador é definido na configuração do sistema",
			);
		}
		const newEmail = normalizeEmail(rawEmail);
		assertValidEmail(newEmail);
		if (newEmail === email) {
			throw new ConvexError("Este já é o seu e-mail atual");
		}
		if (await ctx.runQuery(internal.access.emailTaken, { email: newEmail })) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		await verifyCurrentPassword(ctx, email, password);

		const code = generateNumericCode(8);
		await ctx.runMutation(internal.account.storeEmailChange, {
			userId,
			newEmail,
			codeHash: await sha256Hex(code),
			expiresAt: Date.now() + EMAIL_CHANGE_MAX_AGE_MS,
		});
		await sendEmail({ to: newEmail, ...emailChangeEmail(newEmail, code) });
		return null;
	},
});

export const confirmEmailChange = action({
	args: { code: v.string() },
	handler: async (ctx, { code }): Promise<null> => {
		const { userId } = await ctx.runQuery(internal.account.me, {});
		await ctx.runMutation(internal.account.applyEmailChange, {
			userId,
			codeHash: await sha256Hex(code.trim()),
		});
		return null;
	},
});

export const storeEmailChange = internalMutation({
	args: {
		userId: v.id("users"),
		newEmail: v.string(),
		codeHash: v.string(),
		expiresAt: v.number(),
	},
	handler: async (ctx, args) => {
		// One pending change per user: a new request replaces the previous one.
		const existing = await ctx.db
			.query("emailChangeRequests")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();
		for (const row of existing) {
			await ctx.db.delete(row._id);
		}
		await ctx.db.insert("emailChangeRequests", args);
	},
});

export const applyEmailChange = internalMutation({
	args: { userId: v.id("users"), codeHash: v.string() },
	handler: async (ctx, { userId, codeHash }) => {
		const request = await ctx.db
			.query("emailChangeRequests")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.unique();
		if (
			request === null ||
			request.codeHash !== codeHash ||
			request.expiresAt < Date.now()
		) {
			throw new ConvexError("Código inválido ou expirado");
		}
		// Re-check the address is still free — someone may have claimed it
		// between the request and the confirmation. The credential row is the
		// constraint that matters: a duplicate there breaks sign-in for the
		// address entirely (Convex Auth resolves it with .unique()).
		const existing = await passwordAccountByEmail(ctx, request.newEmail);
		if (existing !== null && existing.userId !== userId) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		await renamePasswordAccount(ctx, userId, request.newEmail);
		await ctx.db.delete(request._id);
	},
});
