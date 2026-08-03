import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FaqSection } from "@/components/marketing/faq-section";

// The landing FAQ answers the ten objections a couple raises before signing
// up. Every answer has to stay reachable by mouse and by keyboard.

const QUESTIONS = [
	"Preciso de cartão de crédito para testar?",
	"Meu noivo ou minha noiva também pode acessar?",
	"O checklist já vem pronto?",
	"Posso criar minhas próprias tarefas?",
	"Consigo controlar fornecedores e pagamentos?",
	"Posso salvar inspirações?",
	"Funciona no celular?",
	"Posso usar mesmo que já tenha começado a organizar o casamento?",
	"Meus dados ficam salvos?",
	"Posso cancelar quando quiser?",
];

describe("FaqSection", () => {
	it("introduces itself as advice between couples", () => {
		render(<FaqSection />);

		expect(
			screen.getByRole("heading", { name: "De noivos para noivos" }),
		).toBeInTheDocument();
	});

	it("lists every question a couple asks before signing up", () => {
		render(<FaqSection />);

		for (const question of QUESTIONS) {
			expect(
				screen.getByRole("button", { name: question }),
			).toBeInTheDocument();
		}
	});

	it("keeps the answers collapsed until a question is opened", () => {
		render(<FaqSection />);

		for (const question of QUESTIONS) {
			expect(screen.getByRole("button", { name: question })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		}
		expect(screen.queryByText(/não pedimos cartão/i)).not.toBeInTheDocument();
	});

	it("reveals the answer when a question is clicked", async () => {
		const user = userEvent.setup();
		render(<FaqSection />);

		const trigger = screen.getByRole("button", {
			name: "Preciso de cartão de crédito para testar?",
		});
		await user.click(trigger);

		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(await screen.findByText(/não pedimos cartão/i)).toBeVisible();
	});

	it("opens and closes a question from the keyboard", async () => {
		const user = userEvent.setup();
		render(<FaqSection />);

		const trigger = screen.getByRole("button", {
			name: "Funciona no celular?",
		});
		trigger.focus();
		await user.keyboard("{Enter}");

		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(await screen.findByText(/mesmo acesso no celular/i)).toBeVisible();

		await user.keyboard("{Enter}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});
});
