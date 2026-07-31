import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The desktop rail: collapsed it must stay a clean icon column — every
// destination reachable, no duplicated brand mark, nothing clipped.

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
}));

import { AppNav } from "@/components/app-nav";
import { NAV_DESTINATIONS } from "@/components/nav-config";

describe("AppNav", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		useQueryMock.mockReturnValue(undefined);
	});

	function renderNav(collapsed: boolean) {
		return render(<AppNav collapsed={collapsed} onToggle={() => {}} />);
	}

	it("keeps every destination reachable when collapsed", () => {
		renderNav(true);
		const rail = screen.getByRole("complementary", { hidden: true });
		for (const item of NAV_DESTINATIONS) {
			expect(
				within(rail).getByRole("link", { name: item.label }),
			).toHaveAttribute("href", item.href);
		}
	});

	it("labels every collapsed icon for screen readers", () => {
		renderNav(true);
		const rail = screen.getByRole("complementary", { hidden: true });
		for (const link of within(rail).getAllByRole("link")) {
			expect(link.getAttribute("aria-label")).toBeTruthy();
		}
	});

	it("does not repeat the home mark above the Início row when collapsed", () => {
		renderNav(true);
		const rail = screen.getByRole("complementary", { hidden: true });
		const homeLinks = within(rail)
			.getAllByRole("link")
			.filter((link) => link.getAttribute("href") === "/dashboard");
		expect(homeLinks).toHaveLength(1);
	});

	it("shows the couple identity and labels when expanded", async () => {
		const { getFunctionName } = await import("convex/server");
		useQueryMock.mockImplementation((ref: never) =>
			getFunctionName(ref) === "weddings:currentIdentity"
				? { coupleNames: "Ana & Bruno", weddingDate: "2027-06-12" }
				: undefined,
		);
		renderNav(false);
		const rail = screen.getByRole("complementary", { hidden: true });
		expect(within(rail).getByText("Ana & Bruno")).toBeInTheDocument();
		expect(
			within(rail).getByRole("link", { name: /checklist/i }),
		).toBeInTheDocument();
	});

	it("keeps the rail's content at a fixed width in both states", () => {
		// The rail's width is the only thing that animates. If the content
		// column stretched to it instead, `flex-1` children would re-lay-out
		// on every frame and run their own (faster) transition — the search
		// button visibly finished before the sidebar did.
		for (const collapsed of [true, false]) {
			const { unmount } = renderNav(collapsed);
			const rail = screen.getByRole("complementary", { hidden: true });
			expect(rail.className).toContain("overflow-hidden");
			const column = rail.firstElementChild;
			expect(column?.className).toContain(collapsed ? "w-11" : "w-[14.5rem]");
			unmount();
		}
	});

	it("hides the admin entry from non-superadmins", () => {
		renderNav(true);
		expect(
			screen.queryByRole("link", { name: /administração/i }),
		).not.toBeInTheDocument();
	});
});
