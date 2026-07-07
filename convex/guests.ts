import { v } from "convex/values";
import { guestCounts } from "../lib/domain/guests";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { authedMutation as mutation, authedQuery as query } from "./lib/auth";
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
			ctx.db.query("invites").collect(),
			ctx.db.query("guests").collect(),
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
			ctx.db.query("invites").collect(),
			ctx.db.query("guests").collect(),
		]);
		return { inviteCount: invites.length, ...guestCounts(guests) };
	},
});

export const createInvite = mutation({
	args: { title: v.string(), ...inviteOptionalFields },
	handler: async (ctx, args) => {
		requireName(args.title, "Informe o nome do convite");
		return await ctx.db.insert("invites", args);
	},
});

export const updateInvite = mutation({
	args: {
		id: v.id("invites"),
		title: v.optional(v.string()),
		...inviteOptionalFields,
	},
	handler: async (ctx, { id, ...patch }) => {
		const invite = await ctx.db.get(id);
		if (!invite) throw new Error("Convite não encontrado");
		requireName(patch.title, "Informe o nome do convite");
		await ctx.db.patch(id, patch);
	},
});

export const removeInvite = mutation({
	args: { id: v.id("invites") },
	handler: async (ctx, { id }) => {
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
		const invite = await ctx.db.get(args.inviteId);
		if (!invite) throw new Error("Convite não encontrado");
		requireName(args.name, "Informe o nome do convidado");
		return await ctx.db.insert("guests", { ...args, rsvpStatus: "pendente" });
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
		const guest = await ctx.db.get(id);
		if (!guest) throw new Error("Convidado não encontrado");
		requireName(patch.name, "Informe o nome do convidado");
		await ctx.db.patch(id, patch);
	},
});

export const removeGuest = mutation({
	args: { id: v.id("guests") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
	},
});
