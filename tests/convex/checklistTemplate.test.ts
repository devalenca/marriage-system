import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { CHECKLIST_TEMPLATE } from "../../lib/domain/checklist";
import { addMonthsISO, todayInSaoPaulo } from "../../lib/domain/dates";
import { setupUnauthenticatedTest } from "./helpers";

// The superadmin-curated default checklist (convex/checklistTemplate) and the
// way tasks.generateFromTemplate consumes it — DB rows override the shipped
// constant, and short-timeline weddings are never born overdue.

const SUPERADMIN_EMAIL = "super@example.com";
const ADMIN_EMAIL = "ana@example.com";

async function setup() {
	const t = setupUnauthenticatedTest();
	const seeded = await t.run(async (ctx) => {
		const weddingId = await ctx.db.insert("weddings", {
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5_000_000,
		});
		const admin = await ctx.db.insert("users", { email: ADMIN_EMAIL });
		const superadmin = await ctx.db.insert("users", {
			email: SUPERADMIN_EMAIL,
		});
		await ctx.db.insert("memberships", {
			weddingId,
			userId: admin,
			role: "admin",
		});
		return { weddingId, admin, superadmin };
	});
	return {
		t,
		...seeded,
		asAdmin: t.withIdentity({
			subject: `${seeded.admin}|session`,
			email: ADMIN_EMAIL,
		}),
		asSuperadmin: t.withIdentity({
			subject: `${seeded.superadmin}|session`,
			email: SUPERADMIN_EMAIL,
		}),
	};
}

beforeEach(() => {
	vi.stubEnv("AUTH_ADMIN_EMAIL", SUPERADMIN_EMAIL);
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("checklistTemplate admin", () => {
	test("list, add, remove and seed are superadmin-only", async () => {
		const { asAdmin } = await setup();
		await expect(
			asAdmin.query(api.checklistTemplate.list, {}),
		).rejects.toThrowError();
		await expect(
			asAdmin.mutation(api.checklistTemplate.seedDefault, {}),
		).rejects.toThrowError();
		await expect(
			asAdmin.mutation(api.checklistTemplate.add, {
				title: "X",
				monthsBefore: 3,
				priority: "alta",
			}),
		).rejects.toThrowError();
	});

	test("seedDefault loads the shipped template once, then is a no-op", async () => {
		const { asSuperadmin } = await setup();
		const first = await asSuperadmin.mutation(
			api.checklistTemplate.seedDefault,
			{},
		);
		expect(first.created).toBe(CHECKLIST_TEMPLATE.length);

		const rows = await asSuperadmin.query(api.checklistTemplate.list, {});
		expect(rows).toHaveLength(CHECKLIST_TEMPLATE.length);
		// Sorted soonest-planned first: 12 months before at the top.
		expect(rows[0]?.monthsBefore).toBe(12);

		const second = await asSuperadmin.mutation(
			api.checklistTemplate.seedDefault,
			{},
		);
		expect(second.created).toBe(0);
	});

	test("add appends an item; remove deletes it", async () => {
		const { asSuperadmin } = await setup();
		const id = await asSuperadmin.mutation(api.checklistTemplate.add, {
			title: "Contratar cerimonialista extra",
			monthsBefore: 5,
			priority: "media",
			category: "assessoria",
		});
		let rows = await asSuperadmin.query(api.checklistTemplate.list, {});
		expect(rows.map((r) => r.title)).toContain(
			"Contratar cerimonialista extra",
		);

		await asSuperadmin.mutation(api.checklistTemplate.remove, { id });
		rows = await asSuperadmin.query(api.checklistTemplate.list, {});
		expect(rows.map((r) => r.title)).not.toContain(
			"Contratar cerimonialista extra",
		);
	});

	test("add rejects a blank title", async () => {
		const { asSuperadmin } = await setup();
		await expect(
			asSuperadmin.mutation(api.checklistTemplate.add, {
				title: "   ",
				monthsBefore: 3,
				priority: "alta",
			}),
		).rejects.toThrowError(/título/i);
	});
});

describe("tasks.generateFromTemplate with the curated template", () => {
	test("the couple's checklist follows the DB template, not the constant", async () => {
		const { asSuperadmin, weddingId } = await setup();
		await asSuperadmin.mutation(api.checklistTemplate.seedDefault, {});
		await asSuperadmin.mutation(api.checklistTemplate.add, {
			title: "Alugar gerador de energia",
			monthsBefore: 2,
			priority: "media",
		});

		const result = await asSuperadmin.mutation(api.tasks.generateFromTemplate, {
			weddingId,
			regenerate: true,
		});
		expect(result.created).toBe(CHECKLIST_TEMPLATE.length + 1);

		const tasks = await asSuperadmin.query(api.tasks.list, { weddingId });
		expect(tasks.map((task) => task.title)).toContain(
			"Alugar gerador de energia",
		);
	});

	test("a short-timeline wedding is never born overdue", async () => {
		const { asSuperadmin, weddingId, t } = await setup();
		const today = todayInSaoPaulo();
		// Three months out: the 12/10/8/6-months-before tasks would otherwise
		// land in the past on the day the checklist is created.
		await t.run(async (ctx) => {
			await ctx.db.patch(weddingId, {
				weddingDate: addMonthsISO(today, 3),
			});
		});

		await asSuperadmin.mutation(api.tasks.generateFromTemplate, {
			weddingId,
			regenerate: true,
		});

		const tasks = await asSuperadmin.query(api.tasks.list, { weddingId });
		expect(tasks.length).toBeGreaterThan(0);
		for (const task of tasks) {
			expect(task.dueDate && task.dueDate >= today).toBe(true);
		}
	});
});
