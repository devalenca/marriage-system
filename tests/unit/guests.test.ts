import { describe, expect, it } from "vitest";
import { type GuestSnapshot, guestCounts } from "@/lib/domain/guests";

describe("guestCounts", () => {
	it("returns all-zero counts for an empty list", () => {
		expect(guestCounts([])).toEqual({
			total: 0,
			confirmed: 0,
			pending: 0,
			declined: 0,
			confirmedAdults: 0,
			confirmedChildren: 0,
		});
	});

	it("tallies each RSVP status and splits confirmed by age", () => {
		const guests: GuestSnapshot[] = [
			{ rsvpStatus: "confirmado" },
			{ rsvpStatus: "confirmado", isChild: true },
			{ rsvpStatus: "confirmado", isChild: false },
			{ rsvpStatus: "pendente" },
			{ rsvpStatus: "pendente", isChild: true },
			{ rsvpStatus: "recusado" },
		];

		expect(guestCounts(guests)).toEqual({
			total: 6,
			confirmed: 3,
			pending: 2,
			declined: 1,
			confirmedAdults: 2,
			confirmedChildren: 1,
		});
	});

	it("does not count children of non-confirmed guests toward confirmed splits", () => {
		const counts = guestCounts([
			{ rsvpStatus: "pendente", isChild: true },
			{ rsvpStatus: "recusado", isChild: true },
		]);
		expect(counts.confirmedChildren).toBe(0);
		expect(counts.confirmedAdults).toBe(0);
		expect(counts.confirmed).toBe(0);
	});
});
