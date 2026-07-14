// Convex validators derived from the domain enums in lib/domain/categories.ts
// — the single source of truth. Adding a category/status only touches there.

import { type Validator, v } from "convex/values";
import {
	ATTACHMENT_KINDS,
	TASK_PRIORITIES,
	TASK_STATUSES,
	VENDOR_CATEGORIES,
	VENDOR_STATUSES,
} from "../../lib/domain/categories";
import { INVITE_SIDES, RSVP_STATUSES } from "../../lib/domain/guests";

function literalUnion<T extends string>(
	values: readonly T[],
): Validator<T, "required", never> {
	const literals = values.map((value) => v.literal(value));
	// biome-ignore lint/suspicious/noExplicitAny: v.union needs a static tuple type; runtime shape is correct
	return (v.union as (...args: any[]) => any)(...literals);
}

/** Role of a user inside a wedding: admin manages accesses, member uses it. */
export const membershipRoleValidator = literalUnion([
	"admin",
	"member",
] as const);

// A wedding's editable fields — the single source shared by the weddings
// table definition and the weddings mutations (schema and args can't drift).
export const weddingFieldValidators = {
	coupleNames: v.string(),
	weddingDate: v.string(), // ISO yyyy-MM-dd (America/Sao_Paulo)
	budgetGoalCents: v.number(),
	ceremonyVenue: v.optional(v.string()),
	receptionVenue: v.optional(v.string()),
	weddingTime: v.optional(v.string()), // ISO HH:mm (24h), America/Sao_Paulo
};

export const vendorCategoryValidator = literalUnion(VENDOR_CATEGORIES);
export const vendorStatusValidator = literalUnion(VENDOR_STATUSES);
export const taskPriorityValidator = literalUnion(TASK_PRIORITIES);
export const taskStatusValidator = literalUnion(TASK_STATUSES);
export const attachmentKindValidator = literalUnion(ATTACHMENT_KINDS);
export const rsvpStatusValidator = literalUnion(RSVP_STATUSES);
export const inviteSideValidator = literalUnion(INVITE_SIDES);
