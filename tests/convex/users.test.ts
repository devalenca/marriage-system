import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupUnauthenticatedTest } from "./helpers";

// Access management: the admin (AUTH_ADMIN_EMAIL) creates and removes the
// accounts; nobody can self-register. bootstrapStatus is the single public
// unauthenticated query (the login page needs it before any session exists).

const ADMIN_EMAIL = "admin@example.com";
const MEMBER_EMAIL = "noiva@example.com";

async function setupUsersTest() {
	const t = setupUnauthenticatedTest();
	const seeded = await t.run(async (ctx) => {
		const adminId = await ctx.db.insert("users", { email: ADMIN_EMAIL });
		const memberId = await ctx.db.insert("users", { email: MEMBER_EMAIL });
		const memberAccountId = await ctx.db.insert("authAccounts", {
			userId: memberId,
			provider: "password",
			providerAccountId: MEMBER_EMAIL,
			secret: "hashed",
		});
		const memberSessionId = await ctx.db.insert("authSessions", {
			userId: memberId,
			expirationTime: Date.now() + 1000 * 60 * 60,
		});
		await ctx.db.insert("authRefreshTokens", {
			sessionId: memberSessionId,
			expirationTime: Date.now() + 1000 * 60 * 60,
		});
		return { adminId, memberId, memberAccountId, memberSessionId };
	});
	return {
		t,
		...seeded,
		asAdmin: t.withIdentity({
			subject: `${seeded.adminId}|session-a`,
			email: ADMIN_EMAIL,
		}),
		asMember: t.withIdentity({
			subject: `${seeded.memberId}|session-m`,
			email: MEMBER_EMAIL,
		}),
	};
}

beforeEach(() => {
	vi.stubEnv("AUTH_ADMIN_EMAIL", ADMIN_EMAIL);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("users.bootstrapStatus", () => {
	test("is public and reports an empty users table", async () => {
		const t = setupUnauthenticatedTest();
		expect(await t.query(api.users.bootstrapStatus, {})).toEqual({
			needsBootstrap: true,
		});
	});

	test("reports false once any user exists", async () => {
		const { t } = await setupUsersTest();
		expect(await t.query(api.users.bootstrapStatus, {})).toEqual({
			needsBootstrap: false,
		});
	});
});

describe("users.viewer", () => {
	test("identifies the admin", async () => {
		const { asAdmin } = await setupUsersTest();
		expect(await asAdmin.query(api.users.viewer, {})).toEqual({
			email: ADMIN_EMAIL,
			isAdmin: true,
		});
	});

	test("identifies a regular member", async () => {
		const { asMember } = await setupUsersTest();
		expect(await asMember.query(api.users.viewer, {})).toEqual({
			email: MEMBER_EMAIL,
			isAdmin: false,
		});
	});
});

describe("users.list", () => {
	test("admin sees every access", async () => {
		const { asAdmin } = await setupUsersTest();
		const users = await asAdmin.query(api.users.list, {});
		expect(users.map((u: { email?: string }) => u.email).sort()).toEqual([
			ADMIN_EMAIL,
			MEMBER_EMAIL,
		]);
	});

	test("non-admin is rejected", async () => {
		const { asMember } = await setupUsersTest();
		await expect(asMember.query(api.users.list, {})).rejects.toThrowError(
			/administrador/i,
		);
	});
});

describe("users.remove", () => {
	test("admin removes a member along with auth rows", async () => {
		const { t, asAdmin, memberId, memberAccountId, memberSessionId } =
			await setupUsersTest();
		await asAdmin.mutation(api.users.remove, { id: memberId });

		const leftovers = await t.run(async (ctx) => ({
			user: await ctx.db.get(memberId),
			account: await ctx.db.get(memberAccountId),
			session: await ctx.db.get(memberSessionId),
			refreshTokens: await ctx.db.query("authRefreshTokens").collect(),
		}));
		expect(leftovers.user).toBeNull();
		expect(leftovers.account).toBeNull();
		expect(leftovers.session).toBeNull();
		expect(leftovers.refreshTokens).toHaveLength(0);
	});

	test("the admin account cannot be removed", async () => {
		const { asAdmin, adminId } = await setupUsersTest();
		await expect(
			asAdmin.mutation(api.users.remove, { id: adminId }),
		).rejects.toThrowError(/administrador/i);
	});

	test("non-admin is rejected", async () => {
		const { asMember, adminId } = await setupUsersTest();
		await expect(
			asMember.mutation(api.users.remove, { id: adminId }),
		).rejects.toThrowError(/administrador/i);
	});
});

describe("users.create", () => {
	test("non-admin is rejected", async () => {
		const { asMember } = await setupUsersTest();
		await expect(
			asMember.action(api.users.create, {
				email: "nova@example.com",
				password: "senha-forte-123",
			}),
		).rejects.toThrowError(/administrador/i);
	});

	test("rejects a short password", async () => {
		const { asAdmin } = await setupUsersTest();
		await expect(
			asAdmin.action(api.users.create, {
				email: "nova@example.com",
				password: "curta",
			}),
		).rejects.toThrowError(/8 caracteres/i);
	});

	test("rejects a duplicated e-mail", async () => {
		const { asAdmin } = await setupUsersTest();
		await expect(
			asAdmin.action(api.users.create, {
				email: MEMBER_EMAIL,
				password: "senha-forte-123",
			}),
		).rejects.toThrowError(/já existe/i);
	});
});

describe("users.ensureAdminSeeded", () => {
	test("creates the admin account from env vars when no user exists", async () => {
		vi.stubEnv("AUTH_ADMIN_PASSWORD", "senha-admin-123");
		const t = setupUnauthenticatedTest();
		await t.action(api.users.ensureAdminSeeded, {});

		const rows = await t.run(async (ctx) => ({
			users: await ctx.db.query("users").collect(),
			accounts: await ctx.db.query("authAccounts").collect(),
		}));
		expect(rows.users).toHaveLength(1);
		expect(rows.users[0]?.email).toBe(ADMIN_EMAIL);
		expect(rows.accounts).toHaveLength(1);
		expect(rows.accounts[0]?.providerAccountId).toBe(ADMIN_EMAIL);
	});

	test("is idempotent — does nothing once any user exists", async () => {
		vi.stubEnv("AUTH_ADMIN_PASSWORD", "senha-admin-123");
		const { t } = await setupUsersTest();
		await t.action(api.users.ensureAdminSeeded, {});

		const users = await t.run((ctx) => ctx.db.query("users").collect());
		expect(users).toHaveLength(2);
	});

	test("does nothing while AUTH_ADMIN_PASSWORD is not configured", async () => {
		const t = setupUnauthenticatedTest();
		await t.action(api.users.ensureAdminSeeded, {});

		const users = await t.run((ctx) => ctx.db.query("users").collect());
		expect(users).toHaveLength(0);
	});
});

describe("users.resetPassword", () => {
	test("non-admin is rejected", async () => {
		const { asMember, memberId } = await setupUsersTest();
		await expect(
			asMember.action(api.users.resetPassword, {
				id: memberId,
				password: "nova-senha-123",
			}),
		).rejects.toThrowError(/administrador/i);
	});

	test("rejects a short password", async () => {
		const { asAdmin, memberId } = await setupUsersTest();
		await expect(
			asAdmin.action(api.users.resetPassword, {
				id: memberId,
				password: "curta",
			}),
		).rejects.toThrowError(/8 caracteres/i);
	});
});
