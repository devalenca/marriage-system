import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The inspiration grid: thumbnails sit side by side, and tapping one opens a
// viewer that shows the whole photo and walks through the gallery.

const useQueryMock = vi.fn();
const removeImageMock = vi.fn();
const noopMutation = vi.fn();

vi.mock("convex/react", async () => {
	const { getFunctionName } = await import("convex/server");
	return {
		useQuery: (...args: unknown[]) => useQueryMock(...args),
		useMutation: (ref: never) =>
			getFunctionName(ref) === "inspiration:removeImage"
				? removeImageMock
				: noopMutation,
	};
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { InspirationContent } from "@/components/inspiration/inspiration-content";

const IMAGES = [
	{
		_id: "img1",
		url: "https://files.example/praia.jpg",
		caption: "Praia ao pôr do sol",
		uploadedAt: 3,
	},
	{
		_id: "img2",
		url: "https://files.example/bolo.jpg",
		caption: "Bolo de três andares",
		uploadedAt: 2,
	},
	{
		_id: "img3",
		url: "https://files.example/buque.jpg",
		caption: "Buquê de peônias",
		uploadedAt: 1,
	},
];

function mockGallery() {
	useQueryMock.mockReturnValue([
		{ _id: "gal1", name: "Decoração", images: IMAGES },
	]);
}

function viewer() {
	return screen.getByRole("dialog");
}

/**
 * Alpha of the `bg-card/NN` or `bg-background/NN` utility on an element, as a
 * 0–1 number. Zero means the element declares no such surface.
 */
function surfaceAlpha(element: HTMLElement): number {
	const match = String(element.className).match(
		/(?:^|\s)bg-(?:card|background)(?:\/(\d+))?(?:\s|$)/,
	);
	if (!match) return 0;
	return match[1] === undefined ? 1 : Number(match[1]) / 100;
}

/** Alpha of the nearest surface at or above `element`. */
function groundedAlpha(element: HTMLElement | null): number {
	let node = element;
	while (node) {
		const alpha = surfaceAlpha(node);
		if (alpha > 0) return alpha;
		node = node.parentElement;
	}
	return 0;
}

describe("InspirationContent gallery", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		removeImageMock.mockReset().mockResolvedValue(null);
		noopMutation.mockReset().mockResolvedValue(null);
	});

	it("opens the viewer on the thumbnail that was clicked", async () => {
		mockGallery();
		const user = userEvent.setup();
		render(<InspirationContent />);

		await user.click(
			screen.getByRole("button", { name: /ampliar praia ao pôr do sol/i }),
		);

		const dialog = await screen.findByRole("dialog");
		expect(within(dialog).getByRole("img")).toHaveAttribute(
			"src",
			"https://files.example/praia.jpg",
		);
	});

	it("walks to the next image with the arrow button", async () => {
		mockGallery();
		const user = userEvent.setup();
		render(<InspirationContent />);

		await user.click(
			screen.getByRole("button", { name: /ampliar praia ao pôr do sol/i }),
		);
		await user.click(
			await within(await screen.findByRole("dialog")).findByRole("button", {
				name: /próxima imagem/i,
			}),
		);

		await waitFor(() =>
			expect(within(viewer()).getByRole("img")).toHaveAttribute(
				"src",
				"https://files.example/bolo.jpg",
			),
		);
	});

	it("walks to the next image with the keyboard arrow", async () => {
		mockGallery();
		const user = userEvent.setup();
		render(<InspirationContent />);

		await user.click(
			screen.getByRole("button", { name: /ampliar praia ao pôr do sol/i }),
		);
		await screen.findByRole("dialog");
		await user.keyboard("{ArrowRight}");

		await waitFor(() =>
			expect(within(viewer()).getByRole("img")).toHaveAttribute(
				"src",
				"https://files.example/bolo.jpg",
			),
		);
	});

	it("deletes without opening the viewer", async () => {
		mockGallery();
		const user = userEvent.setup();
		render(<InspirationContent />);

		const [firstDeleteButton] = screen.getAllByRole("button", {
			name: /remover imagem/i,
		});
		if (!firstDeleteButton) throw new Error("no delete button rendered");
		await user.click(firstDeleteButton);

		await waitFor(() =>
			expect(removeImageMock).toHaveBeenCalledWith({ id: "img1" }),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

// Everything on this screen floats over the field photograph, whose luminance
// swings from grass to sky: the same label measured 1.92:1 in one spot and
// 15:1 in another. So the invariant is structural — text carries a surface of
// its own at 0.85 alpha or more — not a particular colour.
describe("InspirationContent legibility", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		noopMutation.mockReset().mockResolvedValue(null);
	});

	it("grounds the unselected gallery chips", () => {
		useQueryMock.mockReturnValue([
			{ _id: "gal1", name: "Decoração", images: IMAGES },
			{ _id: "gal2", name: "Convites", images: [] },
		]);
		render(<InspirationContent />);

		// The first gallery is auto-selected, so this one renders inactive.
		const chip = screen.getByRole("button", { name: "Convites" });
		expect(groundedAlpha(chip)).toBeGreaterThanOrEqual(0.85);
	});

	it("grounds the active gallery name", () => {
		mockGallery();
		render(<InspirationContent />);

		const heading = screen.getByRole("heading", { name: "Decoração" });
		expect(groundedAlpha(heading)).toBeGreaterThanOrEqual(0.85);
	});

	it("grounds the caption laid over a thumbnail", () => {
		mockGallery();
		const { container } = render(<InspirationContent />);

		const caption = container.querySelector("figcaption");
		expect(caption).not.toBeNull();
		expect(surfaceAlpha(caption as HTMLElement)).toBeGreaterThanOrEqual(0.85);
	});
});
