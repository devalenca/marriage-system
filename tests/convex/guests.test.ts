import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupWeddingScopedTest } from "./helpers";

describe("guests: invites CRUD", () => {
	it("creates an invite and lists it with empty counts", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.guests.createInvite, {
			title: "Família Silva",
			group: "Família da noiva",
			side: "noiva",
		});

		const list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ title: "Família Silva", side: "noiva" });
		expect(list[0]?.guests).toEqual([]);
		expect(list[0]?.counts.total).toBe(0);
	});

	it("rejects an empty invite title", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await expect(
			asCoupleA.mutation(api.guests.createInvite, { title: "   " }),
		).rejects.toThrow();
	});

	it("updates an invite's fields", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Primos",
		});

		await asCoupleA.mutation(api.guests.updateInvite, {
			id: inviteId,
			title: "Primos de Recife",
			side: "noivo",
		});

		const list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]).toMatchObject({
			title: "Primos de Recife",
			side: "noivo",
		});
	});

	it("removes an invite and cascades its guests", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Amigos do trabalho",
		});
		await asCoupleA.mutation(api.guests.addGuest, { inviteId, name: "Carla" });
		await asCoupleA.mutation(api.guests.addGuest, { inviteId, name: "Bruno" });

		await asCoupleA.mutation(api.guests.removeInvite, { id: inviteId });

		expect(await asCoupleA.query(api.guests.listInvites, {})).toHaveLength(0);
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
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Tios",
		});
		const guestId = await asCoupleA.mutation(api.guests.addGuest, {
			inviteId,
			name: "Zé",
		});

		let list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.rsvpStatus).toBe("pendente");

		await asCoupleA.mutation(api.guests.updateGuest, {
			id: guestId,
			rsvpStatus: "confirmado",
		});

		list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.rsvpStatus).toBe("confirmado");
		expect(list[0]?.counts).toMatchObject({ confirmed: 1, confirmedAdults: 1 });
	});

	it("aggregates a headcount summary across invites", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const a = await asCoupleA.mutation(api.guests.createInvite, { title: "A" });
		const b = await asCoupleA.mutation(api.guests.createInvite, { title: "B" });
		const g1 = await asCoupleA.mutation(api.guests.addGuest, {
			inviteId: a,
			name: "Ana",
		});
		await asCoupleA.mutation(api.guests.addGuest, {
			inviteId: b,
			name: "Kid",
			isChild: true,
		});
		await asCoupleA.mutation(api.guests.updateGuest, {
			id: g1,
			rsvpStatus: "confirmado",
		});

		const summary = await asCoupleA.query(api.guests.summary, {});
		expect(summary).toMatchObject({
			inviteCount: 2,
			total: 2,
			confirmed: 1,
			pending: 1,
			confirmedAdults: 1,
		});
	});

	it("rejects adding a guest to a missing invite", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Temp",
		});
		await asCoupleA.mutation(api.guests.removeInvite, { id: inviteId });
		await expect(
			asCoupleA.mutation(api.guests.addGuest, { inviteId, name: "Ninguém" }),
		).rejects.toThrow("Convite não encontrado");
	});
});

describe("guests: day-of check-in", () => {
	it("toggles check-in on and off", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Padrinhos",
		});
		const guestId = await asCoupleA.mutation(api.guests.addGuest, {
			inviteId,
			name: "Ana",
		});
		await asCoupleA.mutation(api.guests.updateGuest, {
			id: guestId,
			rsvpStatus: "confirmado",
		});

		await asCoupleA.mutation(api.guests.setCheckIn, {
			id: guestId,
			checkedIn: true,
		});
		let list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.checkedIn).toBe(true);

		await asCoupleA.mutation(api.guests.setCheckIn, {
			id: guestId,
			checkedIn: false,
		});
		list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.checkedIn).toBe(false);
	});

	it("defaults to no check-in for a freshly added guest", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Amigos",
		});
		await asCoupleA.mutation(api.guests.addGuest, { inviteId, name: "Bruno" });

		const list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.checkedIn).toBeFalsy();
	});

	it("rejects a missing guest", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Temp",
		});
		const guestId = await asCoupleA.mutation(api.guests.addGuest, {
			inviteId,
			name: "Some",
		});
		await asCoupleA.mutation(api.guests.removeGuest, { id: guestId });

		await expect(
			asCoupleA.mutation(api.guests.setCheckIn, {
				id: guestId,
				checkedIn: true,
			}),
		).rejects.toThrow("Convidado não encontrado");
	});

	it("clears check-in when a guest stops being confirmed", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const inviteId = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Vizinhos",
		});
		const guestId = await asCoupleA.mutation(api.guests.addGuest, {
			inviteId,
			name: "Rita",
		});
		await asCoupleA.mutation(api.guests.updateGuest, {
			id: guestId,
			rsvpStatus: "confirmado",
		});
		await asCoupleA.mutation(api.guests.setCheckIn, {
			id: guestId,
			checkedIn: true,
		});

		// Moving away from "confirmado" must drop the stale check-in.
		await asCoupleA.mutation(api.guests.updateGuest, {
			id: guestId,
			rsvpStatus: "recusado",
		});
		const list = await asCoupleA.query(api.guests.listInvites, {});
		expect(list[0]?.guests[0]?.checkedIn).toBe(false);
	});
});

