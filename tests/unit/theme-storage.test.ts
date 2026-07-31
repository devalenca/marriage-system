import { beforeEach, describe, expect, it, vi } from "vitest";

// Signing out has to hand the palette back: the landing and the login page
// must never keep wearing the colours of whoever used this browser last.

import { THEME_STORAGE_KEY } from "@/lib/domain/themes";
import {
	AUTH_TOKEN_PREFIX,
	forgetWeddingTheme,
	shouldApplyStoredTheme,
} from "@/lib/theme-storage";

const AUTH_KEY = `${AUTH_TOKEN_PREFIX}_http1270013210`;

describe("shouldApplyStoredTheme", () => {
	it("applies the remembered accent while a session token is present", () => {
		expect(shouldApplyStoredTheme([AUTH_KEY, THEME_STORAGE_KEY])).toBe(true);
	});

	it("refuses once the session is gone, even with a theme still stored", () => {
		expect(shouldApplyStoredTheme([THEME_STORAGE_KEY])).toBe(false);
	});

	it("refuses on an untouched browser", () => {
		expect(shouldApplyStoredTheme([])).toBe(false);
	});

	it("is not fooled by a key that merely mentions the prefix", () => {
		expect(shouldApplyStoredTheme([`stale-${AUTH_TOKEN_PREFIX}`])).toBe(false);
	});
});

describe("forgetWeddingTheme", () => {
	beforeEach(() => {
		document.documentElement.removeAttribute("data-wedding-theme");
	});

	it("drops both the stored accent and the attribute", () => {
		const store = new Map([[THEME_STORAGE_KEY, "rose"]]);
		vi.stubGlobal("localStorage", {
			removeItem: (k: string) => void store.delete(k),
			getItem: (k: string) => store.get(k) ?? null,
		});
		document.documentElement.setAttribute("data-wedding-theme", "rose");

		forgetWeddingTheme();

		expect(store.has(THEME_STORAGE_KEY)).toBe(false);
		expect(
			document.documentElement.getAttribute("data-wedding-theme"),
		).toBeNull();
	});

	it("still clears the attribute when storage is blocked", () => {
		vi.stubGlobal("localStorage", {
			removeItem() {
				throw new Error("blocked");
			},
		});
		document.documentElement.setAttribute("data-wedding-theme", "lavanda");

		expect(() => forgetWeddingTheme()).not.toThrow();
		expect(
			document.documentElement.getAttribute("data-wedding-theme"),
		).toBeNull();
	});
});
