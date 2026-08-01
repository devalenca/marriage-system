import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { addDaysISO, todayInSaoPaulo } from "../../lib/domain/dates";
import { setupWeddingScopedTest, stubResend } from "./helpers";

// The daily reminder cron: payment digests on nudge days, subscription
// expiry warnings to admins, both honoring per-user opt-outs.

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

async function seedPendingPayment(
	t: Awaited<ReturnType<typeof setupWeddingScopedTest>>["t"],
	weddingId: Awaited<ReturnType<typeof setupWeddingScopedTest>>["weddingA"],
	dueDate: string,
) {
	await t.run(async (ctx) => {
		const vendorId = await ctx.db.insert("vendors", {
			weddingId,
			name: "Buffet Sabor",
			category: "buffet",
			status: "fechado",
			contractedCents: 1_000_000,
		});
		await ctx.db.insert("payments", {
			weddingId,
			vendorId,
			description: "Parcela 2/4",
			amountCents: 250_000,
			dueDate,
			status: "pendente",
		});
	});
}

describe("notifications.runDailyReminders", () => {
	test("sends a digest when a payment hits a nudge day (D-3)", async () => {
		const sent = stubResend();
		const { t, weddingA } = await setupWeddingScopedTest();
		await seedPendingPayment(t, weddingA, addDaysISO(todayInSaoPaulo(), 3));

		const { sentCount } = await t.action(
			internal.notifications.runDailyReminders,
			{},
		);
		expect(sentCount).toBe(1);
		const digest = sent.find((m) => /vencimentos/i.test(m.subject));
		expect(digest?.to).toBe("ana@example.com");
		expect(digest?.html).toContain("Buffet Sabor");
		expect(digest?.html).toContain("R$");
	});

	test("stays quiet on non-nudge days (D-5)", async () => {
		const sent = stubResend();
		const { t, weddingA } = await setupWeddingScopedTest();
		await seedPendingPayment(t, weddingA, addDaysISO(todayInSaoPaulo(), 5));

		const { sentCount } = await t.action(
			internal.notifications.runDailyReminders,
			{},
		);
		expect(sentCount).toBe(0);
		expect(sent).toHaveLength(0);
	});

	test("honors the payment-reminder opt-out", async () => {
		const sent = stubResend();
		const { t, weddingA, userA } = await setupWeddingScopedTest();
		await seedPendingPayment(t, weddingA, addDaysISO(todayInSaoPaulo(), 1));
		await t.run(async (ctx) => {
			await ctx.db.insert("notificationPrefs", {
				userId: userA,
				paymentReminders: false,
				subscriptionReminders: true,
			});
		});

		const { sentCount } = await t.action(
			internal.notifications.runDailyReminders,
			{},
		);
		expect(sentCount).toBe(0);
		expect(sent).toHaveLength(0);
	});

	test("warns only admins when the subscription is about to expire", async () => {
		const sent = stubResend();
		const { t, weddingA } = await setupWeddingScopedTest();
		await t.run(async (ctx) => {
			await ctx.db.patch(weddingA, {
				subscriptionActiveUntil: addDaysISO(todayInSaoPaulo(), 3),
			});
			// A member of the same wedding — must NOT receive the warning.
			const member = await ctx.db.insert("users", {
				email: "membro@example.com",
			});
			await ctx.db.insert("memberships", {
				weddingId: weddingA,
				userId: member,
				role: "member",
			});
		});

		await t.action(internal.notifications.runDailyReminders, {});
		const warnings = sent.filter((m) => /assinatura/i.test(m.subject));
		expect(warnings.map((m) => m.to)).toEqual(["ana@example.com"]);
	});
});

describe("notifications.sendTestEmail", () => {
	test("delivers a test message to the caller's own address", async () => {
		const sent = stubResend();
		const { asCoupleA } = await setupWeddingScopedTest();

		const result = await asCoupleA.action(api.notifications.sendTestEmail, {});

		expect(result).toEqual({ to: "ana@example.com", delivered: true });
		expect(sent).toHaveLength(1);
		expect(sent[0]?.to).toBe("ana@example.com");
		expect(sent[0]?.subject).toMatch(/teste/i);
	});

	test("reports the no-transport case instead of pretending to send", async () => {
		vi.stubEnv("RESEND_API_KEY", "");
		vi.stubEnv("SMTP_USER", "");
		vi.stubEnv("SMTP_PASSWORD", "");
		const { asCoupleA } = await setupWeddingScopedTest();

		expect(await asCoupleA.action(api.notifications.sendTestEmail, {})).toEqual(
			{
				to: "ana@example.com",
				delivered: false,
			},
		);
	});

	test("rejects anonymous callers", async () => {
		const { t } = await setupWeddingScopedTest();
		await expect(
			t.action(api.notifications.sendTestEmail, {}),
		).rejects.toThrowError(/autenticado/i);
	});

	test("surfaces the transport failure to the caller", async () => {
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ message: "domain not verified" }), {
						status: 403,
					}),
			),
		);
		const { asCoupleA } = await setupWeddingScopedTest();

		await expect(
			asCoupleA.action(api.notifications.sendTestEmail, {}),
		).rejects.toThrowError(/403/);
	});
});

describe("notifications prefs", () => {
	test("default is everything on; saving persists", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		expect(await asCoupleA.query(api.notifications.myPrefs, {})).toEqual({
			paymentReminders: true,
			subscriptionReminders: true,
		});
		await asCoupleA.mutation(api.notifications.savePrefs, {
			paymentReminders: false,
			subscriptionReminders: true,
		});
		expect(await asCoupleA.query(api.notifications.myPrefs, {})).toEqual({
			paymentReminders: false,
			subscriptionReminders: true,
		});
	});
});
