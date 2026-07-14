import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { todayInSaoPaulo } from "../../lib/domain/dates";
import { trialUntil } from "../../lib/domain/subscription";
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

describe("weddings.save", () => {
	const validArgs = {
		coupleNames: "Ana & Bruno Silva",
		weddingDate: "2027-07-10",
		budgetGoalCents: 6_000_000,
	};

	test("wedding admin updates the wedding in place", async () => {
		const { asAdminA, weddingA, t } = await setupWeddingsTest();
		await asAdminA.mutation(api.weddings.save, {
			...validArgs,
			ceremonyVenue: "  Igreja Matriz  ",
			receptionVenue: "   ",
		});

		const weddings = await t.run((ctx) => ctx.db.query("weddings").collect());
		expect(weddings).toHaveLength(2); // updated, not duplicated
		const updated = weddings.find((w) => w._id === weddingA);
		expect(updated).toMatchObject(validArgs);
		expect(updated?.ceremonyVenue).toBe("Igreja Matriz");
		expect(updated?.receptionVenue).toBeUndefined();
	});

	test("persists optional event details and clears them when omitted", async () => {
		const { asAdminA } = await setupWeddingsTest();
		await asAdminA.mutation(api.weddings.save, {
			...validArgs,
			ceremonyVenue: "Igreja Matriz",
			receptionVenue: "Espaço Villa",
			weddingTime: "16:30",
		});
		expect(await asAdminA.query(api.weddings.getCurrent, {})).toMatchObject({
			ceremonyVenue: "Igreja Matriz",
			receptionVenue: "Espaço Villa",
			weddingTime: "16:30",
		});

		// Replace semantics: optionals omitted on the next save are cleared.
		await asAdminA.mutation(api.weddings.save, validArgs);
		const wedding = await asAdminA.query(api.weddings.getCurrent, {});
		expect(wedding?.ceremonyVenue).toBeUndefined();
		expect(wedding?.receptionVenue).toBeUndefined();
		expect(wedding?.weddingTime).toBeUndefined();
	});

	test("member without the admin role is rejected", async () => {
		const { asMemberA } = await setupWeddingsTest();
		await expect(
			asMemberA.mutation(api.weddings.save, validArgs),
		).rejects.toThrowError(/administrador/i);
	});

	test("superadmin edits any wedding explicitly", async () => {
		const { asSuperadmin, weddingB, t } = await setupWeddingsTest();
		await asSuperadmin.mutation(api.weddings.save, {
			...validArgs,
			weddingId: weddingB,
		});
		const updated = await t.run((ctx) => ctx.db.get(weddingB));
		expect(updated?.coupleNames).toBe(validArgs.coupleNames);
	});

	test("rejects an invalid wedding date", async () => {
		const { asAdminA } = await setupWeddingsTest();
		await expect(
			asAdminA.mutation(api.weddings.save, {
				...validArgs,
				weddingDate: "10/07/2027",
			}),
		).rejects.toThrowError(/data/i);
	});

	test("rejects a negative budget goal", async () => {
		const { asAdminA } = await setupWeddingsTest();
		await expect(
			asAdminA.mutation(api.weddings.save, {
				...validArgs,
				budgetGoalCents: -1,
			}),
		).rejects.toThrowError(/orçamento/i);
	});

	test("rejects an invalid wedding time", async () => {
		const { asAdminA } = await setupWeddingsTest();
		await expect(
			asAdminA.mutation(api.weddings.save, {
				...validArgs,
				weddingTime: "25:00",
			}),
		).rejects.toThrowError(/horário/i);
	});
});

describe("weddings.create", () => {
	const newWedding = {
		coupleNames: "Elisa & Fábio",
		weddingDate: "2028-03-18",
		budgetGoalCents: 4_000_000,
	};

	test("superadmin creates a wedding with its admin membership", async () => {
		const { asSuperadmin, looseUser, t } = await setupWeddingsTest();
		const weddingId = await asSuperadmin.mutation(api.weddings.create, {
			...newWedding,
			adminUserId: looseUser,
		});

		const rows = await t.run(async (ctx) => ({
			wedding: await ctx.db.get(weddingId),
			membership: await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", looseUser))
				.unique(),
		}));
		expect(rows.wedding).toMatchObject(newWedding);
		expect(rows.membership).toMatchObject({
			weddingId,
			userId: looseUser,
			role: "admin",
		});
	});

	test("a wedding admin cannot create weddings", async () => {
		const { asAdminA, looseUser } = await setupWeddingsTest();
		await expect(
			asAdminA.mutation(api.weddings.create, {
				...newWedding,
				adminUserId: looseUser,
			}),
		).rejects.toThrowError(/administrador/i);
	});

	test("rejects an admin user who already belongs to a wedding", async () => {
		const { asSuperadmin, memberA } = await setupWeddingsTest();
		await expect(
			asSuperadmin.mutation(api.weddings.create, {
				...newWedding,
				adminUserId: memberA,
			}),
		).rejects.toThrowError(/já está vinculado/i);
	});

	test("rejects invalid wedding fields", async () => {
		const { asSuperadmin, looseUser } = await setupWeddingsTest();
		await expect(
			asSuperadmin.mutation(api.weddings.create, {
				...newWedding,
				weddingDate: "18/03/2028",
				adminUserId: looseUser,
			}),
		).rejects.toThrowError(/data/i);
	});
});

