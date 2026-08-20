import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// The page header is the one surface every screen in the app renders. It sits
// over the field photograph, so its own opacity decides whether the screen's
// title is readable: at bg-card/35 the same heading measured 1.92:1 against the
// grass and 15:1 against the sky. The invariant under test is the threshold,
// not a particular value — anything at or above 0.85 alpha keeps the photo out.

import { PageHeader } from "@/components/page-header";

/** Alpha of the `bg-card/NN` utility on an element, as a 0–1 number. */
function cardBackgroundAlpha(element: HTMLElement): number {
	const match = element.className.match(/(?:^|\s)bg-card(?:\/(\d+))?(?:\s|$)/);
	if (!match) return 0;
	return match[1] === undefined ? 1 : Number(match[1]) / 100;
}

describe("page header surface", () => {
	it("renders the title and subtitle", () => {
		render(<PageHeader title="Convidados" subtitle="Quem vai com a gente" />);

		expect(
			screen.getByRole("heading", { name: "Convidados" }),
		).toBeInTheDocument();
		expect(screen.getByText("Quem vai com a gente")).toBeInTheDocument();
	});

	it("keeps an opaque backing so the photograph never reaches the text", () => {
		const { container } = render(<PageHeader title="Convidados" />);
		const header = container.querySelector("header");

		expect(header).not.toBeNull();
		expect(cardBackgroundAlpha(header as HTMLElement)).toBeGreaterThanOrEqual(
			0.85,
		);
	});
});
