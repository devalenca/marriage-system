import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FaqSection } from "@/components/marketing/faq-section";
import { InspirationShowcase } from "@/components/marketing/inspiration-showcase";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { SectionSurface } from "@/components/marketing/section-surface";
import { TestimonialsSection } from "@/components/marketing/testimonials";

// The landing stands on a fixed field photograph, and text laid straight on it
// has no guaranteed contrast anywhere: the same six labels measured 1.92:1 over
// grass and 15.3:1 over sky. The rule the page now follows is structural — every
// run of supporting copy sits on a surface opaque enough to block the picture.
//
// These tests assert that threshold and nothing else. They never pin a colour,
// so raising a panel from /95 to /97 stays a free change.

const OPAQUE_ENOUGH = 0.85;

/** The `bg-card/NN` alpha nearest the node, walking up to the document root. */
function surfaceAlpha(node: Element | null): number {
	let current = node;
	while (current) {
		for (const token of (current.getAttribute("class") ?? "").split(/\s+/)) {
			const match = /^bg-card(?:\/(\d{1,3}))?$/.exec(token);
			if (match) return match[1] === undefined ? 1 : Number(match[1]) / 100;
		}
		current = current.parentElement;
	}
	return 0;
}

describe("SectionSurface", () => {
	it("gives its copy a surface the photograph cannot show through", () => {
		const { container } = render(
			<SectionSurface>Texto de apoio</SectionSurface>,
		);

		expect(surfaceAlpha(container.firstElementChild)).toBeGreaterThanOrEqual(
			OPAQUE_ENOUGH,
		);
	});

	it("keeps the caller's layout classes and the GSAP reveal hook", () => {
		const { container } = render(
			<SectionSurface data-reveal="mask" className="mx-auto max-w-2xl">
				Texto de apoio
			</SectionSurface>,
		);
		const surface = container.firstElementChild;

		expect(surface).toHaveAttribute("data-reveal", "mask");
		expect(surface).toHaveClass("mx-auto", "max-w-2xl");
	});
});

describe("landing copy that used to sit on the photograph", () => {
	it("grounds the FAQ subtitle", () => {
		render(<FaqSection />);

		expect(
			surfaceAlpha(screen.getByText(/Sabemos que organizar um casamento/i)),
		).toBeGreaterThanOrEqual(OPAQUE_ENOUGH);
	});

	it("grounds the testimonials disclaimer", () => {
		render(<TestimonialsSection />);

		expect(
			surfaceAlpha(screen.getByText(/Depoimentos ilustrativos/i)),
		).toBeGreaterThanOrEqual(OPAQUE_ENOUGH);
	});

	it("grounds the inspirations paragraph and its capability list", () => {
		render(<InspirationShowcase />);

		expect(
			surfaceAlpha(screen.getByText(/A decoração que vocês salvaram/i)),
		).toBeGreaterThanOrEqual(OPAQUE_ENOUGH);
		expect(
			surfaceAlpha(screen.getByText(/Toque para ampliar/i)),
		).toBeGreaterThanOrEqual(OPAQUE_ENOUGH);
	});

	it("grounds the footer description and every footer link", () => {
		render(<LandingFooter />);

		expect(
			surfaceAlpha(screen.getByText(/cockpit de planejamento/i)),
		).toBeGreaterThanOrEqual(OPAQUE_ENOUGH);
		for (const label of [
			"Entrar",
			"Criar conta",
			"Termos de uso",
			"Privacidade",
		]) {
			expect(
				surfaceAlpha(screen.getByRole("link", { name: label })),
			).toBeGreaterThanOrEqual(OPAQUE_ENOUGH);
		}
	});
});
