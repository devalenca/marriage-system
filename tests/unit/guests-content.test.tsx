import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
	useMutation: () => mutationMock,
}));

import { GuestsContent } from "@/components/guests/guests-content";

// The four totals sit directly on the page, with the field photograph behind
// them. While they were `bg-card/45` the picture came through the tile and the
// 12px labels were left reading against grass or sky. What the tests below pin
// is the structure that fixes it — every label lives inside a card surface —
// not any particular colour.

function makeInvite(
	id: string,
	title: string,
	counts: {
		total: number;
		confirmed: number;
		pending: number;
		declined: number;
	},
) {
	return {
		_id: id,
		_creationTime: 0,
		title,
		group: "Família",
		side: "noiva" as const,
		phone: undefined,
		counts,
		guests: [
			{
				_id: `${id}-g1`,
				_creationTime: 0,
				inviteId: id,
				name: `Convidado de ${title}`,
				rsvpStatus: "confirmado" as const,
				isChild: false,
			},
		],
	};
}

const INVITES = [
	makeInvite("i1", "Silva", {
		total: 5,
		confirmed: 3,
		pending: 1,
		declined: 1,
	}),
	makeInvite("i2", "Souza", {
		total: 2,
		confirmed: 1,
		pending: 1,
		declined: 0,
	}),
];

/** The card surface a summary label is painted on, or null if it has none. */
function tileFor(label: string): HTMLElement | null {
	for (const node of screen.getAllByText(label)) {
		const card = node.closest('[data-slot="card"]');
		if (card) return card as HTMLElement;
	}
	return null;
}

describe("GuestsContent totals", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		mutationMock.mockReset();
		useQueryMock.mockReturnValue(INVITES);
	});

	it("renders the four totals with their labels", () => {
		render(<GuestsContent />);

		const totals: Array<[string, string]> = [
			["Convidados", "7"],
			["Confirmados", "4"],
			["Pendentes", "2"],
			["Não vão", "1"],
		];
		for (const [label, value] of totals) {
			const tile = tileFor(label);
			expect(tile, `no tile for "${label}"`).not.toBeNull();
			expect(within(tile as HTMLElement).getByText(value)).toBeInTheDocument();
		}
	});

	it("grounds every total on a card surface, never on the photograph", () => {
		render(<GuestsContent />);

		for (const label of ["Convidados", "Confirmados", "Pendentes", "Não vão"]) {
			const tile = tileFor(label);
			expect(tile, `"${label}" has no opaque surface above it`).not.toBeNull();
			// A translucent utility on the card itself would undo the surface.
			expect(tile?.className).not.toMatch(/bg-\w+\/([0-7]\d|\d)\b/);
		}
	});

	it("hides the totals until there is at least one invite", () => {
		useQueryMock.mockReturnValue([]);
		render(<GuestsContent />);

		expect(screen.queryByText("Confirmados")).not.toBeInTheDocument();
	});
});
