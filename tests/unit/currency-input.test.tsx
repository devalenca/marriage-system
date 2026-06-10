import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CurrencyInput } from "@/components/currency-input";

function Harness({ initial }: { initial: number | null }) {
	const [cents, setCents] = useState<number | null>(initial);
	return (
		<div>
			<CurrencyInput
				aria-label="Valor"
				value={cents}
				onValueChange={setCents}
			/>
			<output data-testid="cents">{cents === null ? "null" : cents}</output>
		</div>
	);
}

describe("CurrencyInput", () => {
	it("shows the initial value formatted in pt-BR", () => {
		render(<Harness initial={123456} />);
		expect(screen.getByLabelText("Valor")).toHaveValue("1.234,56");
	});

	it("parses typed pt-BR values into cents", () => {
		render(<Harness initial={null} />);
		const input = screen.getByLabelText("Valor");

		fireEvent.change(input, { target: { value: "2.500,00" } });
		expect(screen.getByTestId("cents")).toHaveTextContent("250000");
	});

	it("parses plain reais without separators", () => {
		render(<Harness initial={null} />);
		fireEvent.change(screen.getByLabelText("Valor"), {
			target: { value: "55000" },
		});
		expect(screen.getByTestId("cents")).toHaveTextContent("5500000");
	});

	it("reports null for cleared or invalid input", () => {
		render(<Harness initial={100} />);
		const input = screen.getByLabelText("Valor");

		fireEvent.change(input, { target: { value: "" } });
		expect(screen.getByTestId("cents")).toHaveTextContent("null");
	});

	it("reformats on blur", () => {
		render(<Harness initial={null} />);
		const input = screen.getByLabelText("Valor");

		fireEvent.change(input, { target: { value: "1234,5" } });
		fireEvent.blur(input);
		expect(input).toHaveValue("1.234,50");
	});
});
