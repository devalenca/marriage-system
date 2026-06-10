import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { CHECKLIST_TEMPLATE } from "../../lib/domain/checklist";
import { setupTest } from "./helpers";

describe("tasks CRUD", () => {
	it("creates and lists tasks sorted by due date", async () => {
		const t = setupTest();
		await t.mutation(api.tasks.create, {
			title: "Provar o bolo",
			dueDate: "2026-09-01",
			priority: "media",
		});
		await t.mutation(api.tasks.create, {
			title: "Fechar espaço",
			dueDate: "2026-07-01",
			priority: "alta",
			assignee: "Gabriel",
		});

		const tasks = await t.query(api.tasks.list, {});
		expect(tasks.map((task) => task.title)).toEqual([
			"Fechar espaço",
			"Provar o bolo",
		]);
		expect(tasks[0]?.status).toBe("pendente");
	});

	it("rejects an empty title and an invalid due date", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.tasks.create, { title: "  ", priority: "alta" }),
		).rejects.toThrow();
		await expect(
			t.mutation(api.tasks.create, {
				title: "Tarefa",
				priority: "alta",
				dueDate: "01/07/2026",
			}),
		).rejects.toThrow();
	});

	it("updates status and fields", async () => {
		const t = setupTest();
		const id = await t.mutation(api.tasks.create, {
			title: "Enviar convites",
			priority: "alta",
		});

		await t.mutation(api.tasks.update, {
			id,
			status: "concluida",
			assignee: "Casal",
		});

		const tasks = await t.query(api.tasks.list, {});
		expect(tasks[0]).toMatchObject({
			status: "concluida",
			assignee: "Casal",
		});
	});

	it("removes a task", async () => {
		const t = setupTest();
		const id = await t.mutation(api.tasks.create, {
			title: "Tarefa temporária",
			priority: "baixa",
		});
		await t.mutation(api.tasks.remove, { id });
		expect(await t.query(api.tasks.list, {})).toHaveLength(0);
	});
});

describe("tasks.generateFromTemplate", () => {
	it("generates the full checklist from the wedding date", async () => {
		const t = setupTest();
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		});

		const result = await t.mutation(api.tasks.generateFromTemplate, {});
		expect(result.created).toBe(CHECKLIST_TEMPLATE.length);

		const tasks = await t.query(api.tasks.list, {});
		expect(tasks).toHaveLength(CHECKLIST_TEMPLATE.length);
		const espaco = tasks.find((task) => task.title === "Fechar espaço");
		expect(espaco?.dueDate).toBe("2026-06-12");
		expect(espaco?.isGenerated).toBe(true);
	});

	it("does not duplicate generated tasks on a second run", async () => {
		const t = setupTest();
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		});

		await t.mutation(api.tasks.generateFromTemplate, {});
		const second = await t.mutation(api.tasks.generateFromTemplate, {});
		expect(second.created).toBe(0);

		const tasks = await t.query(api.tasks.list, {});
		expect(tasks).toHaveLength(CHECKLIST_TEMPLATE.length);
	});

	it("regenerate replaces pending generated tasks but keeps completed and manual ones", async () => {
		const t = setupTest();
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		});
		await t.mutation(api.tasks.generateFromTemplate, {});

		const tasks = await t.query(api.tasks.list, {});
		const done = tasks.find((task) => task.title === "Fechar espaço");
		if (!done) throw new Error("missing generated task");
		await t.mutation(api.tasks.update, { id: done._id, status: "concluida" });
		await t.mutation(api.tasks.create, {
			title: "Tarefa manual",
			priority: "baixa",
		});

		// New wedding date → regenerate.
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-09-25",
			budgetGoalCents: 5500000,
		});
		const result = await t.mutation(api.tasks.generateFromTemplate, {
			regenerate: true,
		});
		expect(result.created).toBe(CHECKLIST_TEMPLATE.length);

		const after = await t.query(api.tasks.list, {});
		// completed generated task + manual task + fresh template
		expect(after).toHaveLength(CHECKLIST_TEMPLATE.length + 2);
		expect(after.some((task) => task.title === "Tarefa manual")).toBe(true);
		const fresh = after.find(
			(task) => task.title === "Fechar espaço" && task.status === "pendente",
		);
		expect(fresh?.dueDate).toBe("2026-09-25");
	});

	it("fails when settings are missing", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.tasks.generateFromTemplate, {}),
		).rejects.toThrow();
	});
});
