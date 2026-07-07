import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

describe("guests: invites CRUD", () => {
	it("creates an invite and lists it with empty counts", async () => {
		const t = setupTest();
		await t.mutation(api.guests.createInvite, {
			title: "Família Silva",
			group: "Família da noiva",
			side: "noiva",
		});

		const list = await t.query(api.guests.listInvites, {});
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ title: "Família Silva", side: "noiva" });
		expect(list[0]?.guests).toEqual([]);
		expect(list[0]?.counts.total).toBe(0);
	});

	it("rejects an empty invite title", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.guests.createInvite, { title: "   " }),
		).rejects.toThrow();
	});

	it("removes an invite and cascades its guests", async () => {
		const t = setupTest();
		const inviteId = await t.mutation(api.guests.createInvite, {
			title: "Amigos do trabalho",
		});
		await t.mutation(api.guests.addGuest, { inviteId, name: "Carla" });
		await t.mutation(api.guests.addGuest, { inviteId, name: "Bruno" });

		await t.mutation(api.guests.removeInvite, { id: inviteId });

		expect(await t.query(api.guests.listInvites, {})).toHaveLength(0);
		const orphans = await t.run(async (ctx) =>
			ctx.db
				.query("guests")
				.withIndex("by_invite", (q) => q.eq("inviteId", inviteId))
				.collect(),
		);
		expect(orphans).toHaveLength(0);
	});
});

describe("guests: RSVP tracking", () => {
	it("adds a guest as pendente and confirms it manually", async () => {
		const t = setupTest();
		const inviteId = await t.mutation(api.guests.createInvite, {
			title: "Tios",
		});
		const guestId = await t.mutation(api.guests.addGuest, {
			inviteId,
			name: "Zé",
		});

		let list = await t.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.rsvpStatus).toBe("pendente");

		await t.mutation(api.guests.updateGuest, {
			id: guestId,
			rsvpStatus: "confirmado",
		});

		list = await t.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.rsvpStatus).toBe("confirmado");
		expect(list[0]?.counts).toMatchObject({ confirmed: 1, confirmedAdults: 1 });
	});

	it("aggregates a headcount summary across invites", async () => {
		const t = setupTest();
		const a = await t.mutation(api.guests.createInvite, { title: "A" });
		const b = await t.mutation(api.guests.createInvite, { title: "B" });
		const g1 = await t.mutation(api.guests.addGuest, {
			inviteId: a,
			name: "Ana",
		});
		await t.mutation(api.guests.addGuest, {
			inviteId: b,
			name: "Kid",
			isChild: true,
		});
		await t.mutation(api.guests.updateGuest, {
			id: g1,
			rsvpStatus: "confirmado",
		});

		const summary = await t.query(api.guests.summary, {});
		expect(summary).toMatchObject({
			inviteCount: 2,
			total: 2,
			confirmed: 1,
			pending: 1,
			confirmedAdults: 1,
		});
	});

	it("rejects adding a guest to a missing invite", async () => {
		const t = setupTest();
		const inviteId = await t.mutation(api.guests.createInvite, {
			title: "Temp",
		});
		await t.mutation(api.guests.removeInvite, { id: inviteId });
		await expect(
			t.mutation(api.guests.addGuest, { inviteId, name: "Ninguém" }),
		).rejects.toThrow();
	});
});
