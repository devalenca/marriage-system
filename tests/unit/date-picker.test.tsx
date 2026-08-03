import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "@/components/ui/date-picker";

// The styled replacement for <input type="date">: a button that opens a
// calendar popover, speaks pt-BR, displays dd/MM/yyyy and reports ISO
// yyyy-MM-dd upward — the format the whole domain stores.

function Harness({ initial = "" }: { initial?: string }) {
	const [value, setValue] = useState(initial);
	return (
		<>
			<DatePicker
				id="wedding-date"
				value={value}
				onChange={setValue}
				placeholder="Escolha a data"
			/>
			<output data-testid="iso">{value}</output>
		</>
	);
}

describe("DatePicker", () => {
	it("shows the placeholder while empty and the BR date once set", () => {
		const empty = render(<Harness />);
		expect(
			screen.getByRole("button", { name: /escolha a data/i }),
		).toBeInTheDocument();
		empty.unmount();

		render(<Harness initial="2026-12-05" />);
		expect(screen.getByRole("button", { name: /05\/12\/2026/ })).toBeVisible();
	});

	it("opens the calendar and reports the picked day as ISO", async () => {
		const user = userEvent.setup();
		render(<Harness initial="2026-12-05" />);

		await user.click(screen.getByRole("button", { name: /05\/12\/2026/ }));
		// pt-BR month caption proves the locale went through.
		await waitFor(() =>
			expect(screen.getByText(/dezembro/i)).toBeInTheDocument(),
		);

		await user.click(screen.getByRole("button", { name: /18 de dezembro/i }));
		await waitFor(() =>
			expect(screen.getByTestId("iso")).toHaveTextContent("2026-12-18"),
		);
	});
});