describe("subscription read-only enforcement", () => {
	async function withSubscription(activeUntil: string) {
		const ctx = await setupWeddingsTest();
		await ctx.t.run((db) =>
			db.db.patch(ctx.weddingA, { subscriptionActiveUntil: activeUntil }),
		);
		return ctx;
	}

	const editArgs = {
		coupleNames: "Ana & Bruno",
		weddingDate: "2027-06-12",
		budgetGoalCents: 5_000_000,
	};

	test("blocks a wedding-admin write when the subscription has expired", async () => {
		const { asAdminA } = await withSubscription("2020-01-01");
		await expect(
			asAdminA.mutation(api.weddings.save, editArgs),
		).rejects.toThrowError(/assinatura|somente leitura/i);
	});

	test("still allows reads when the subscription has expired", async () => {
		const { asMemberA } = await withSubscription("2020-01-01");
		const wedding = await asMemberA.query(api.weddings.getCurrent, {});
		expect(wedding?.coupleNames).toBe("Ana & Bruno");
	});

	test("allows writes while the subscription is active", async () => {
		const { asAdminA } = await withSubscription("2999-01-01");
		await expect(
			asAdminA.mutation(api.weddings.save, editArgs),
		).resolves.toBeDefined();
	});

	test("lets the superadmin write even when the subscription has expired", async () => {
		const { asSuperadmin, weddingA } = await withSubscription("2020-01-01");
		await expect(
			asSuperadmin.mutation(api.weddings.save, {
				...editArgs,
				weddingId: weddingA,
			}),
		).resolves.toBeDefined();
	});
});

describe("superadmin subscription management", () => {
	test("create starts a 14-day trial", async () => {
		const { asSuperadmin, looseUser, t } = await setupWeddingsTest();
		const weddingId = await asSuperadmin.mutation(api.weddings.create, {
			coupleNames: "Elisa & Fábio",
			weddingDate: "2028-03-18",
			budgetGoalCents: 4_000_000,
			adminUserId: looseUser,
		});
		const wedding = await t.run((ctx) => ctx.db.get(weddingId));
		expect(wedding?.subscriptionActiveUntil).toBe(
			trialUntil(todayInSaoPaulo()),
		);
	});

	test("listAll returns every wedding with status, member count and admin", async () => {
		const { asSuperadmin } = await setupWeddingsTest();
		const rows = await asSuperadmin.query(api.weddings.listAll, {});
		expect(rows).toHaveLength(2);
		const a = rows.find((r) => r.coupleNames === "Ana & Bruno");
		expect(a?.memberCount).toBe(2);
		expect(a?.adminEmail).toBe(ADMIN_A_EMAIL);
		expect(a?.subscription.active).toBe(true); // no date = unlimited
	});

	test("listAll is superadmin-only", async () => {
		const { asAdminA } = await setupWeddingsTest();
		await expect(asAdminA.query(api.weddings.listAll, {})).rejects.toThrowError(
			/administrador/i,
		);
	});

	test("setSubscription extends and clears a wedding's validity", async () => {
		const { asSuperadmin, weddingA, t } = await setupWeddingsTest();
		await asSuperadmin.mutation(api.weddings.setSubscription, {
			weddingId: weddingA,
			activeUntil: "2027-01-31",
		});
		expect(
			(await t.run((ctx) => ctx.db.get(weddingA)))?.subscriptionActiveUntil,
		).toBe("2027-01-31");

		await asSuperadmin.mutation(api.weddings.setSubscription, {
			weddingId: weddingA,
			activeUntil: null,
		});
		expect(
			(await t.run((ctx) => ctx.db.get(weddingA)))?.subscriptionActiveUntil,
		).toBeUndefined();
	});

	test("setSubscription rejects an invalid date", async () => {
		const { asSuperadmin, weddingA } = await setupWeddingsTest();
		await expect(
			asSuperadmin.mutation(api.weddings.setSubscription, {
				weddingId: weddingA,
				activeUntil: "31/01/2027",
			}),
		).rejects.toThrowError(/data/i);
	});

	test("setSubscription is superadmin-only", async () => {
		const { asAdminA, weddingA } = await setupWeddingsTest();
		await expect(
			asAdminA.mutation(api.weddings.setSubscription, {
				weddingId: weddingA,
				activeUntil: "2027-01-31",
			}),
		).rejects.toThrowError(/administrador/i);
	});

	test("subscriptionStatus reports the caller wedding state", async () => {
		const { asAdminA, weddingA, t } = await setupWeddingsTest();
		await t.run((ctx) =>
			ctx.db.patch(weddingA, { subscriptionActiveUntil: "2020-01-01" }),
		);
		const status = await asAdminA.query(api.weddings.subscriptionStatus, {});
		expect(status).toMatchObject({
			active: false,
			activeUntil: "2020-01-01",
			isAdmin: true,
			isSuperadmin: false,
		});
	});
});
