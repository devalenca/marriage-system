import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

const TODAY = "2026-06-09";

async function seed(t: ReturnType<typeof setupTest>) {
	await t.mutation(api.settings.save, {
		coupleNames: "Gabriel & Alice",
		weddingDate: "2027-06-12",
		budgetGoalCents: 5500000,
	});

	const espacoId = await t.mutation(api.vendors.create, {
		name: "Espaço Jardim",
		category: "espaco",
		status: "fechado",
		estimateCents: 2000000,
		contractedCents: 1800000,
	});
	await t.mutation(api.payments.createSchedule, {
		vendorId: espacoId,
		totalCents: 1800000,
		downPaymentCents: 600000,
		installmentsCount: 2,
		downPaymentDate: "2026-05-01", // overdue once pending
		firstInstallmentDate: "2026-06-15", // due soon
	});

	await t.mutation(api.vendors.create, {
		name: "Foto Luz",
		category: "fotografia",
		status: "cotado",
		estimateCents: 800000,
	});

	await t.mutation(api.tasks.create, {
		title: "Tarefa deste mês",
		dueDate: "2026-06-20",
		priority: "alta",
	});
	await t.mutation(api.tasks.create, {
		title: "Tarefa futura",
		dueDate: "2026-08-20",
		priority: "baixa",
	});

	return { espacoId };
}

describe("dashboard.summary", () => {
	it("aggregates finance, countdown, alerts and month tasks", async () => {
		const t = setupTest();
		await seed(t);

		const summary = await t.query(api.dashboard.summary, { today: TODAY });

		expect(summary.settings?.coupleNames).toBe("Gabriel & Alice");
		expect(summary.countdownDays).toBe(368);

		expect(summary.finance.goalCents).toBe(5500000);
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

	it("returns null settings when onboarding has not happened", async () => {
		const t = setupTest();
		const summary = await t.query(api.dashboard.summary, { today: TODAY });
		expect(summary.settings).toBeNull();
		expect(summary.finance.goalCents).toBe(0);
		expect(summary.overdue).toHaveLength(0);
	});

	it("completed tasks do not show up in month tasks", async () => {
		const t = setupTest();
		await seed(t);
		const tasks = await t.query(api.tasks.list, {});
		const monthTask = tasks.find((task) => task.title === "Tarefa deste mês");
		if (!monthTask) throw new Error("missing seed task");
		await t.mutation(api.tasks.update, {
			id: monthTask._id,
			status: "concluida",
		});

		const summary = await t.query(api.dashboard.summary, { today: TODAY });
		expect(summary.monthTasks).toHaveLength(0);
	});
});
