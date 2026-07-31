import {
	createAccount,
	invalidateSessions,
	modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { normalizeWeddingFields } from "../lib/domain/wedding";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
	query,
} from "./_generated/server";
import {
	assertValidEmail,
	assertValidPassword,
	normalizeEmail,
	PASSWORD_PROVIDER,
	purgeAuthRows,
} from "./lib/accounts";
import { appBaseUrl, escapeHtml, renderEmail, sendEmail } from "./lib/email";
import { generateUrlToken, sha256Hex } from "./lib/otp";
import {
	requireWeddingAdmin,
	weddingAdminMutation,
	weddingQuery,
} from "./lib/auth";
import { weddingFieldValidators } from "./lib/validators";
import { createWeddingWithAdmin } from "./weddings";

// Actions run without db access, so account writes go through Convex Auth
// helpers while ownership checks and inserts go through internal functions.

/** Caller's own wedding id, asserting they are its admin. */
export const callerWeddingId = internalQuery({
	args: {},
	handler: async (ctx) => (await requireWeddingAdmin(ctx)).weddingId,
});

export const emailTaken = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const users = await ctx.db.query("users").collect();
		return users.some((user) => user.email === email);
	},
});

export const userIdByEmail = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const user = (await ctx.db.query("users").collect()).find(
			(u) => u.email === email,
		);
		return user?._id ?? null;
	},
});

/** The email of `userId` iff they are a *member* of `weddingId`, else null. */
export const memberEmailInWedding = internalQuery({
	args: { weddingId: v.id("weddings"), userId: v.id("users") },
	handler: async (ctx, { weddingId, userId }) => {
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_wedding_user", (q) =>
				q.eq("weddingId", weddingId).eq("userId", userId),
			)
			.unique();
		if (membership === null || membership.role !== "member") return null;
		return (await ctx.db.get(userId))?.email ?? null;
	},
});

export const insertWeddingAdmin = internalMutation({
	args: {
		adminUserId: v.id("users"),
		fields: v.object(weddingFieldValidators),
	},
	handler: async (ctx, { adminUserId, fields }) => {
		return await createWeddingWithAdmin(ctx, adminUserId, fields);
	},
});

export const insertMember = internalMutation({
	args: { weddingId: v.id("weddings"), userId: v.id("users") },
	handler: async (ctx, { weddingId, userId }) => {
		const linked = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (linked !== null) {
			throw new ConvexError("Este usuário já está vinculado a um casamento");
		}
		await ctx.db.insert("memberships", { weddingId, userId, role: "member" });
	},
});

/**
 * Superadmin-only: provisions a whole tenant — creates the couple's account
 * and their wedding with a fresh trial, linking them as its admin. This is
 * the product's onboarding path (there is no public self-signup yet).
 */
export const provision = action({
	args: { ...weddingFieldValidators, email: v.string(), password: v.string() },
	handler: async (
		ctx,
		{ email: rawEmail, password, ...fields },
	): Promise<Id<"weddings">> => {
		await ctx.runQuery(internal.users.assertAdmin, {});
		const email = normalizeEmail(rawEmail);
		assertValidEmail(email);
		assertValidPassword(password);
		// Validate wedding fields *before* creating the account so a bad form
		// never leaves an orphan login behind.
		normalizeWeddingFields(fields);
		if (await ctx.runQuery(internal.access.emailTaken, { email })) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		await createAccount(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: password },
			profile: { email },
		});
		const adminUserId = await ctx.runQuery(internal.access.userIdByEmail, {
			email,
		});
		if (adminUserId === null) {
			throw new ConvexError("Falha ao criar o acesso");
		}
		return await ctx.runMutation(internal.access.insertWeddingAdmin, {
			adminUserId,
			fields,
		});
	},
});

/** Members of the caller's wedding (admin + members), for the Acessos card. */
export const listMembers = weddingQuery({
	args: {},
	handler: async (ctx) => {
		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_wedding_user", (q) => q.eq("weddingId", ctx.weddingId))
			.collect();
		const rows = await Promise.all(
			memberships.map(async (m) => ({
				userId: m.userId,
				email: (await ctx.db.get(m.userId))?.email ?? "",
				role: m.role,
				isSelf: m.userId === ctx.viewer._id,
			})),
		);
		return rows.sort((a, b) => a.email.localeCompare(b.email));
	},
});

