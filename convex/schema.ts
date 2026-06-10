import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	attachmentKindValidator,
	taskPriorityValidator,
	taskStatusValidator,
	vendorCategoryValidator,
	vendorStatusValidator,
} from "./lib/validators";

export default defineSchema({
	// Singleton: the couple's wedding configuration.
	settings: defineTable({
		coupleNames: v.string(),
		weddingDate: v.string(), // ISO yyyy-MM-dd (America/Sao_Paulo)
		budgetGoalCents: v.number(),
	}),

	vendors: defineTable({
		name: v.string(),
		category: vendorCategoryValidator,
		status: vendorStatusValidator,
		contactName: v.optional(v.string()),
		phone: v.optional(v.string()),
		instagram: v.optional(v.string()),
		website: v.optional(v.string()),
		notes: v.optional(v.string()),
		estimateCents: v.optional(v.number()),
		contractedCents: v.optional(v.number()),
		closedDate: v.optional(v.string()), // ISO
		paymentMethod: v.optional(v.string()),
		links: v.optional(
			v.array(v.object({ label: v.string(), url: v.string() })),
		),
	}),

	payments: defineTable({
		vendorId: v.id("vendors"),
		description: v.string(),
		amountCents: v.number(),
		dueDate: v.string(), // ISO
		isDownPayment: v.optional(v.boolean()),
		status: v.union(v.literal("pendente"), v.literal("pago")),
		paidDate: v.optional(v.string()), // ISO, real payment date
		paymentMethod: v.optional(v.string()), // free text (e.g. "PIX", "Cartão 3x")
	})
		.index("by_vendor", ["vendorId"])
		.index("by_status_dueDate", ["status", "dueDate"]),

	// Uploaded files (Convex storage): a contract on a vendor or a receipt on
	// a payment. Exactly one of vendorId / paymentId is set.
	attachments: defineTable({
		vendorId: v.optional(v.id("vendors")),
		paymentId: v.optional(v.id("payments")),
		storageId: v.id("_storage"),
		name: v.string(),
		kind: attachmentKindValidator,
		mimeType: v.optional(v.string()),
		sizeBytes: v.optional(v.number()),
		uploadedAt: v.number(), // epoch ms
	})
		.index("by_vendor", ["vendorId"])
		.index("by_payment", ["paymentId"]),

	tasks: defineTable({
		title: v.string(),
		notes: v.optional(v.string()),
		dueDate: v.optional(v.string()), // ISO
		monthsBefore: v.optional(v.number()),
		priority: taskPriorityValidator,
		assignee: v.optional(v.string()),
		status: taskStatusValidator,
		category: v.optional(vendorCategoryValidator),
		isGenerated: v.boolean(),
	}),
});
