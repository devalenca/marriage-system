import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { stubAuthTokenEnv } from "./authEnv";
import { setupUnauthenticatedTest, stubResend, tokenFrom } from "./helpers";

// Real member invitations: the wedding admin types only an e-mail; the
// invited person receives a link and chooses their own password.

const ADMIN_EMAIL = "ana@example.com";
const OTHER_ADMIN_EMAIL = "carla@example.com";
const INVITED_EMAIL = "bruno@example.com";

async function setupInviteTest() {
	const t = setupUnauthenticatedTest();
	const seeded = await t.run(async (ctx) => {
		const weddingA = await ctx.db.insert("weddings", {
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5_000_000,
		});
		const weddingB = await ctx.db.insert("weddings", {
			coupleNames: "Carla & Diego",
			weddingDate: "2027-09-25",
			budgetGoalCents: 8_000_000,
		});
		const adminA = await ctx.db.insert("users", { email: ADMIN_EMAIL });
		const adminB = await ctx.db.insert("users", { email: OTHER_ADMIN_EMAIL });
		const memberA = await ctx.db.insert("users", {
			email: "membro@example.com",
		});
		await ctx.db.insert("memberships", {
			weddingId: weddingA,
			userId: adminA,
			role: "admin",
		});
		await ctx.db.insert("memberships", {
			weddingId: weddingA,
			userId: memberA,
			role: "member",
		});
		await ctx.db.insert("memberships", {
			weddingId: weddingB,
			userId: adminB,
			role: "admin",
		});
		return { weddingA, weddingB, adminA, adminB, memberA };
	});
	return {
		t,
		...seeded,
		asAdminA: t.withIdentity({
			subject: `${seeded.adminA}|session`,
			email: ADMIN_EMAIL,
		}),
		asMemberA: t.withIdentity({
			subject: `${seeded.memberA}|session`,
			email: "membro@example.com",
		}),
	};
}

beforeEach(() => {
	stubAuthTokenEnv();
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("access.inviteMember", () => {
	test("stores the invitation and emails a link with the token", async () => {
		const sent = stubResend();
		const { asAdminA, t, weddingA } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });

		const invite = sent.at(-1);
		expect(invite?.to).toBe(INVITED_EMAIL);
		expect(invite?.html).toContain("/convite?token=");

		const rows = await t.run((ctx) => ctx.db.query("invitations").collect());
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			weddingId: weddingA,
			email: INVITED_EMAIL,
		});
		// The raw token never touches the database.
		expect(rows[0]?.tokenHash).not.toBe(tokenFrom(invite?.html ?? ""));
	});

	test("a plain member cannot invite", async () => {
		stubResend();
		const { asMemberA } = await setupInviteTest();
		await expect(
			asMemberA.action(api.access.inviteMember, { email: INVITED_EMAIL }),
		).rejects.toThrowError(/administrador/i);
	});

	test("rejects an e-mail that already has an account", async () => {
		stubResend();
		const { asAdminA } = await setupInviteTest();
		await expect(
			asAdminA.action(api.access.inviteMember, { email: OTHER_ADMIN_EMAIL }),
		).rejects.toThrowError(/já existe/i);
	});

	test("re-inviting replaces the previous invitation", async () => {
		const sent = stubResend();
		const { asAdminA, t } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });
		const firstToken = tokenFrom(sent.at(-1)?.html ?? "");
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });

		const rows = await t.run((ctx) => ctx.db.query("invitations").collect());
		expect(rows).toHaveLength(1);
		// The old link is dead.
		expect(
			await t.query(api.access.invitationByToken, { token: firstToken }),
		).toBeNull();
	});
});

describe("access.invitationByToken", () => {
	test("shows the invite context to the (anonymous) invited person", async () => {
		const sent = stubResend();
		const { asAdminA, t } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });
		const token = tokenFrom(sent.at(-1)?.html ?? "");

		const info = await t.query(api.access.invitationByToken, { token });
		expect(info).toMatchObject({
			email: INVITED_EMAIL,
			coupleNames: "Ana & Bruno",
		});
	});

	test("returns null for an unknown token", async () => {
		stubResend();
		const { t } = await setupInviteTest();
		expect(
			await t.query(api.access.invitationByToken, { token: "nope" }),
		).toBeNull();
	});
});

