import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The landing page is the product's only sales surface: it has to promise a
// full wedding-planning platform, not a budget tracker. These tests pin the
// copy the page is accountable for. Sibling marketing components are stubbed
// so this file only covers what app/page.tsx itself renders.

vi.mock("@/components/marketing/landing-motion", () => ({
	LandingMotion: () => null,
}));
vi.mock("@/components/marketing/cockpit-preview", () => ({
	CockpitPreview: () => null,
}));
vi.mock("@/components/marketing/inspiration-showcase", () => ({
	InspirationShowcase: () => null,
}));
vi.mock("@/components/marketing/faq-section", () => ({
	FaqSection: () => null,
}));
vi.mock("@/components/marketing/testimonials", () => ({
	TestimonialsSection: () => null,
}));
vi.mock("@/components/marketing/landing-footer", () => ({
	LandingFooter: () => null,
}));
vi.mock("@/components/marketing/theme-toggle", () => ({
	ThemeToggle: () => null,
}));

import LandingPage from "@/app/page";

/** Sections are `<section aria-labelledby>`, so each is a named region. */
function region(name: RegExp) {
	return within(screen.getByRole("region", { name }));
}

describe("landing page", () => {
	it("leads with the one-place-for-everything promise", () => {
		render(<LandingPage />);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /Planeje cada detalhe do seu casamento em um só lugar/i,
			}),
		).toBeInTheDocument();
		expect(
			region(/Planeje cada detalhe do seu casamento/i).getByText(
				/Criado por noivos, para noivos/i,
			),
		).toBeInTheDocument();
	});

	it("offers both hero calls to action", () => {
		render(<LandingPage />);
		const hero = region(/Planeje cada detalhe do seu casamento/i);

		// ButtonLink renders an anchor that Base UI exposes as a button.
		expect(
			hero.getByRole("button", { name: /Começar 14 dias grátis/i }),
		).toHaveAttribute("href", "/cadastro");
		expect(
			hero.getByRole("button", { name: /Já tenho conta/i }),
		).toHaveAttribute("href", "/login");
	});

	it("drops the star rating and the one-minute badge from the hero", () => {
		render(<LandingPage />);

		expect(screen.queryByText(/Conta pronta/i)).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/Avaliação/i)).not.toBeInTheDocument();
	});

	it("lists the four pains of scattered planning", () => {
		render(<LandingPage />);
		const pains = region(/Menos tempo procurando/i);

		expect(pains.getAllByRole("listitem")).toHaveLength(4);
		for (const title of [
			"Tarefas esquecidas",
			"Gastos sem visibilidade",
			"Informações desencontradas",
			"A sensação de que sempre falta algo",
		]) {
			expect(pains.getByText(title)).toBeInTheDocument();
		}
	});

	it("walks through the five planning steps", () => {
		render(<LandingPage />);
		const steps = region(/Como funciona/i);

		expect(steps.getAllByRole("listitem")).toHaveLength(5);
		expect(
			steps.getByText(/Receba seu planejamento inicial/i),
		).toBeInTheDocument();
	});

	it("closes with the three trial highlights", () => {
		render(<LandingPage />);
		const cta = region(/O casamento acontece em um dia/i);

		expect(cta.getAllByRole("listitem")).toHaveLength(3);
		for (const highlight of [
			"14 dias grátis",
			"Sem cartão de crédito",
			"Criado por noivos, para noivos",
		]) {
			expect(cta.getByText(highlight)).toBeInTheDocument();
		}
		expect(cta.getByRole("button", { name: /Começar agora/i })).toHaveAttribute(
			"href",
			"/cadastro",
		);
	});
});
