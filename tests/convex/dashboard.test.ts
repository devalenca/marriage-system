import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupWeddingScopedTest } from "./helpers";

const TODAY = "2026-06-09";

type Setup = Awaited<ReturnType<typeof setupWeddingScopedTest>>;

// Dashboard is read-only, so rows are seeded directly (stamped with the
// wedding id) instead of through other modules' mutations.
async function seedWeddingA({ t, weddingA }: Setup) {
	return await t.run(async (ctx) => {
		const espacoId = await ctx.db.insert("vendors", {
			weddingId: weddingA,
			name: "Espaço Jardim",
			category: "espaco",
			status: "fechado",
			estimateCents: 2000000,
			contractedCents: 1800000,
		});
		await ctx.db.insert("payments", {
			weddingId: weddingA,
			vendorId: espacoId,
			description: "Entrada",
			amountCents: 600000,
			dueDate: "2026-05-01", // overdue once pending
			isDownPayment: true,
			status: "pendente",
		});
		await ctx.db.insert("payments", {
			weddingId: weddingA,
			vendorId: espacoId,
			description: "Parcela 1/2",
			amountCents: 600000,
			dueDate: "2026-06-15", // due soon
			status: "pendente",
		});
		await ctx.db.insert("payments", {
			weddingId: weddingA,
			vendorId: espacoId,
			description: "Parcela 2/2",
			amountCents: 600000,
			dueDate: "2026-07-15",
			status: "pendente",
		});

		await ctx.db.insert("vendors", {
			weddingId: weddingA,
			name: "Foto Luz",
			category: "fotografia",
			status: "cotado",
			estimateCents: 800000,
		});

		const monthTaskId = await ctx.db.insert("tasks", {
			weddingId: weddingA,
			title: "Tarefa deste mês",
			dueDate: "2026-06-20",
			priority: "alta",
			status: "pendente",
			isGenerated: false,
		});
		await ctx.db.insert("tasks", {
			weddingId: weddingA,
			title: "Tarefa futura",
			dueDate: "2026-08-20",
			priority: "baixa",
			status: "pendente",
			isGenerated: false,
		});

		return { espacoId, monthTaskId };
	});
}

async function seedWeddingB({ t, weddingB }: Setup) {
	await t.run(async (ctx) => {
		const buffetId = await ctx.db.insert("vendors", {
			weddingId: weddingB,
			name: "Buffet Sabor",
			category: "buffet",
			status: "fechado",
			estimateCents: 3000000,
			contractedCents: 2500000,
		});
		await ctx.db.insert("payments", {
			weddingId: weddingB,
			vendorId: buffetId,
			description: "Entrada",
			amountCents: 1000000,
			dueDate: "2026-05-10", // overdue for wedding B only
			isDownPayment: true,
			status: "pendente",
		});
		await ctx.db.insert("tasks", {
			weddingId: weddingB,
			title: "Tarefa do casal B",
			dueDate: "2026-06-25",
			priority: "media",
			status: "pendente",
			isGenerated: false,
		});
	});
}

describe("dashboard.summary", () => {
	it("aggregates finance, countdown, alerts and month tasks", async () => {
		const setup = await setupWeddingScopedTest();
		await seedWeddingA(setup);

		const summary = await setup.asCoupleA.query(api.dashboard.summary, {
			today: TODAY,
		});

		expect(summary.settings?.coupleNames).toBe("Ana & Bruno");
		expect(summary.countdownDays).toBe(368);

		expect(summary.finance.goalCents).toBe(5000000);
		expect(summary.finance.plannedCents).toBe(2600000);
		expect(summary.finance.contractedCents).toBe(1800000);
		expect(summary.finance.paidCents).toBe(0);

		// Down payment from 2026-05-01 is overdue; 2026-06-15 is due soon.
		expect(summary.overdue).toHaveLength(1);
		expect(summary.overdue[0]).toMatchObject({
			vendorName: "Espaço Jardim",
			description: "Entrada",
		});
		expect(summary.dueSoon).toHaveLength(1);
		expect(summary.dueSoon[0]?.dueDate).toBe("2026-06-15");

		expect(summary.monthTasks.map((task) => task.title)).toEqual([
			"Tarefa deste mês",
		]);

		expect(summary.categories[0]).toMatchObject({
			category: "espaco",
			contractedCents: 1800000,
		});
	});

	it("returns the wedding settings and empty aggregates before any data", async () => {
		const setup = await setupWeddingScopedTest();
		const summary = await setup.asCoupleA.query(api.dashboard.summary, {
			today: TODAY,
		});
		expect(summary.settings?.coupleNames).toBe("Ana & Bruno");
		expect(summary.finance.goalCents).toBe(5000000);
		expect(summary.finance.plannedCents).toBe(0);
		expect(summary.overdue).toHaveLength(0);
		expect(summary.dueSoon).toHaveLength(0);
		expect(summary.monthTasks).toHaveLength(0);
	});

	it("completed tasks do not show up in month tasks", async () => {
		const setup = await setupWeddingScopedTest();
		const { monthTaskId } = await seedWeddingA(setup);
		await setup.t.run(async (ctx) => {
			await ctx.db.patch(monthTaskId, { status: "concluida" });
		});

		const summary = await setup.asCoupleA.query(api.dashboard.summary, {
			today: TODAY,
		});
		expect(summary.monthTasks).toHaveLength(0);
	});

	it("rejects anonymous callers", async () => {
		const setup = await setupWeddingScopedTest();
		await expect(
			setup.t.query(api.dashboard.summary, { today: TODAY }),
		).rejects.toThrow("Não autenticado");
	});

	describe("tenant isolation", () => {
		it("only counts the caller's wedding when both weddings have data", async () => {
			const setup = await setupWeddingScopedTest();
			await seedWeddingA(setup);
			await seedWeddingB(setup);

			const summaryA = await setup.asCoupleA.query(api.dashboard.summary, {
				today: TODAY,
			});
			expect(summaryA.settings?.coupleNames).toBe("Ana & Bruno");
			expect(summaryA.finance.goalCents).toBe(5000000);
			// B's contracted buffet (2.5M) must not leak into A's totals.
			expect(summaryA.finance.plannedCents).toBe(2600000);
			expect(summaryA.finance.contractedCents).toBe(1800000);
			expect(summaryA.overdue.map((p) => p.vendorName)).toEqual([
				"Espaço Jardim",
			]);
			expect(summaryA.monthTasks.map((task) => task.title)).toEqual([
				"Tarefa deste mês",
			]);
			expect(summaryA.categories.some((c) => c.category === "buffet")).toBe(
				false,
			);

			const summaryB = await setup.asCoupleB.query(api.dashboard.summary, {
				today: TODAY,
			});
			expect(summaryB.settings?.coupleNames).toBe("Carla & Diego");
			expect(summaryB.finance.goalCents).toBe(8000000);
			expect(summaryB.finance.contractedCents).toBe(2500000);
			expect(summaryB.overdue.map((p) => p.vendorName)).toEqual([
				"Buffet Sabor",
			]);
			expect(summaryB.monthTasks.map((task) => task.title)).toEqual([
				"Tarefa do casal B",
			]);
		});
	});
});
