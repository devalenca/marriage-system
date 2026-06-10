import { v } from "convex/values";
import { generateChecklist } from "../lib/domain/checklist";
import { isValidISODate } from "../lib/domain/dates";
import { mutation, query } from "./_generated/server";
import {
	vendorCategoryValidator as categoryValidator,
	taskPriorityValidator as priorityValidator,
	taskStatusValidator as statusValidator,
} from "./lib/validators";

function validateTaskFields(args: { title?: string; dueDate?: string }) {
	if (args.title !== undefined && args.title.trim().length === 0) {
		throw new Error("Informe o título da tarefa");
	}
	if (args.dueDate !== undefined && !isValidISODate(args.dueDate)) {
		throw new Error("Prazo inválido");
	}
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const tasks = await ctx.db.query("tasks").collect();
		// Due-dated tasks first (soonest on top), undated ones at the end.
		return tasks.sort((a, b) => {
			if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
			if (a.dueDate) return -1;
			if (b.dueDate) return 1;
			return a._creationTime - b._creationTime;
		});
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		notes: v.optional(v.string()),
		dueDate: v.optional(v.string()),
		priority: priorityValidator,
		assignee: v.optional(v.string()),
		category: v.optional(categoryValidator),
	},
	handler: async (ctx, args) => {
		validateTaskFields(args);
		return await ctx.db.insert("tasks", {
			...args,
			status: "pendente",
			isGenerated: false,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("tasks"),
		title: v.optional(v.string()),
		notes: v.optional(v.string()),
		dueDate: v.optional(v.string()),
		priority: v.optional(priorityValidator),
		assignee: v.optional(v.string()),
		status: v.optional(statusValidator),
		category: v.optional(categoryValidator),
	},
	handler: async (ctx, { id, ...patch }) => {
		const task = await ctx.db.get(id);
		if (!task) throw new Error("Tarefa não encontrada");
		validateTaskFields(patch);
		await ctx.db.patch(id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("tasks") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	},
});

/**
 * Instantiates the month-by-month checklist template against the wedding
 * date. Idempotent by default; `regenerate` replaces pending generated
 * tasks (completed and manual tasks are always preserved).
 */
export const generateFromTemplate = mutation({
	args: { regenerate: v.optional(v.boolean()) },
	handler: async (ctx, { regenerate }) => {
		const settings = await ctx.db.query("settings").first();
		if (!settings) {
			throw new Error(
				"Configure a data do casamento antes de gerar o checklist",
			);
		}

		const existing = await ctx.db.query("tasks").collect();
		const generated = existing.filter((task) => task.isGenerated);

		if (generated.length > 0 && !regenerate) {
			return { created: 0 };
		}

		for (const task of generated) {
			if (task.status === "pendente") {
				await ctx.db.delete(task._id);
			}
		}

		const checklist = generateChecklist(settings.weddingDate);
		for (const task of checklist) {
			await ctx.db.insert("tasks", {
				title: task.title,
				dueDate: task.dueDate,
				monthsBefore: task.monthsBefore,
				priority: task.priority,
				category: task.category,
				status: "pendente",
				isGenerated: true,
			});
		}

		return { created: checklist.length };
	},
});
