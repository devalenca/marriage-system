import { describe, expect, it } from "vitest";
import {
	CHECKLIST_TEMPLATE,
	generateChecklist,
	isTaskOverdue,
	monthsBeforeLabel,
} from "@/lib/domain/checklist";

const WEDDING_DATE = "2027-06-12";
const TODAY = "2026-07-07";

describe("monthsBeforeLabel", () => {
	it("labels plural months", () => {
		expect(monthsBeforeLabel(12)).toBe("12 meses antes");
		expect(monthsBeforeLabel(3)).toBe("3 meses antes");
	});

	it("labels one month", () => {
		expect(monthsBeforeLabel(1)).toBe("1 mês antes");
	});

	it("labels the wedding month", () => {
		expect(monthsBeforeLabel(0)).toBe("Mês do casamento");
	});
});

describe("CHECKLIST_TEMPLATE", () => {
	it("covers the planning journey from 12 months to the wedding month", () => {
		const buckets = new Set(CHECKLIST_TEMPLATE.map((t) => t.monthsBefore));
		expect(buckets.has(12)).toBe(true);
		expect(buckets.has(6)).toBe(true);
		expect(buckets.has(3)).toBe(true);
		expect(buckets.has(0)).toBe(true);
	});

	it("includes the core contracting tasks", () => {
		const titles = CHECKLIST_TEMPLATE.map((t) => t.title);
		expect(titles).toContain("Fechar espaço");
		expect(titles).toContain("Fechar fotógrafo");
		expect(titles).toContain("Fechar buffet");
	});

	it("every template task has a title and a valid priority", () => {
		for (const task of CHECKLIST_TEMPLATE) {
			expect(task.title.length).toBeGreaterThan(0);
			expect(["alta", "media", "baixa"]).toContain(task.priority);
			expect(task.monthsBefore).toBeGreaterThanOrEqual(0);
			expect(task.monthsBefore).toBeLessThanOrEqual(12);
		}
	});
});

describe("generateChecklist", () => {
	it("derives due dates from the wedding date", () => {
		const tasks = generateChecklist(WEDDING_DATE);
		const espaco = tasks.find((t) => t.title === "Fechar espaço");

		expect(espaco).toBeDefined();
		expect(espaco?.monthsBefore).toBe(12);
		expect(espaco?.dueDate).toBe("2026-06-12");
	});

	it("wedding-month tasks are due on the wedding date", () => {
		const tasks = generateChecklist(WEDDING_DATE);
		const weddingMonth = tasks.filter((t) => t.monthsBefore === 0);

		expect(weddingMonth.length).toBeGreaterThan(0);
		for (const task of weddingMonth) {
			expect(task.dueDate).toBe(WEDDING_DATE);
		}
	});

	it("generates one task per template entry, sorted by due date", () => {
		const tasks = generateChecklist(WEDDING_DATE);
		expect(tasks).toHaveLength(CHECKLIST_TEMPLATE.length);

		const dates = tasks.map((t) => t.dueDate);
		expect(dates).toEqual([...dates].sort());
	});
});

describe("isTaskOverdue", () => {
	it("flags a task due before today that is not done", () => {
		expect(
			isTaskOverdue({ dueDate: "2026-07-06", status: "pendente" }, TODAY),
		).toBe(true);
	});

	it("flags an in-progress task due in the past", () => {
		expect(
			isTaskOverdue({ dueDate: "2026-01-01", status: "em_andamento" }, TODAY),
		).toBe(true);
	});

	it("does not flag a completed task", () => {
		expect(
			isTaskOverdue({ dueDate: "2026-01-01", status: "concluida" }, TODAY),
		).toBe(false);
	});

	it("does not flag a task due today (strict boundary)", () => {
		expect(isTaskOverdue({ dueDate: TODAY, status: "pendente" }, TODAY)).toBe(
			false,
		);
	});

	it("does not flag a task due in the future", () => {
		expect(
			isTaskOverdue({ dueDate: "2026-12-31", status: "pendente" }, TODAY),
		).toBe(false);
	});

	it("does not flag a task without a due date", () => {
		expect(isTaskOverdue({ status: "pendente" }, TODAY)).toBe(false);
		expect(isTaskOverdue({ status: "em_andamento" }, TODAY)).toBe(false);
	});
});

describe("generateChecklist — short timeline (clamp)", () => {
	it("never produces a task due before today when today is given", () => {
		const NEAR = "2027-01-16"; // ~4 months from the TODAY below
		const CLAMP_TODAY = "2026-09-13";
		const tasks = generateChecklist(NEAR, { today: CLAMP_TODAY });
		for (const task of tasks) {
			expect(task.dueDate >= CLAMP_TODAY).toBe(true);
		}
	});

	it("pulls a 12-months-before task up to today", () => {
		const tasks = generateChecklist("2027-01-16", { today: "2026-09-13" });
		const orcamento = tasks.find((t) => t.title === "Definir orçamento total");
		expect(orcamento?.dueDate).toBe("2026-09-13");
	});

	it("leaves future due dates untouched", () => {
		const tasks = generateChecklist("2027-06-12", { today: "2026-07-07" });
		// "Enviar convites" is 3 months before → 2027-03-12, comfortably ahead
		// of the clamp date, so it must be left exactly where it lands.
		const convites = tasks.find((t) => t.title === "Enviar convites");
		expect(convites?.dueDate).toBe("2027-03-12");
	});

	it("accepts an explicit template override", () => {
		const tasks = generateChecklist("2027-06-12", {
			template: [{ title: "Só isso", monthsBefore: 2, priority: "alta" }],
		});
		expect(tasks).toHaveLength(1);
		expect(tasks[0]?.title).toBe("Só isso");
	});
});
