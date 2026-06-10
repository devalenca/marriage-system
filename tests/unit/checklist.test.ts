import { describe, expect, it } from "vitest";
import {
	CHECKLIST_TEMPLATE,
	generateChecklist,
	monthsBeforeLabel,
} from "@/lib/domain/checklist";

const WEDDING_DATE = "2027-06-12";

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
