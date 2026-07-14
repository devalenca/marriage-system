import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { CHECKLIST_TEMPLATE } from "../../lib/domain/checklist";
import { setupWeddingScopedTest } from "./helpers";

describe("tasks CRUD", () => {
	it("creates and lists tasks sorted by due date", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.tasks.create, {
			title: "Provar o bolo",
			dueDate: "2026-09-01",
			priority: "media",
		});
		await asCoupleA.mutation(api.tasks.create, {
			title: "Fechar espaço",
			dueDate: "2026-07-01",
			priority: "alta",
			assignee: "Gabriel",
		});

		const tasks = await asCoupleA.query(api.tasks.list, {});
		expect(tasks.map((task) => task.title)).toEqual([
			"Fechar espaço",
			"Provar o bolo",
		]);
		expect(tasks[0]?.status).toBe("pendente");
	});

	it("rejects an empty title and an invalid due date", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await expect(
			asCoupleA.mutation(api.tasks.create, { title: "  ", priority: "alta" }),
		).rejects.toThrow();
		await expect(
			asCoupleA.mutation(api.tasks.create, {
				title: "Tarefa",
				priority: "alta",
				dueDate: "01/07/2026",
			}),
		).rejects.toThrow();
	});

	it("updates status and fields", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.tasks.create, {
			title: "Enviar convites",
			priority: "alta",
		});

		await asCoupleA.mutation(api.tasks.update, {
			id,
			status: "concluida",
			assignee: "Casal",
		});

		const tasks = await asCoupleA.query(api.tasks.list, {});
		expect(tasks[0]).toMatchObject({
			status: "concluida",
			assignee: "Casal",
		});
	});

	it("removes a task", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.tasks.create, {
			title: "Tarefa temporária",
			priority: "baixa",
		});
		await asCoupleA.mutation(api.tasks.remove, { id });
		expect(await asCoupleA.query(api.tasks.list, {})).toHaveLength(0);
	});
});

describe("tasks.generateFromTemplate", () => {
	it("generates the full checklist from the wedding date", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();

		const result = await asCoupleA.mutation(api.tasks.generateFromTemplate, {});
		expect(result.created).toBe(CHECKLIST_TEMPLATE.length);

		const tasks = await asCoupleA.query(api.tasks.list, {});
		expect(tasks).toHaveLength(CHECKLIST_TEMPLATE.length);
		const espaco = tasks.find((task) => task.title === "Fechar espaço");
		// Wedding A's date is 2027-06-12 → "Fechar espaço" lands 12 months before.
		expect(espaco?.dueDate).toBe("2026-06-12");
		expect(espaco?.isGenerated).toBe(true);
	});

	it("does not duplicate generated tasks on a second run", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();

		await asCoupleA.mutation(api.tasks.generateFromTemplate, {});
		const second = await asCoupleA.mutation(api.tasks.generateFromTemplate, {});
		expect(second.created).toBe(0);

		const tasks = await asCoupleA.query(api.tasks.list, {});
		expect(tasks).toHaveLength(CHECKLIST_TEMPLATE.length);
	});

	it("regenerate replaces pending generated tasks but keeps completed and manual ones", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.tasks.generateFromTemplate, {});

		const tasks = await asCoupleA.query(api.tasks.list, {});
		const done = tasks.find((task) => task.title === "Fechar espaço");
		if (!done) throw new Error("missing generated task");
		await asCoupleA.mutation(api.tasks.update, {
			id: done._id,
			status: "concluida",
		});
		await asCoupleA.mutation(api.tasks.create, {
			title: "Tarefa manual",
			priority: "baixa",
		});

		// New wedding date → regenerate.
		await asCoupleA.mutation(api.weddings.save, {
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-09-25",
			budgetGoalCents: 5_000_000,
		});
		const result = await asCoupleA.mutation(api.tasks.generateFromTemplate, {
			regenerate: true,
		});
		expect(result.created).toBe(CHECKLIST_TEMPLATE.length);

		const after = await asCoupleA.query(api.tasks.list, {});
		// completed generated task + manual task + fresh template
		expect(after).toHaveLength(CHECKLIST_TEMPLATE.length + 2);
		expect(after.some((task) => task.title === "Tarefa manual")).toBe(true);
		const fresh = after.find(
			(task) => task.title === "Fechar espaço" && task.status === "pendente",
		);
		expect(fresh?.dueDate).toBe("2026-09-25");
	});

	it("fails when the wedding no longer exists", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		await t.run(async (ctx) => {
			await ctx.db.delete(weddingA);
		});
		await expect(
			asCoupleA.mutation(api.tasks.generateFromTemplate, {}),
		).rejects.toThrow();
	});
});

