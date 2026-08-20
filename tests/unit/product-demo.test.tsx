import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// jsdom implements no `window.matchMedia`, and GSAP's ScrollTrigger consults
// it as soon as the component module registers the plugin. This stub matches
// nothing, which lands the component in its static (no-JS) branch — the very
// state the tests below pin.
vi.hoisted(() => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}),
	});
});

// The hero stage that replaced the old cockpit mockup: a browser-framed demo
// that must arrive server-rendered in a finished state (never an empty
// rectangle), stay video-free until HERO_DEMO_VIDEO points at a real file,
// and keep every run of copy on an opaque surface — the landing sits on a
// fixed field photograph (see landing-surface.test.tsx for the invariant).
//
import { ProductDemo } from "@/components/marketing/product-demo";

describe("product demo", () => {
	it("renders the dashboard scene finished on the server", () => {
		render(<ProductDemo />);

		expect(screen.getByText("Orçamento")).toBeInTheDocument();
		expect(screen.getByText("R$ 96.000,00")).toBeInTheDocument();
		expect(screen.getByText(/Pago R\$ 44\.800,00/)).toBeInTheDocument();
		expect(screen.getByText("124")).toBeInTheDocument();
		expect(screen.getByText("dias para o grande dia")).toBeInTheDocument();
	});

	it("ships the checklist and guests scenes in the same markup", () => {
		render(<ProductDemo />);

		expect(screen.getByText("34 de 52 concluídas")).toBeInTheDocument();
		expect(screen.getByText("Escolher o bolo")).toBeInTheDocument();
		expect(screen.getByText("96")).toBeInTheDocument();
		expect(screen.getByText(/de 148 confirmados/)).toBeInTheDocument();
	});

	it("names the three scenes as tabs", () => {
		render(<ProductDemo />);

		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((tab) => tab.textContent)).toEqual([
			"Painel",
			"Checklist",
			"Convidados",
		]);
	});

	it("switches the selected scene when a tab is clicked", () => {
		render(<ProductDemo />);

		const checklistTab = screen.getByRole("tab", { name: "Checklist" });
		fireEvent.click(checklistTab);

		expect(checklistTab).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("tab", { name: "Painel" })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("renders no video while HERO_DEMO_VIDEO is null", () => {
		const { container } = render(<ProductDemo />);

		expect(container.querySelector("video")).toBeNull();
	});

	it("frames the demo and its tabs on opaque surfaces", () => {
		const { container } = render(<ProductDemo />);

		// bg-card/95 clears the >= 0.85 alpha threshold the invariant demands.
		expect(container.querySelector("[data-demo-frame]")).toHaveClass(
			"bg-card/95",
		);
		expect(screen.getByRole("tablist")).toHaveClass("bg-card/95");
	});
});
