import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	attachmentKindValidator,
	inviteSideValidator,
	membershipRoleValidator,
	rsvpStatusValidator,
	taskPriorityValidator,
	taskStatusValidator,
	vendorCategoryValidator,
	vendorStatusValidator,
	weddingFieldValidators,
} from "./lib/validators";

export default defineSchema({
	// Convex Auth: users, sessions, accounts (password provider).
	...authTables,

	// Legacy singleton, superseded by `weddings`. Kept until the migration to
	// multi-tenancy runs everywhere; feature code must not read it anymore.
	settings: defineTable({
		coupleNames: v.string(),
		weddingDate: v.string(), // ISO yyyy-MM-dd (America/Sao_Paulo)
		budgetGoalCents: v.number(),
		ceremonyVenue: v.optional(v.string()),
		receptionVenue: v.optional(v.string()),
		weddingTime: v.optional(v.string()), // ISO HH:mm (24h), America/Sao_Paulo
	}),

	// One tenant: a couple's wedding. Every data row below carries weddingId
	// (optional only during the expand/backfill window — PR 2 makes it
	// required once migrations.toMultiTenant has run on every deployment).
	// subscriptionActiveUntil is set by the superadmin only (never via
	// weddings.save); missing = unlimited (grandfathered/comped).
	weddings: defineTable({
		...weddingFieldValidators,
		subscriptionActiveUntil: v.optional(v.string()), // ISO yyyy-MM-dd
		theme: v.optional(v.string()), // accent theme id (see lib/domain/themes)
		termsAcceptedAt: v.optional(v.number()), // epoch ms, set at self-signup
	}),

	// Links a user to a wedding. A user belongs to exactly one wedding today;
	// the superadmin (AUTH_ADMIN_EMAIL) reaches any wedding without one.
	memberships: defineTable({
		weddingId: v.id("weddings"),
		userId: v.id("users"),
		role: membershipRoleValidator,
	})
		.index("by_user", ["userId"])
		.index("by_wedding_user", ["weddingId", "userId"]),

	vendors: defineTable({
		weddingId: v.optional(v.id("weddings")),
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
	}).index("by_wedding", ["weddingId"]),

	payments: defineTable({
		weddingId: v.optional(v.id("weddings")),
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
		.index("by_status_dueDate", ["status", "dueDate"])
		.index("by_wedding", ["weddingId"]),

	// Uploaded files (Convex storage): a contract on a vendor or a receipt on
	// a payment. Exactly one of vendorId / paymentId is set.
	attachments: defineTable({
		weddingId: v.optional(v.id("weddings")),
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
		.index("by_payment", ["paymentId"])
		.index("by_wedding", ["weddingId"]),

	// Inspirações: named moodboards, each holding uploaded reference images.
	galleries: defineTable({
		weddingId: v.optional(v.id("weddings")),
		name: v.string(),
	}).index("by_wedding", ["weddingId"]),

	inspirationImages: defineTable({
		weddingId: v.optional(v.id("weddings")),
		galleryId: v.id("galleries"),
		storageId: v.id("_storage"),
		caption: v.optional(v.string()),
		uploadedAt: v.number(), // epoch ms
	})
		.index("by_gallery", ["galleryId"])
		.index("by_wedding", ["weddingId"]),

	// An invitation addressed to a household/party. Groups one or more guests.
	invites: defineTable({
		weddingId: v.optional(v.id("weddings")),
		title: v.string(),
		group: v.optional(v.string()), // free-text grouping (e.g. "Família da noiva")
		side: v.optional(inviteSideValidator),
		phone: v.optional(v.string()),
		notes: v.optional(v.string()),
	}).index("by_wedding", ["weddingId"]),

	// A single person under an invite. RSVP is confirmed manually by the couple.
	guests: defineTable({
		weddingId: v.optional(v.id("weddings")),
		inviteId: v.id("invites"),
		name: v.string(),
		rsvpStatus: rsvpStatusValidator,
		isChild: v.optional(v.boolean()),
		mealNotes: v.optional(v.string()),
		checkedIn: v.optional(v.boolean()), // day-of attendance
	})
		.index("by_invite", ["inviteId"])
		.index("by_rsvpStatus", ["rsvpStatus"])
		.index("by_wedding", ["weddingId"]),

	tasks: defineTable({
		weddingId: v.optional(v.id("weddings")),
		title: v.string(),
		notes: v.optional(v.string()),
		dueDate: v.optional(v.string()), // ISO
		monthsBefore: v.optional(v.number()),
		priority: taskPriorityValidator,
		assignee: v.optional(v.string()),
		status: taskStatusValidator,
		category: v.optional(vendorCategoryValidator),
		isGenerated: v.boolean(),
	}).index("by_wedding", ["weddingId"]),
});
