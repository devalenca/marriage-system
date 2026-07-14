import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupUnauthenticatedTest } from "./helpers";

const SUPERADMIN_EMAIL = "super@example.com";
const COUPLE_EMAIL = "casal@example.com";

async function setupFeedbackTest() {
	const t = setupUnauthenticatedTest();
	const seeded = await t.run(async (ctx) => {
		const weddingA = await ctx.db.insert("weddings", {
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5_000_000,
		});
		const couple = await ctx.db.insert("users", { email: COUPLE_EMAIL });
		const superadmin = await ctx.db.insert("users", {
			email: SUPERADMIN_EMAIL,
		});
		await ctx.db.insert("memberships", {
			weddingId: weddingA,
			userId: couple,
			role: "admin",
		});
		return { weddingA, couple, superadmin };
	});
	return {
		t,
		...seeded,
		asCouple: t.withIdentity({
			subject: `${seeded.couple}|s`,
			email: COUPLE_EMAIL,
		}),
		asSuperadmin: t.withIdentity({
			subject: `${seeded.superadmin}|s`,
			email: SUPERADMIN_EMAIL,
		}),
	};
}

beforeEach(() => vi.stubEnv("AUTH_ADMIN_EMAIL", SUPERADMIN_EMAIL));
afterEach(() => vi.unstubAllEnvs());

describe("feedback.submit", () => {
	test("a couple sends feedback tagged with their wedding", async () => {
		const { asCouple, weddingA, t } = await setupFeedbackTest();
		await asCouple.mutation(api.feedback.submit, {
			kind: "sugestao",
			message: "Adoraria um mapa de mesas.",
		});
		const rows = await t.run((ctx) => ctx.db.query("feedback").collect());
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			kind: "sugestao",
			message: "Adoraria um mapa de mesas.",
			weddingId: weddingA,
			email: COUPLE_EMAIL,
		});
	});

	test("rejects an empty message", async () => {
		const { asCouple } = await setupFeedbackTest();
		await expect(
			asCouple.mutation(api.feedback.submit, {
				kind: "problema",
				message: "  ",
			}),
		).rejects.toThrowError(/entender/i);
	});

	test("rejects unauthenticated callers", async () => {
		const { t } = await setupFeedbackTest();
		await expect(
			t.mutation(api.feedback.submit, { kind: "elogio", message: "top!" }),
		).rejects.toThrowError(/autenticado/i);
	});
});

describe("feedback.list", () => {
	test("superadmin reads all feedback newest-first with couple context", async () => {
		const { asCouple, asSuperadmin } = await setupFeedbackTest();
		await asCouple.mutation(api.feedback.submit, {
			kind: "sugestao",
			message: "Primeira",
		});
		await asCouple.mutation(api.feedback.submit, {
			kind: "problema",
			message: "Segunda",
		});
		const rows = await asSuperadmin.query(api.feedback.list, {});
		expect(rows.map((r) => r.message)).toEqual(["Segunda", "Primeira"]);
		expect(rows[0]).toMatchObject({
			coupleNames: "Ana & Bruno",
			email: COUPLE_EMAIL,
		});
	});

	test("is superadmin-only", async () => {
		const { asCouple } = await setupFeedbackTest();
		await expect(asCouple.query(api.feedback.list, {})).rejects.toThrowError(
			/administrador/i,
		);
	});
});
