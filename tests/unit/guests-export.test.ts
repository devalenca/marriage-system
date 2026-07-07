import { describe, expect, it } from "vitest";
import {
	type GuestExportInvite,
	guestsToCsv,
} from "@/lib/domain/guests-export";

const HEADER =
	"Convite,Grupo,Lado,Convidado,Status,Faixa etária,Restrição alimentar";

/** Strips the leading BOM and returns the non-empty lines. */
function lines(csv: string): string[] {
	return csv.replace(/^﻿/, "").split("\n").filter(Boolean);
}

describe("guestsToCsv", () => {
	it("starts with a UTF-8 BOM", () => {
		const csv = guestsToCsv([]);
		expect(csv.startsWith("﻿")).toBe(true);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
	});

	it("emits header + one row per guest", () => {
		const invites: GuestExportInvite[] = [
			{
				title: "Família Silva",
				guests: [
					{ name: "Ana", rsvpStatus: "confirmado" },
					{ name: "Bruno", rsvpStatus: "pendente" },
				],
			},
		];
		const rows = lines(guestsToCsv(invites));
		expect(rows).toHaveLength(3);
		expect(rows[0]).toBe(HEADER);
	});

	it("empty list yields header only", () => {
		const rows = lines(guestsToCsv([]));
		expect(rows).toHaveLength(1);
		expect(rows[0]).toBe(HEADER);
	});

	it("maps columns correctly (status + side + group)", () => {
		const invites: GuestExportInvite[] = [
			{
				title: "Convite A",
				group: "Trabalho",
				side: "noiva",
				guests: [
					{ name: "Carla", rsvpStatus: "confirmado" },
					{ name: "Diego", rsvpStatus: "recusado" },
					{ name: "Eva", rsvpStatus: "pendente" },
				],
			},
		];
		const rows = lines(guestsToCsv(invites));
		expect(rows[1]).toContain("Confirmado");
		expect(rows[1]).toContain("Noiva");
		expect(rows[1]).toContain("Trabalho");
		expect(rows[2]).toContain("Não vai");
		expect(rows[3]).toContain("Pendente");
	});

	it("marks child vs adult", () => {
		const invites: GuestExportInvite[] = [
			{
				title: "Convite",
				guests: [
					{ name: "Filho", rsvpStatus: "confirmado", isChild: true },
					{ name: "Pai", rsvpStatus: "confirmado", isChild: false },
					{ name: "Mãe", rsvpStatus: "confirmado" },
				],
			},
		];
		const rows = lines(guestsToCsv(invites));
		expect(rows[1]).toContain("Criança");
		expect(rows[2]).toContain("Adulto");
		expect(rows[3]).toContain("Adulto");
	});

	it("quotes fields with comma, quote, or newline (RFC-4180)", () => {
		const invites: GuestExportInvite[] = [
			{
				title: "Silva, Família",
				guests: [
					{
						name: 'Ana "Nina"',
						rsvpStatus: "confirmado",
						mealNotes: "Sem glúten\nsem lactose",
					},
				],
			},
		];
		const csv = guestsToCsv(invites);
		expect(csv).toContain('"Silva, Família"');
		expect(csv).toContain('"Ana ""Nina"""');
		expect(csv).toContain('"Sem glúten\nsem lactose"');
	});

	it("renders blank optional fields as empty", () => {
		const invites: GuestExportInvite[] = [
			{
				title: "Convite",
				guests: [{ name: "Só nome", rsvpStatus: "pendente" }],
			},
		];
		const rows = lines(guestsToCsv(invites));
		// Convite,,,Só nome,Pendente,Adulto,
		expect(rows[1]).toBe("Convite,,,Só nome,Pendente,Adulto,");
	});
});
