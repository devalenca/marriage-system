import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { todayInSaoPaulo } from "../../lib/domain/dates";
import { trialUntil } from "../../lib/domain/subscription";
import { setupUnauthenticatedTest } from "./helpers";

// Per-wedding access management: the superadmin provisions whole tenants; a
// wedding admin manages the members of their own wedding.

const SUPERADMIN_EMAIL = "super@example.com";
const ADMIN_A_EMAIL = "ana@example.com";
const MEMBER_A_EMAIL = "bruno@example.com";
const ADMIN_B_EMAIL = "carla@example.com";

async function setupAccessTest() {
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
		const superadmin = await ctx.db.insert("users", {
			email: SUPERADMIN_EMAIL,
		});
		const adminA = await ctx.db.insert("users", { email: ADMIN_A_EMAIL });
		const memberA = await ctx.db.insert("users", { email: MEMBER_A_EMAIL });
		const adminB = await ctx.db.insert("users", { email: ADMIN_B_EMAIL });
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
		return { weddingA, weddingB, superadmin, adminA, memberA, adminB };
	});
	const identify = (id: string, email: string) =>
		t.withIdentity({ subject: `${id}|session`, email });
	return {
		t,
		...seeded,
		asSuperadmin: identify(seeded.superadmin, SUPERADMIN_EMAIL),
		asAdminA: identify(seeded.adminA, ADMIN_A_EMAIL),
		asMemberA: identify(seeded.memberA, MEMBER_A_EMAIL),
		asAdminB: identify(seeded.adminB, ADMIN_B_EMAIL),
	};
}

