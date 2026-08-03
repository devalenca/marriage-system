import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// The landing testimonials: illustrative quotes for a product that is just
// starting. They must cover different pains (scattered information, lack of
// control, the monthly checklist) instead of repeating the spreadsheet story,
// and the section must never pass invented ratings or user counts off as real.

import {
	SocialProofInline,
	TestimonialsSection,
} from "@/components/marketing/testimonials";

describe("landing testimonials", () => {
	it("shows the quote about scattered information", () => {
		render(<TestimonialsSection />);

		expect(
			screen.getByText(
				/O que antes ficava espalhado entre WhatsApp, Pinterest e planilhas agora está no mesmo lugar\./,
			),
		).toBeInTheDocument();
	});

	it("shows the quote about feeling in control", () => {
		render(<TestimonialsSection />);

		expect(
			screen.getByText(
				/Pela primeira vez sentimos que tínhamos controle da organização\./,
			),
		).toBeInTheDocument();
	});

	it("shows the quote about the monthly checklist", () => {
		render(<TestimonialsSection />);

		expect(
			screen.getByText(
				/O checklist mensal virou nossa referência\. Sempre sabíamos qual era o próximo passo\./,
			),
		).toBeInTheDocument();
	});

	it("does not repeat the spreadsheet complaint in every quote", () => {
		render(<TestimonialsSection />);

		expect(screen.getAllByText(/planilha/i)).toHaveLength(1);
	});

	it("credits each quote to a couple", () => {
		render(<TestimonialsSection />);

		expect(screen.getByText("Marina & Lucas")).toBeInTheDocument();
		expect(screen.getByText("Camila & Rafael")).toBeInTheDocument();
		expect(screen.getByText("Ana & Pedro")).toBeInTheDocument();
	});

	it("says out loud that the quotes are illustrative", () => {
		render(<TestimonialsSection />);

		expect(screen.getByText(/ilustrativ/i)).toBeInTheDocument();
	});

	it("claims no rating or number of couples it cannot back", () => {
		const { container } = render(
			<>
				<SocialProofInline />
				<TestimonialsSection />
			</>,
		);

		expect(container.textContent).not.toMatch(/\d[,.]\d\s*\/?\s*5/);
		expect(container.textContent).not.toMatch(/\d+\s*(casais|noiv)/i);
		expect(container.textContent).not.toMatch(/avalia[çc]/i);
	});
});
