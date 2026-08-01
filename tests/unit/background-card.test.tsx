import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// "Foto de fundo": the couple uploads their own photo, or goes back to the
// one the app ships with.

const useQueryMock = vi.fn();
const generateUploadUrlMock = vi.fn();
const setBackgroundMock = vi.fn();
const clearBackgroundMock = vi.fn();

vi.mock("convex/react", async () => {
	const { getFunctionName } = await import("convex/server");
	return {
		useQuery: (...args: unknown[]) => useQueryMock(...args),
		useMutation: (ref: never) => {
			const name = getFunctionName(ref);
			if (name === "weddings:generateBackgroundUploadUrl")
				return generateUploadUrlMock;
			if (name === "weddings:setBackground") return setBackgroundMock;
			return clearBackgroundMock;
		},
	};
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BackgroundCard } from "@/components/settings/background-card";

function pngFile() {
	return new File(["binary"], "praia.png", { type: "image/png" });
}

describe("BackgroundCard", () => {
	beforeEach(() => {
		useQueryMock.mockReset().mockReturnValue(null);
		generateUploadUrlMock
			.mockReset()
			.mockResolvedValue("https://upload.example/abc");
		setBackgroundMock.mockReset().mockResolvedValue(null);
		clearBackgroundMock.mockReset().mockResolvedValue(null);
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify({ storageId: "kg123" }), { status: 200 }),
				),
		);
	});

	it("uploads the chosen photo and saves it", async () => {
		const user = userEvent.setup();
		render(<BackgroundCard />);

		await user.upload(screen.getByLabelText(/escolher foto/i), pngFile());

		await waitFor(() =>
			expect(setBackgroundMock).toHaveBeenCalledWith({ storageId: "kg123" }),
		);
		expect(generateUploadUrlMock).toHaveBeenCalled();
	});

	it("rejects a file that is not an image", async () => {
		render(<BackgroundCard />);

		// `accept` already filters the picker, so this fires the change event
		// directly to exercise the guard behind it ("all files" pickers).
		const input = screen.getByLabelText(/escolher foto/i);
		const pdf = new File(["x"], "contrato.pdf", { type: "application/pdf" });
		Object.defineProperty(input, "files", { value: [pdf], writable: true });
		fireEvent.change(input);

		expect(setBackgroundMock).not.toHaveBeenCalled();
		expect(await screen.findByRole("alert")).toHaveTextContent(/imagem/i);
	});

	it("offers the default only when a custom photo is set", async () => {
		const { rerender } = render(<BackgroundCard />);
		expect(
			screen.queryByRole("button", { name: /voltar ao padrão/i }),
		).not.toBeInTheDocument();

		useQueryMock.mockReturnValue("https://files.example/foto.png");
		rerender(<BackgroundCard />);
		expect(
			screen.getByRole("button", { name: /voltar ao padrão/i }),
		).toBeInTheDocument();
	});

	it("restores the shipped photo", async () => {
		useQueryMock.mockReturnValue("https://files.example/foto.png");
		const user = userEvent.setup();
		render(<BackgroundCard />);

		await user.click(screen.getByRole("button", { name: /voltar ao padrão/i }));

		await waitFor(() => expect(clearBackgroundMock).toHaveBeenCalledWith({}));
	});
});