/** Wedding-admin only: adds a member (partner, planner) to their wedding. */
export const createMember = action({
	args: { email: v.string(), password: v.string() },
	handler: async (ctx, { email: rawEmail, password }): Promise<null> => {
		const weddingId = await ctx.runQuery(internal.access.callerWeddingId, {});
		const email = normalizeEmail(rawEmail);
		assertValidEmail(email);
		assertValidPassword(password);
		if (await ctx.runQuery(internal.access.emailTaken, { email })) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		await createAccount(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: password },
			profile: { email },
		});
		const userId = await ctx.runQuery(internal.access.userIdByEmail, { email });
		if (userId === null) {
			throw new ConvexError("Falha ao criar o acesso");
		}
		await ctx.runMutation(internal.access.insertMember, { weddingId, userId });
		return null;
	},
});

// ---------------------------------------------------------------------------
// Invitations: the admin types only an e-mail; the invited person receives a
// link and picks their own password on /convite. The link token is stored
// hashed and expires after 7 days.

const INVITATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const coupleNamesById = internalQuery({
	args: { weddingId: v.id("weddings") },
	handler: async (ctx, { weddingId }) => {
		return (await ctx.db.get(weddingId))?.coupleNames ?? "";
	},
});

export const storeInvitation = internalMutation({
	args: {
		weddingId: v.id("weddings"),
		email: v.string(),
		tokenHash: v.string(),
		invitedByUserId: v.id("users"),
		expiresAt: v.number(),
	},
	handler: async (ctx, args) => {
		// Re-inviting the same e-mail replaces the previous invitation, so at
		// most one link per address is ever live.
		const existing = await ctx.db
			.query("invitations")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.collect();
		for (const row of existing) {
			await ctx.db.delete(row._id);
		}
		await ctx.db.insert("invitations", args);
	},
});

export const invitedByUserId = internalQuery({
	args: {},
	handler: async (ctx) => (await requireWeddingAdmin(ctx)).viewerId,
});

/** Wedding-admin only: e-mails an invitation link to a future member. */
export const inviteMember = action({
	args: { email: v.string() },
	handler: async (ctx, { email: rawEmail }): Promise<null> => {
		const weddingId = await ctx.runQuery(internal.access.callerWeddingId, {});
		const invitedByUserId = await ctx.runQuery(
			internal.access.invitedByUserId,
			{},
		);
		const email = normalizeEmail(rawEmail);
		assertValidEmail(email);
		if (await ctx.runQuery(internal.access.emailTaken, { email })) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		const token = generateUrlToken();
		await ctx.runMutation(internal.access.storeInvitation, {
			weddingId,
			email,
			tokenHash: await sha256Hex(token),
			invitedByUserId,
			expiresAt: Date.now() + INVITATION_MAX_AGE_MS,
		});
		const coupleNames = await ctx.runQuery(internal.access.coupleNamesById, {
			weddingId,
		});
		const link = `${appBaseUrl()}/convite?token=${token}`;
		await sendEmail({
			to: email,
			subject: `Convite para o casamento de ${coupleNames} — Nosso Casamento`,
			html: renderEmail({
				heading: "Você foi convidado(a)!",
				bodyHtml: `<p>Você recebeu um convite para acompanhar o planejamento do casamento de <b>${escapeHtml(coupleNames)}</b> no Nosso Casamento.</p>
					<p>Clique no botão abaixo para criar sua senha e entrar. O convite vale por 7 dias.</p>`,
				ctaLabel: "Criar minha senha",
				ctaUrl: link,
			}),
		});
		return null;
	},
});

/** Pending invitations of the caller's wedding, for the Acessos card. */
export const listInvitations = weddingQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db
			.query("invitations")
			.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
			.collect();
		return rows
			.filter((row) => row.expiresAt > Date.now())
			.map((row) => ({
				id: row._id,
				email: row.email,
				expiresAt: row.expiresAt,
			}))
			.sort((a, b) => a.email.localeCompare(b.email));
	},
});