describe("guests: wedding isolation", () => {
	async function seedBothWeddings() {
		const setup = await setupWeddingScopedTest();
		const { asCoupleA, asCoupleB } = setup;
		const inviteA = await asCoupleA.mutation(api.guests.createInvite, {
			title: "Convite A",
		});
		const guestA = await asCoupleA.mutation(api.guests.addGuest, {
			inviteId: inviteA,
			name: "Ana Convidada",
		});
		const inviteB = await asCoupleB.mutation(api.guests.createInvite, {
			title: "Convite B",
		});
		const guestB = await asCoupleB.mutation(api.guests.addGuest, {
			inviteId: inviteB,
			name: "Beto Convidado",
		});
		return { ...setup, inviteA, guestA, inviteB, guestB };
	}

	it("listInvites only returns the caller's wedding", async () => {
		const { asCoupleA, asCoupleB } = await seedBothWeddings();

		const listA = await asCoupleA.query(api.guests.listInvites, {});
		expect(listA).toHaveLength(1);
		expect(listA[0]?.title).toBe("Convite A");
		expect(listA[0]?.guests.map((g) => g.name)).toEqual(["Ana Convidada"]);

		const listB = await asCoupleB.query(api.guests.listInvites, {});
		expect(listB).toHaveLength(1);
		expect(listB[0]?.title).toBe("Convite B");
	});

	it("summary only counts the caller's wedding", async () => {
		const { asCoupleA, asCoupleB, inviteB } = await seedBothWeddings();
		await asCoupleB.mutation(api.guests.addGuest, {
			inviteId: inviteB,
			name: "Extra B",
		});

		const summaryA = await asCoupleA.query(api.guests.summary, {});
		expect(summaryA).toMatchObject({ inviteCount: 1, total: 1 });
	});

	it("updateInvite on a foreign invite fails like a missing row", async () => {
		const { asCoupleA, inviteB } = await seedBothWeddings();
		await expect(
			asCoupleA.mutation(api.guests.updateInvite, {
				id: inviteB,
				title: "Hack",
			}),
		).rejects.toThrow("Convite não encontrado");
	});

	it("removeInvite on a foreign invite fails like a missing row", async () => {
		const { asCoupleA, asCoupleB, inviteB } = await seedBothWeddings();
		await expect(
			asCoupleA.mutation(api.guests.removeInvite, { id: inviteB }),
		).rejects.toThrow("Convite não encontrado");
		// B's data must be untouched.
		expect(await asCoupleB.query(api.guests.listInvites, {})).toHaveLength(1);
	});

	it("addGuest to a foreign invite fails like a missing invite", async () => {
		const { asCoupleA, inviteB } = await seedBothWeddings();
		await expect(
			asCoupleA.mutation(api.guests.addGuest, {
				inviteId: inviteB,
				name: "Penetra",
			}),
		).rejects.toThrow("Convite não encontrado");
	});

	it("updateGuest on a foreign guest fails like a missing row", async () => {
		const { asCoupleA, guestB } = await seedBothWeddings();
		await expect(
			asCoupleA.mutation(api.guests.updateGuest, {
				id: guestB,
				rsvpStatus: "confirmado",
			}),
		).rejects.toThrow("Convidado não encontrado");
	});

	it("setCheckIn on a foreign guest fails like a missing row", async () => {
		const { asCoupleA, guestB } = await seedBothWeddings();
		await expect(
			asCoupleA.mutation(api.guests.setCheckIn, {
				id: guestB,
				checkedIn: true,
			}),
		).rejects.toThrow("Convidado não encontrado");
	});

	it("removeGuest on a foreign guest fails like a missing row", async () => {
		const { asCoupleA, asCoupleB, guestB } = await seedBothWeddings();
		await expect(
			asCoupleA.mutation(api.guests.removeGuest, { id: guestB }),
		).rejects.toThrow("Convidado não encontrado");
		const listB = await asCoupleB.query(api.guests.listInvites, {});
		expect(listB[0]?.guests).toHaveLength(1);
	});
});
