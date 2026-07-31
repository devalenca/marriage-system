import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// When a popup locks the document, the scrollbar's width must stay reserved —
// otherwise the whole layout slides sideways for as long as the popup is open.

import { ScrollLockGutter } from "@/components/scroll-lock-gutter";

const SCROLLBAR = 12;

/** jsdom reports no scrollbar, so the probe's measurement is stubbed. */
function stubScrollbarWidth(width: number) {
	Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
		configurable: true,
		get() {
			return this.style.overflow === "scroll" ? 100 : 0;
		},
	});
	Object.defineProperty(HTMLElement.prototype, "clientWidth", {
		configurable: true,
		get() {
			return this.style.overflow === "scroll" ? 100 - width : 0;
		},
	});
}

/** The observer is async; let its microtask flush. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ScrollLockGutter", () => {
	beforeEach(() => {
		stubScrollbarWidth(SCROLLBAR);
		document.documentElement.style.cssText = "";
		document.body.style.cssText = "";
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reserves the scrollbar's width while the body is locked", async () => {
		render(<ScrollLockGutter />);

		document.body.style.overflowY = "hidden";
		await settle();

		expect(document.body.style.paddingRight).toBe(`${SCROLLBAR}px`);
	});

	it("gives the space back when the popup closes", async () => {
		render(<ScrollLockGutter />);

		document.body.style.overflowY = "hidden";
		await settle();
		document.body.style.overflowY = "";
		await settle();

		expect(document.body.style.paddingRight).toBe("");
	});

	it("pads the html element when that is what got locked", async () => {
		render(<ScrollLockGutter />);

		document.documentElement.style.overflowY = "hidden";
		await settle();

		expect(document.documentElement.style.paddingRight).toBe(`${SCROLLBAR}px`);
		expect(document.body.style.paddingRight).toBe("");
	});

	it("stays out of the way when scrollbars are overlaid", async () => {
		stubScrollbarWidth(0);
		render(<ScrollLockGutter />);

		document.body.style.overflowY = "hidden";
		await settle();

		expect(document.body.style.paddingRight).toBe("");
	});

	it("cleans up after itself on unmount", async () => {
		const { unmount } = render(<ScrollLockGutter />);

		document.body.style.overflowY = "hidden";
		await settle();
		unmount();

		expect(document.body.style.paddingRight).toBe("");
	});
});
