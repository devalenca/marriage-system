import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// The landing's emotional section: it has to name the galleries a couple would
// actually create, so the promise matches what the app does (components/
// inspiration/inspiration-content.tsx).

import { InspirationShowcase } from "@/components/marketing/inspiration-showcase";

const GALLERY_LABELS = [
	"Decoração",
	"Vestido e traje",
	"Flores",
	"Convites",
	"Paleta de cores",
];

describe("InspirationShowcase", () => {
	it("renders a heading about the couple's references", () => {
		render(<InspirationShowcase />);

		expect(
			screen.getByRole("heading", { name: /referências/i }),
		).toBeInTheDocument();
	});

	it("labels the section with its own heading", () => {
		render(<InspirationShowcase />);

		const heading = screen.getByRole("heading", { name: /referências/i });
		const section = screen.getByRole("region", {
			name: heading.textContent ?? "",
		});

		expect(section).toContainElement(heading);
	});

	it("names the example galleries", () => {
		render(<InspirationShowcase />);

		for (const label of GALLERY_LABELS) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it("only promises what the app really does with a gallery", () => {
		render(<InspirationShowcase />);

		expect(screen.getByText(/ampliar/i)).toBeInTheDocument();
		expect(screen.getByText(/celular/i)).toBeInTheDocument();
	});
});