/** Wedding-admin only: cancels a pending invitation (kills the link). */
export const revokeInvitation = weddingAdminMutation({
	args: { invitationId: v.id("invitations") },
	handler: async (ctx, { invitationId }: { invitationId: Id<"invitations"> }) => {
		const row = await ctx.db.get(invitationId);
		if (row === null || row.weddingId !== ctx.weddingId) {
			throw new ConvexError("Convite não encontrado");
		}
		await ctx.db.delete(row._id);
	},
});

export const invitationByTokenHash = internalQuery({
	args: { tokenHash: v.string() },
	handler: async (ctx, { tokenHash }) => {
		const row = await ctx.db
			.query("invitations")
			.withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
			.unique();
		if (row === null || row.expiresAt < Date.now()) return null;
		return {
			id: row._id,
			weddingId: row.weddingId,
			email: row.email,
		};
	},
});

export const deleteInvitation = internalMutation({
	args: { invitationId: v.id("invitations") },
	handler: async (ctx, { invitationId }) => {
		const row = await ctx.db.get(invitationId);
		if (row !== null) await ctx.db.delete(row._id);
	},
});

/**
 * Public (token-gated): what the /convite page shows before the invited
 * person creates their password. Returns null for dead links.
 */
export const invitationByToken = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const tokenHash = await sha256Hex(token);
		const row = await ctx.db
			.query("invitations")
			.withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
			.unique();
		if (row === null || row.expiresAt < Date.now()) return null;
		const coupleNames =
			(await ctx.db.get(row.weddingId))?.coupleNames ?? "";
		return { email: row.email, coupleNames };
	},
});

/**
 * Public (token-gated): the invited person sets their own password. Creates
 * the account + membership and burns the invitation.
 */
export const acceptInvitation = action({
	args: { token: v.string(), password: v.string() },
	handler: async (ctx, { token, password }): Promise<{ email: string }> => {
		const invitation = await ctx.runQuery(
			internal.access.invitationByTokenHash,
			{ tokenHash: await sha256Hex(token) },
		);
		if (invitation === null) {
			throw new ConvexError("Convite inválido ou expirado");
		}
		assertValidPassword(password);
		if (
			await ctx.runQuery(internal.access.emailTaken, {
				email: invitation.email,
			})
		) {
			throw new ConvexError("Já existe um acesso com esse e-mail");
		}
		await createAccount(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: invitation.email, secret: password },
			profile: { email: invitation.email },
		});
		const userId = await ctx.runQuery(internal.access.userIdByEmail, {
			email: invitation.email,
		});
		if (userId === null) {
			throw new ConvexError("Falha ao criar o acesso");
		}
		await ctx.runMutation(internal.access.insertMember, {
			weddingId: invitation.weddingId,
			userId,
		});
		await ctx.runMutation(internal.access.deleteInvitation, {
			invitationId: invitation.id,
		});
		return { email: invitation.email };
	},
});

/** Wedding-admin only: resets the password of a member of their wedding. */
export const resetMemberPassword = action({
	args: { userId: v.id("users"), password: v.string() },
	handler: async (ctx, { userId, password }): Promise<null> => {
		const weddingId = await ctx.runQuery(internal.access.callerWeddingId, {});
		assertValidPassword(password);
		const email = await ctx.runQuery(internal.access.memberEmailInWedding, {
			weddingId,
			userId,
		});
		if (email === null) {
			throw new ConvexError("Membro não encontrado");
		}
		await modifyAccountCredentials(ctx, {
			provider: PASSWORD_PROVIDER,
			account: { id: email, secret: password },
		});
		await invalidateSessions(ctx, { userId });
		return null;
	},
});

/** Wedding-admin only: removes a member of their wedding and their account. */
export const removeMember = weddingAdminMutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }: { userId: Id<"users"> }) => {
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_wedding_user", (q) =>
				q.eq("weddingId", ctx.weddingId).eq("userId", userId),
			)
			.unique();
		// Only members can be removed — never the admin themselves or a user of
		// another wedding (which reads as "not found", no cross-tenant probing).
		if (membership === null || membership.role !== "member") {
			throw new ConvexError("Membro não encontrado");
		}
		await ctx.db.delete(membership._id);
		await purgeAuthRows(ctx, userId);
		await ctx.db.delete(userId);
	},
});
