// Pure CSV export of the guest list. Unlike the payments export
// (`./export`, semicolon-separated with the BOM added at the UI Blob), this
// module follows RFC-4180: comma separator, quote-wrapped fields, and the
// UTF-8 BOM baked into the returned string. No I/O — the UI turns the string
// into a Blob (without adding a second BOM).

import {
	INVITE_SIDE_LABELS,
	type InviteSide,
	RSVP_STATUS_LABELS,
	type RsvpStatus,
} from "./guests";

export interface GuestExportGuest {
	name: string;
	rsvpStatus: RsvpStatus;
	isChild?: boolean;
	mealNotes?: string;
}

export interface GuestExportInvite {
	title: string;
	group?: string;
	side?: InviteSide;
	guests: readonly GuestExportGuest[];
}

const SEP = ",";
const BOM = "﻿";

const HEADERS = [
	"Convite",
	"Grupo",
	"Lado",
	"Convidado",
	"Status",
	"Faixa etária",
	"Restrição alimentar",
];

/** RFC-4180 quoting: wrap on comma, quote or newline; double inner quotes. */
function escapeField(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/** One row per guest, flattened across invites in the order they arrive. */
export function guestsToCsv(invites: readonly GuestExportInvite[]): string {
	const lines = [HEADERS.join(SEP)];

	for (const invite of invites) {
		for (const guest of invite.guests) {
			const fields = [
				invite.title,
				invite.group?.trim() ?? "",
				invite.side ? INVITE_SIDE_LABELS[invite.side] : "",
				guest.name,
				RSVP_STATUS_LABELS[guest.rsvpStatus],
				guest.isChild ? "Criança" : "Adulto",
				guest.mealNotes?.trim() ?? "",
			];
			lines.push(fields.map((f) => escapeField(f)).join(SEP));
		}
	}

	return `${BOM}${lines.join("\n")}\n`;
}