describe("access.acceptInvitation", () => {
	test("creates the account + membership and burns the invitation", async () => {
		const sent = stubResend();
		const { asAdminA, t, weddingA } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });
		const token = tokenFrom(sent.at(-1)?.html ?? "");

		await t.action(api.access.acceptInvitation, {
			token,
			password: "senha-do-bruno-123",
		});

		const rows = await t.run(async (ctx) => {
			const user = (await ctx.db.query("users").collect()).find(
				(u) => u.email === INVITED_EMAIL,
			);
			const membership = user
				? await ctx.db
						.query("memberships")
						.withIndex("by_user", (q) => q.eq("userId", user._id))
						.unique()
				: null;
			return {
				membership,
				invitations: await ctx.db.query("invitations").collect(),
			};
		});
		expect(rows.membership).toMatchObject({
			weddingId: weddingA,
			role: "member",
		});
		expect(rows.invitations).toHaveLength(0);

		// The chosen password signs in.
		const signedIn = await t.action(api.auth.signIn, {
			provider: "password",
			params: {
				email: INVITED_EMAIL,
				password: "senha-do-bruno-123",
				flow: "signIn",
			},
		});
		expect(signedIn.tokens).toBeTruthy();
	});

	test("works even with public self-signup disabled", async () => {
		const sent = stubResend();
		vi.stubEnv("AUTH_SIGNUP_DISABLED", "true");
		const { asAdminA, t } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });
		const token = tokenFrom(sent.at(-1)?.html ?? "");
		await expect(
			t.action(api.access.acceptInvitation, {
				token,
				password: "senha-do-bruno-123",
			}),
		).resolves.not.toThrow();
	});

	test("knowing an invited address does not let a stranger claim it", async () => {
		const sent = stubResend();
		vi.stubEnv("AUTH_SIGNUP_DISABLED", "true");
		const { asAdminA, t } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });

		// No token — just the address. The account-creation gate must refuse,
		// otherwise the real invitee is locked out of their own invitation.
		await expect(
			t.action(api.auth.signIn, {
				provider: "password",
				params: {
					email: INVITED_EMAIL,
					password: "senha-do-invasor-123",
					flow: "signUp",
				},
			}),
		).rejects.toThrowError();

		// The genuine link still works.
		await expect(
			t.action(api.access.acceptInvitation, {
				token: tokenFrom(sent.at(-1)?.html ?? ""),
				password: "senha-do-bruno-123",
			}),
		).resolves.toMatchObject({ email: INVITED_EMAIL });
	});

	test("rejects an unknown token", async () => {
		stubResend();
		const { t } = await setupInviteTest();
		await expect(
			t.action(api.access.acceptInvitation, {
				token: "invalido",
				password: "senha-qualquer-123",
			}),
		).rejects.toThrowError(/convite/i);
	});

	test("rejects a short password", async () => {
		const sent = stubResend();
		const { asAdminA, t } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });
		const token = tokenFrom(sent.at(-1)?.html ?? "");
		await expect(
			t.action(api.access.acceptInvitation, { token, password: "curta" }),
		).rejects.toThrowError(/8 caracteres/i);
	});
});

describe("access.listInvitations / revokeInvitation", () => {
	test("admin sees pending invitations and can revoke them", async () => {
		const sent = stubResend();
		const { asAdminA, t } = await setupInviteTest();
		await asAdminA.action(api.access.inviteMember, { email: INVITED_EMAIL });
		const token = tokenFrom(sent.at(-1)?.html ?? "");

		const pending = await asAdminA.query(api.access.listInvitations, {});
		expect(pending).toHaveLength(1);
		const first = pending[0];
		if (!first) throw new Error("no pending invitation");
		expect(first.email).toBe(INVITED_EMAIL);

		await asAdminA.mutation(api.access.revokeInvitation, {
			invitationId: first.id,
		});
		expect(await asAdminA.query(api.access.listInvitations, {})).toHaveLength(
			0,
		);
		expect(await t.query(api.access.invitationByToken, { token })).toBeNull();
	});
});
