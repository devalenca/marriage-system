import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupUnauthenticatedTest } from "./helpers";

// Multi-tenant foundation: every user reaches exactly one wedding through a
// membership; the superadmin (AUTH_ADMIN_EMAIL) reaches any wedding.

const SUPERADMIN_EMAIL = "super@example.com";
const ADMIN_A_EMAIL = "ana@example.com";
const MEMBER_A_EMAIL = "bruno@example.com";
const LOOSE_EMAIL = "solto@example.com";

async function setupWeddingsTest() {
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
		const adminA = await ctx.db.insert("users", { email: ADMIN_A_EMAIL });
		const memberA = await ctx.db.insert("users", { email: MEMBER_A_EMAIL });
		const superadmin = await ctx.db.insert("users", {
			email: SUPERADMIN_EMAIL,
		});
		const looseUser = await ctx.db.insert("users", { email: LOOSE_EMAIL });
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
		return { weddingA, weddingB, adminA, memberA, superadmin, looseUser };
	});
	return {
		t,
		...seeded,
		asAdminA: t.withIdentity({
			subject: `${seeded.adminA}|session`,
			email: ADMIN_A_EMAIL,
		}),
		asMemberA: t.withIdentity({
			subject: `${seeded.memberA}|session`,
			email: MEMBER_A_EMAIL,
		}),
		asSuperadmin: t.withIdentity({
			subject: `${seeded.superadmin}|session`,
			email: SUPERADMIN_EMAIL,
		}),
		asLooseUser: t.withIdentity({
			subject: `${seeded.looseUser}|session`,
			email: LOOSE_EMAIL,
		}),
	};
}

beforeEach(() => {
	vi.stubEnv("AUTH_ADMIN_EMAIL", SUPERADMIN_EMAIL);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("weddings.getCurrent", () => {
	test("member reads the wedding their membership points to", async () => {
		const { asMemberA, weddingA } = await setupWeddingsTest();
		const wedding = await asMemberA.query(api.weddings.getCurrent, {});
		expect(wedding).toMatchObject({
			_id: weddingA,
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5_000_000,
		});
	});

	test("rejects unauthenticated callers", async () => {
		const { t } = await setupWeddingsTest();
		await expect(t.query(api.weddings.getCurrent, {})).rejects.toThrowError(
			/autenticado/i,
		);
	});

	test("rejects a user without a wedding membership", async () => {
		const { asLooseUser } = await setupWeddingsTest();
		await expect(
			asLooseUser.query(api.weddings.getCurrent, {}),
		).rejects.toThrowError(/casamento/i);
	});
});

describe("wedding isolation", () => {
	test("member of wedding A cannot target wedding B explicitly", async () => {
		const { asMemberA, weddingB } = await setupWeddingsTest();
		await expect(
			asMemberA.query(api.weddings.getCurrent, { weddingId: weddingB }),
		).rejects.toThrowError(/acesso negado/i);
	});

	test("member may target their own wedding explicitly", async () => {
		const { asMemberA, weddingA } = await setupWeddingsTest();
		const wedding = await asMemberA.query(api.weddings.getCurrent, {
			weddingId: weddingA,
		});
		expect(wedding?._id).toBe(weddingA);
	});

	test("superadmin reaches any wedding without a membership", async () => {
		const { asSuperadmin, weddingB } = await setupWeddingsTest();
		const wedding = await asSuperadmin.query(api.weddings.getCurrent, {
			weddingId: weddingB,
		});
		expect(wedding).toMatchObject({
			_id: weddingB,
			coupleNames: "Carla & Diego",
		});
	});

	test("superadmin without an explicit wedding still needs a membership", async () => {
		const { asSuperadmin } = await setupWeddingsTest();
		await expect(
			asSuperadmin.query(api.weddings.getCurrent, {}),
		).rejects.toThrowError(/casamento/i);
	});
});
