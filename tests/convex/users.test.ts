import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupUnauthenticatedTest } from "./helpers";

// Superadmin account seeding and identity. Per-wedding account management
// (provisioning, members) lives in access.ts; this module only keeps the
// bootstrap seed, the "who am I" query and the superadmin password reset.

const SUPERADMIN_EMAIL = "admin@example.com";
const MEMBER_EMAIL = "noiva@example.com";

async function setupUsersTest() {
	const t = setupUnauthenticatedTest();
	const seeded = await t.run(async (ctx) => {
		const adminId = await ctx.db.insert("users", { email: SUPERADMIN_EMAIL });
		const memberId = await ctx.db.insert("users", { email: MEMBER_EMAIL });
		return { adminId, memberId };
	});
	return {
		t,
		...seeded,
		asAdmin: t.withIdentity({
			subject: `${seeded.adminId}|session-a`,
			email: SUPERADMIN_EMAIL,
		}),
		asMember: t.withIdentity({
			subject: `${seeded.memberId}|session-m`,
			email: MEMBER_EMAIL,
		}),
	};
}

beforeEach(() => {
	vi.stubEnv("AUTH_ADMIN_EMAIL", SUPERADMIN_EMAIL);
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
	test("identifies the superadmin", async () => {
		const { asAdmin } = await setupUsersTest();
		expect(await asAdmin.query(api.users.viewer, {})).toEqual({
			email: SUPERADMIN_EMAIL,
			isSuperadmin: true,
		});
	});

	test("identifies a regular user", async () => {
		const { asMember } = await setupUsersTest();
		expect(await asMember.query(api.users.viewer, {})).toEqual({
			email: MEMBER_EMAIL,
			isSuperadmin: false,
		});
	});
});

describe("users.ensureAdminSeeded", () => {
	test("creates the superadmin account from env vars when no user exists", async () => {
		vi.stubEnv("AUTH_ADMIN_PASSWORD", "senha-admin-123");
		const t = setupUnauthenticatedTest();
		await t.action(api.users.ensureAdminSeeded, {});

		const rows = await t.run(async (ctx) => ({
			users: await ctx.db.query("users").collect(),
			accounts: await ctx.db.query("authAccounts").collect(),
		}));
		expect(rows.users).toHaveLength(1);
		expect(rows.users[0]?.email).toBe(SUPERADMIN_EMAIL);
		expect(rows.accounts).toHaveLength(1);
		expect(rows.accounts[0]?.providerAccountId).toBe(SUPERADMIN_EMAIL);
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
	test("non-superadmin is rejected", async () => {
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
