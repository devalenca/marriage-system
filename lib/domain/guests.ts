// Pure guest-list domain logic. No Convex imports — everything here is
// unit-testable and shared by backend functions and UI.

export const RSVP_STATUSES = ["pendente", "confirmado", "recusado"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
	pendente: "Pendente",
	confirmado: "Confirmado",
	recusado: "Não vai",
};

// Which "side" the invite belongs to — a common wedding-list split.
export const INVITE_SIDES = ["noiva", "noivo", "ambos"] as const;
export type InviteSide = (typeof INVITE_SIDES)[number];

export const INVITE_SIDE_LABELS: Record<InviteSide, string> = {
	noiva: "Noiva",
	noivo: "Noivo",
	ambos: "Ambos",
};

export interface GuestSnapshot {
	rsvpStatus: RsvpStatus;
	isChild?: boolean;
}

export interface GuestCounts {
	total: number;
	confirmed: number;
	pending: number;
	declined: number;
	/** Confirmed guests only, split by age (drives the catering headcount). */
	confirmedAdults: number;
	confirmedChildren: number;
}

/** Tallies a list of guests by RSVP status, splitting confirmed by age. */
export function guestCounts(guests: GuestSnapshot[]): GuestCounts {
	const counts: GuestCounts = {
		total: guests.length,
		confirmed: 0,
		pending: 0,
		declined: 0,
		confirmedAdults: 0,
		confirmedChildren: 0,
	};

	for (const guest of guests) {
		if (guest.rsvpStatus === "confirmado") {
			counts.confirmed += 1;
			if (guest.isChild) counts.confirmedChildren += 1;
			else counts.confirmedAdults += 1;
		} else if (guest.rsvpStatus === "pendente") {
			counts.pending += 1;
		} else {
			counts.declined += 1;
		}
	}

	return counts;
}
