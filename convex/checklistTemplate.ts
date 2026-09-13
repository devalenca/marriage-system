import { v } from "convex/values";
import {
	CHECKLIST_TEMPLATE,
	type ChecklistTemplateTask,
} from "../lib/domain/checklist";
import type { Doc } from "./_generated/dataModel";
import { superadminMutation, superadminQuery } from "./lib/auth";
import {
	taskPriorityValidator,
	vendorCategoryValidator,
} from "./lib/validators";

// The platform-wide default checklist, curated by the superadmin in /admin.
// tasks.generateFromTemplate reads these rows to build each couple's
// checklist, falling back to the shipped CHECKLIST_TEMPLATE when empty.

const MAX_MONTHS_BEFORE = 24;

/**
 * Admin-list order: soonest-planned first (12 months down to the wedding
 * month), ties broken by insertion order. Couples' own tasks sort by due
 * date instead — this order only shapes the template editor.
 */
export function sortTemplateRows(
	rows: Doc<"checklistTemplate">[],
): Doc<"checklistTemplate">[] {
	return [...rows].sort(
		(a, b) => b.monthsBefore - a.monthsBefore || a.order - b.order,
	);
}

export function rowToTemplateTask(
	row: Doc<"checklistTemplate">,
): ChecklistTemplateTask {
	return {
		title: row.title,
		monthsBefore: row.monthsBefore,
		priority: row.priority,
		category: row.category,
	};
}

export const list = superadminQuery({
	args: {},
	handler: async (ctx) =>
		sortTemplateRows(await ctx.db.query("checklistTemplate").collect()),
});

export const add = superadminMutation({
	args: {
		title: v.string(),
		monthsBefore: v.number(),
		priority: taskPriorityValidator,
		category: v.optional(vendorCategoryValidator),
	},
	handler: async (ctx, args) => {
		const title = args.title.trim();
		if (title.length === 0) throw new Error("Informe o título da tarefa");
		if (
			!Number.isInteger(args.monthsBefore) ||
			args.monthsBefore < 0 ||
			args.monthsBefore > MAX_MONTHS_BEFORE
		) {
			throw new Error("Meses de antecedência inválido");
		}
		const rows = await ctx.db.query("checklistTemplate").collect();
		const order = rows.reduce((max, row) => Math.max(max, row.order), 0) + 1;
		return await ctx.db.insert("checklistTemplate", {
			title,
			monthsBefore: args.monthsBefore,
			priority: args.priority,
			category: args.category,
			order,
		});
	},
});

export const remove = superadminMutation({
	args: { id: v.id("checklistTemplate") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	},
});

/**
 * Copies the shipped default into the editable table, once — the starting
 * point for curation. No-op when the table already has rows, so it can't
 * clobber the superadmin's edits.
 */
export const seedDefault = superadminMutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query("checklistTemplate").collect();
		if (existing.length > 0) return { created: 0 };
		let order = 0;
		for (const task of CHECKLIST_TEMPLATE) {
			await ctx.db.insert("checklistTemplate", {
				title: task.title,
				monthsBefore: task.monthsBefore,
				priority: task.priority,
				category: task.category,
				order: order++,
			});
		}
		return { created: CHECKLIST_TEMPLATE.length };
	},
});