describe("tasks wedding isolation", () => {
	it("list only returns the caller wedding's tasks", async () => {
		const { asCoupleA, asCoupleB } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.tasks.create, {
			title: "Tarefa de A",
			priority: "alta",
		});
		await asCoupleB.mutation(api.tasks.create, {
			title: "Tarefa de B",
			priority: "baixa",
		});

		const tasksA = await asCoupleA.query(api.tasks.list, {});
		expect(tasksA.map((task) => task.title)).toEqual(["Tarefa de A"]);
		const tasksB = await asCoupleB.query(api.tasks.list, {});
		expect(tasksB.map((task) => task.title)).toEqual(["Tarefa de B"]);
	});

	it("update fails on another wedding's task exactly like a missing one", async () => {
		const { asCoupleA, asCoupleB } = await setupWeddingScopedTest();
		const foreignId = await asCoupleB.mutation(api.tasks.create, {
			title: "Tarefa de B",
			priority: "media",
		});

		await expect(
			asCoupleA.mutation(api.tasks.update, {
				id: foreignId,
				status: "concluida",
			}),
		).rejects.toThrow("Tarefa não encontrada");

		// Untouched for its owner.
		const tasksB = await asCoupleB.query(api.tasks.list, {});
		expect(tasksB[0]?.status).toBe("pendente");
	});

	it("remove fails on another wedding's task exactly like a missing one", async () => {
		const { asCoupleA, asCoupleB } = await setupWeddingScopedTest();
		const foreignId = await asCoupleB.mutation(api.tasks.create, {
			title: "Tarefa de B",
			priority: "media",
		});

		await expect(
			asCoupleA.mutation(api.tasks.remove, { id: foreignId }),
		).rejects.toThrow("Tarefa não encontrada");
		expect(await asCoupleB.query(api.tasks.list, {})).toHaveLength(1);
	});

	it("generateFromTemplate uses the caller wedding's date and ignores the other wedding's tasks", async () => {
		const { asCoupleA, asCoupleB } = await setupWeddingScopedTest();

		// B already generated its checklist; A's idempotency must not see it.
		await asCoupleB.mutation(api.tasks.generateFromTemplate, {});
		const resultA = await asCoupleA.mutation(
			api.tasks.generateFromTemplate,
			{},
		);
		expect(resultA.created).toBe(CHECKLIST_TEMPLATE.length);

		// Each wedding's tasks follow its own date (A: 2027-06-12, B: 2027-09-25).
		const espacoA = (await asCoupleA.query(api.tasks.list, {})).find(
			(task) => task.title === "Fechar espaço",
		);
		const espacoB = (await asCoupleB.query(api.tasks.list, {})).find(
			(task) => task.title === "Fechar espaço",
		);
		expect(espacoA?.dueDate).toBe("2026-06-12");
		expect(espacoB?.dueDate).toBe("2026-09-25");
	});

	it("regenerate only touches the caller wedding's generated tasks", async () => {
		const { asCoupleA, asCoupleB } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.tasks.generateFromTemplate, {});
		await asCoupleB.mutation(api.tasks.generateFromTemplate, {});

		await asCoupleA.mutation(api.tasks.generateFromTemplate, {
			regenerate: true,
		});

		// B's checklist is intact (no deletions, no duplicates).
		const tasksB = await asCoupleB.query(api.tasks.list, {});
		expect(tasksB).toHaveLength(CHECKLIST_TEMPLATE.length);
		const tasksA = await asCoupleA.query(api.tasks.list, {});
		expect(tasksA).toHaveLength(CHECKLIST_TEMPLATE.length);
	});
});
