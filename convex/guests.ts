import { v } from "convex/values";
import { guestCounts } from "../lib/domain/guests";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { weddingMutation as mutation, weddingQuery as query } from "./lib/auth";
import { getOwned } from "./lib/db";
import { inviteSideValidator, rsvpStatusValidator } from "./lib/validators";

const inviteOptionalFields = {
	group: v.optional(v.string()),
	side: v.optional(inviteSideValidator),
	phone: v.optional(v.string()),
	notes: v.optional(v.string()),
};

function requireName(value: string | undefined, message: string) {
	if (value !== undefined && value.trim().length === 0) {
		throw new Error(message);
	}
}

// Callers must only pass invite ids that were already ownership-checked
// (via getOwned) — the by_invite index itself does not enforce tenancy.
async function guestsOf(
	ctx: QueryCtx,
	inviteId: Id<"invites">,
): Promise<Doc<"guests">[]> {
	return await ctx.db
		.query("guests")
		.withIndex("by_invite", (q) => q.eq("inviteId", inviteId))
		.collect();
}

/** Every invite with its guests and RSVP counts, sorted by title. */
export const listInvites = query({
	args: {},
	handler: async (ctx) => {
		const [invites, allGuests] = await Promise.all([
			ctx.db
				.query("invites")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("guests")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);

		const byInvite = new Map<Id<"invites">, Doc<"guests">[]>();
		for (const guest of allGuests) {
			const list = byInvite.get(guest.inviteId) ?? [];
			list.push(guest);
			byInvite.set(guest.inviteId, list);
		}

		return invites
			.map((invite) => {
				const guests = (byInvite.get(invite._id) ?? []).sort((a, b) =>
					a.name.localeCompare(b.name),
				);
				return { ...invite, guests, counts: guestCounts(guests) };
			})
			.sort((a, b) => a.title.localeCompare(b.title));
	},
});

/** Overall guest headcount across all invites — used by the dashboard card. */
export const summary = query({
	args: {},
	handler: async (ctx) => {
		const [invites, guests] = await Promise.all([
			ctx.db
				.query("invites")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
			ctx.db
				.query("guests")
				.withIndex("by_wedding", (q) => q.eq("weddingId", ctx.weddingId))
				.collect(),
		]);
		return { inviteCount: invites.length, ...guestCounts(guests) };
	},
});

export const createInvite = mutation({
	args: { title: v.string(), ...inviteOptionalFields },
	handler: async (ctx, args) => {
		requireName(args.title, "Informe o nome do convite");
		return await ctx.db.insert("invites", {
			...args,
			weddingId: ctx.weddingId,
		});
	},
});

export const updateInvite = mutation({
	args: {
		id: v.id("invites"),
		title: v.optional(v.string()),
		...inviteOptionalFields,
	},
	handler: async (ctx, { id, ...patch }) => {
		const invite = await getOwned(ctx, "invites", id);
		if (!invite) throw new Error("Convite não encontrado");
		requireName(patch.title, "Informe o nome do convite");
		await ctx.db.patch(id, patch);
	},
});

export const removeInvite = mutation({
	args: { id: v.id("invites") },
	handler: async (ctx, { id }) => {
		const invite = await getOwned(ctx, "invites", id);
		if (!invite) throw new Error("Convite não encontrado");
		for (const guest of await guestsOf(ctx, id)) {
			await ctx.db.delete(guest._id);
		}
		await ctx.db.delete(id);
	},
});

export const addGuest = mutation({
	args: {
		inviteId: v.id("invites"),
		name: v.string(),
		isChild: v.optional(v.boolean()),
		mealNotes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const invite = await getOwned(ctx, "invites", args.inviteId);
		if (!invite) throw new Error("Convite não encontrado");
		requireName(args.name, "Informe o nome do convidado");
		return await ctx.db.insert("guests", {
			...args,
			rsvpStatus: "pendente",
			weddingId: ctx.weddingId,
		});
	},
});

export const updateGuest = mutation({
	args: {
		id: v.id("guests"),
		name: v.optional(v.string()),
		rsvpStatus: v.optional(rsvpStatusValidator),
		isChild: v.optional(v.boolean()),
		mealNotes: v.optional(v.string()),
	},
	handler: async (ctx, { id, ...patch }) => {
		const guest = await getOwned(ctx, "guests", id);
		if (!guest) throw new Error("Convidado não encontrado");
		requireName(patch.name, "Informe o nome do convidado");
		// A guest who is no longer confirmed can't be checked in — clear stale state.
		const clearCheckIn =
			patch.rsvpStatus !== undefined && patch.rsvpStatus !== "confirmado";
		await ctx.db.patch(
			id,
			clearCheckIn ? { ...patch, checkedIn: false } : patch,
		);
	},
});

export const setCheckIn = mutation({
	args: { id: v.id("guests"), checkedIn: v.boolean() },
	handler: async (ctx, { id, checkedIn }) => {
		const guest = await getOwned(ctx, "guests", id);
		if (!guest) throw new Error("Convidado não encontrado");
		await ctx.db.patch(id, { checkedIn });
	},
});

export const removeGuest = mutation({
	args: { id: v.id("guests") },
	handler: async (ctx, { id }) => {
		const guest = await getOwned(ctx, "guests", id);
		if (!guest) throw new Error("Convidado não encontrado");
		await ctx.db.delete(id);
	},
});