beforeEach(() => {
	vi.stubEnv("AUTH_ADMIN_EMAIL", SUPERADMIN_EMAIL);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("access.provision", () => {
	const newCouple = {
		coupleNames: "Elisa & Fábio",
		weddingDate: "2028-03-18",
		budgetGoalCents: 4_000_000,
		email: "elisa@example.com",
		password: "senha-forte-123",
	};

	test("superadmin creates the account, wedding, trial and admin membership", async () => {
		const { asSuperadmin, t } = await setupAccessTest();
		const weddingId = await asSuperadmin.action(
			api.access.provision,
			newCouple,
		);

		const rows = await t.run(async (ctx) => {
			const user = (await ctx.db.query("users").collect()).find(
				(u) => u.email === "elisa@example.com",
			);
			const wedding = await ctx.db.get(weddingId);
			const membership = user
				? await ctx.db
						.query("memberships")
						.withIndex("by_user", (q) => q.eq("userId", user._id))
						.unique()
				: null;
			return { user, wedding, membership };
		});
		expect(rows.user).toBeTruthy();
		expect(rows.wedding).toMatchObject({ coupleNames: "Elisa & Fábio" });
		expect(rows.wedding?.subscriptionActiveUntil).toBe(
			trialUntil(todayInSaoPaulo()),
		);
		expect(rows.membership).toMatchObject({ weddingId, role: "admin" });
	});

	test("is superadmin-only", async () => {
		const { asAdminA } = await setupAccessTest();
		await expect(
			asAdminA.action(api.access.provision, newCouple),
		).rejects.toThrowError(/administrador/i);
	});

	test("rejects a duplicate e-mail", async () => {
		const { asSuperadmin } = await setupAccessTest();
		await expect(
			asSuperadmin.action(api.access.provision, {
				...newCouple,
				email: ADMIN_A_EMAIL,
			}),
		).rejects.toThrowError(/já existe/i);
	});

	test("rejects a short password", async () => {
		const { asSuperadmin } = await setupAccessTest();
		await expect(
			asSuperadmin.action(api.access.provision, {
				...newCouple,
				password: "curta",
			}),
		).rejects.toThrowError(/8 caracteres/i);
	});

	test("leaves no orphan account when the wedding fields are invalid", async () => {
		const { asSuperadmin, t } = await setupAccessTest();
		await expect(
			asSuperadmin.action(api.access.provision, {
				...newCouple,
				weddingDate: "18/03/2028",
			}),
		).rejects.toThrowError(/data/i);
		const created = await t.run((ctx) =>
			ctx.db
				.query("users")
				.collect()
				.then((us) => us.some((u) => u.email === "elisa@example.com")),
		);
		expect(created).toBe(false);
	});
});

describe("access.listMembers", () => {
	test("lists only the caller wedding's members", async () => {
		const { asAdminA } = await setupAccessTest();
		const members = await asAdminA.query(api.access.listMembers, {});
		expect(members.map((m) => m.email).sort()).toEqual([
			ADMIN_A_EMAIL,
			MEMBER_A_EMAIL,
		]);
		expect(members.find((m) => m.email === ADMIN_A_EMAIL)).toMatchObject({
			role: "admin",
			isSelf: true,
		});
	});

	test("never leaks another wedding's members", async () => {
		const { asAdminB } = await setupAccessTest();
		const members = await asAdminB.query(api.access.listMembers, {});
		expect(members.map((m) => m.email)).toEqual([ADMIN_B_EMAIL]);
	});
});

describe("access.createMember", () => {
	const newMember = {
		email: "planner@example.com",
		password: "senha-forte-123",
	};

	test("wedding admin adds a member to their own wedding", async () => {
		const { asAdminA, weddingA, t } = await setupAccessTest();
		await asAdminA.action(api.access.createMember, newMember);

		const membership = await t.run(async (ctx) => {
			const user = (await ctx.db.query("users").collect()).find(
				(u) => u.email === "planner@example.com",
			);
			return user
				? await ctx.db
						.query("memberships")
						.withIndex("by_user", (q) => q.eq("userId", user._id))
						.unique()
				: null;
		});
		expect(membership).toMatchObject({ weddingId: weddingA, role: "member" });
	});

	test("a plain member cannot add members", async () => {
		const { asMemberA } = await setupAccessTest();
		await expect(
			asMemberA.action(api.access.createMember, newMember),
		).rejects.toThrowError(/administrador/i);
	});

	test("rejects a duplicate e-mail", async () => {
		const { asAdminA } = await setupAccessTest();
		await expect(
			asAdminA.action(api.access.createMember, {
				...newMember,
				email: ADMIN_B_EMAIL,
			}),
		).rejects.toThrowError(/já existe/i);
	});
});

describe("access.removeMember", () => {
	test("removes a member of the caller's wedding and their account", async () => {
		const { asAdminA, memberA, t } = await setupAccessTest();
		await asAdminA.mutation(api.access.removeMember, { userId: memberA });
		const rows = await t.run(async (ctx) => ({
			user: await ctx.db.get(memberA),
			membership: await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", memberA))
				.unique(),
		}));
		expect(rows.user).toBeNull();
		expect(rows.membership).toBeNull();
	});

	test("cannot remove a user of another wedding (reads as not found)", async () => {
		const { asAdminA, adminB } = await setupAccessTest();
		await expect(
			asAdminA.mutation(api.access.removeMember, { userId: adminB }),
		).rejects.toThrowError(/não encontrado/i);
	});

	test("cannot remove the admin themselves", async () => {
		const { asAdminA, adminA } = await setupAccessTest();
		await expect(
			asAdminA.mutation(api.access.removeMember, { userId: adminA }),
		).rejects.toThrowError(/não encontrado/i);
	});
});

describe("access.resetMemberPassword", () => {
	test("admin resets a member of their wedding", async () => {
		const { asAdminA, t } = await setupAccessTest();
		// Create a member through the real flow so it has an auth account.
		await asAdminA.action(api.access.createMember, {
			email: "planner@example.com",
			password: "senha-forte-123",
		});
		const userId = await t.run((ctx) =>
			ctx.db
				.query("users")
				.collect()
				.then((us) => us.find((u) => u.email === "planner@example.com")?._id),
		);
		await expect(
			asAdminA.action(api.access.resetMemberPassword, {
				userId: userId as NonNullable<typeof userId>,
				password: "nova-senha-123",
			}),
		).resolves.toBeNull();
	});

	test("admin cannot reset a user of another wedding", async () => {
		const { asAdminA, adminB } = await setupAccessTest();
		await expect(
			asAdminA.action(api.access.resetMemberPassword, {
				userId: adminB,
				password: "nova-senha-123",
			}),
		).rejects.toThrowError(/não encontrado/i);
	});
});
