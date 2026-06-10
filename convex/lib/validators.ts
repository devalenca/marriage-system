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

function literalUnion<T extends string>(
	values: readonly T[],
): Validator<T, "required", never> {
	const literals = values.map((value) => v.literal(value));
	// biome-ignore lint/suspicious/noExplicitAny: v.union needs a static tuple type; runtime shape is correct
	return (v.union as (...args: any[]) => any)(...literals);
}

export const vendorCategoryValidator = literalUnion(VENDOR_CATEGORIES);
export const vendorStatusValidator = literalUnion(VENDOR_STATUSES);
export const taskPriorityValidator = literalUnion(TASK_PRIORITIES);
export const taskStatusValidator = literalUnion(TASK_STATUSES);
export const attachmentKindValidator = literalUnion(ATTACHMENT_KINDS);
