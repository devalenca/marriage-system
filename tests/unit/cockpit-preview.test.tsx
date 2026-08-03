import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// The landing hero preview has to look like the whole cockpit, not a budget
// widget: the six things the couple sees after signing in must all be on the
// same screen.

import { CockpitPreview } from "@/components/marketing/cockpit-preview";

describe("cockpit preview", () => {
	it("shows the budget with real BRL figures", () => {
		render(<CockpitPreview />);

		expect(screen.getByText("Orçamento")).toBeInTheDocument();
		expect(screen.getByText("R$ 96.000,00")).toBeInTheDocument();
		expect(screen.getByText(/Pago R\$ 44\.800,00/)).toBeInTheDocument();
	});

	it("shows the checklist progress", () => {
		render(<CockpitPreview />);

		expect(screen.getByText("Tarefas")).toBeInTheDocument();
		expect(screen.getByText("34 de 52 concluídas")).toBeInTheDocument();
	});

	it("shows the countdown to the wedding day", () => {
		render(<CockpitPreview />);

		expect(screen.getByText("124")).toBeInTheDocument();
		expect(screen.getByText("dias para o grande dia")).toBeInTheDocument();
		expect(screen.getByText(/05\/12\/2026/)).toBeInTheDocument();
	});

	it("shows the vendors with plausible names", () => {
		render(<CockpitPreview />);

		expect(screen.getByText("Fornecedores")).toBeInTheDocument();
		expect(screen.getByText("Buffet Sabor & Arte")).toBeInTheDocument();
		expect(screen.getByText("Fotografia Luz Natural")).toBeInTheDocument();
	});

	it("shows the guest list", () => {
		render(<CockpitPreview />);

		expect(screen.getByText("Convidados")).toBeInTheDocument();
		expect(screen.getByText("96")).toBeInTheDocument();
		expect(screen.getByText(/de 148 confirmados/)).toBeInTheDocument();
	});

	it("shows the saved inspirations", () => {
		render(<CockpitPreview />);

		expect(screen.getByText("Inspirações")).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("imagens salvas")).toBeInTheDocument();
	});

	it("describes itself as a dashboard preview for assistive tech", () => {
		render(<CockpitPreview />);

		expect(
			screen.getByRole("img", { name: /prévia do painel/i }),
		).toBeVisible();
	});
});
