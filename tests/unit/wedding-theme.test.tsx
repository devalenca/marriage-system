import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The accent has to survive a reload without flashing: the theme lives behind
// client-side auth, so the browser remembers the last one and re-applies it
// before the query answers (see components/theme-bootstrap.tsx).

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import { WeddingTheme } from "@/components/wedding-theme";
import { THEME_STORAGE_KEY } from "@/lib/domain/themes";

/** Mocks the two queries the component reads, by name. */
async function mockQueries({
	identity,
	background = null,
}: {
	identity: unknown;
	background?: unknown;
}) {
	const { getFunctionName } = await import("convex/server");
	useQueryMock.mockImplementation((ref: never) =>
		getFunctionName(ref) === "weddings:currentIdentity" ? identity : background,
	);
}

/** jsdom here ships without localStorage, so the tests bring their own. */
function stubStorage() {
	const store = new Map<string, string>();
	const storage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear(),
		key: (i: number) => [...store.keys()][i] ?? null,
		get length() {
			return store.size;
		},
	};
	vi.stubGlobal("localStorage", storage);
	return storage;
}

describe("WeddingTheme", () => {
	let storage: ReturnType<typeof stubStorage>;

	beforeEach(() => {
		useQueryMock.mockReset();
		storage = stubStorage();
		document.documentElement.removeAttribute("data-wedding-theme");
		document.documentElement.style.removeProperty("--app-background");
	});

	it("leaves the bootstrapped accent alone while the query is in flight", async () => {
		// What the bootstrap script painted before hydration.
		document.documentElement.setAttribute("data-wedding-theme", "rose");
		await mockQueries({ identity: undefined });

		render(<WeddingTheme />);

		expect(document.documentElement.getAttribute("data-wedding-theme")).toBe(
			"rose",
		);
	});

	it("applies and remembers the couple's theme once it arrives", async () => {
		await mockQueries({
			identity: { coupleNames: "Ana & Bruno", theme: "oceano" },
		});

		render(<WeddingTheme />);

		expect(document.documentElement.getAttribute("data-wedding-theme")).toBe(
			"oceano",
		);
		expect(storage.getItem(THEME_STORAGE_KEY)).toBe("oceano");
	});

	it("falls back to the default for a couple with no theme", async () => {
		document.documentElement.setAttribute("data-wedding-theme", "rose");
		await mockQueries({
			identity: { coupleNames: "Ana & Bruno", theme: null },
		});

		render(<WeddingTheme />);

		expect(document.documentElement.getAttribute("data-wedding-theme")).toBe(
			"oliva",
		);
	});

	it("keeps the shipped photo until the background query answers", async () => {
		await mockQueries({ identity: undefined, background: undefined });

		render(<WeddingTheme />);

		expect(
			document.documentElement.style.getPropertyValue("--app-background"),
		).toBe("");
	});

	it("hands the palette back when it leaves the signed-in shell", async () => {
		await mockQueries({
			identity: { coupleNames: "Ana & Bruno", theme: "oceano" },
		});

		const { unmount } = render(<WeddingTheme />);
		expect(document.documentElement.getAttribute("data-wedding-theme")).toBe(
			"oceano",
		);
		unmount();

		expect(
			document.documentElement.getAttribute("data-wedding-theme"),
		).toBeNull();
	});

	it("applies the couple's own photo", async () => {
		await mockQueries({
			identity: { coupleNames: "Ana & Bruno", theme: "oliva" },
			background: "https://files.example/foto.png",
		});

		render(<WeddingTheme />);

		expect(
			document.documentElement.style.getPropertyValue("--app-background"),
		).toBe('url("https://files.example/foto.png")');
	});
});
