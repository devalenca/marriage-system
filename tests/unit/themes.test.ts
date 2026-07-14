import { describe, expect, it } from "vitest";
import {
	DEFAULT_THEME,
	isWeddingTheme,
	resolveTheme,
	WEDDING_THEMES,
} from "@/lib/domain/themes";

describe("wedding themes", () => {
	it("exposes a stable default that is itself a valid theme", () => {
		expect(isWeddingTheme(DEFAULT_THEME)).toBe(true);
	});

	it("recognizes every catalog id and rejects unknown ones", () => {
		for (const theme of WEDDING_THEMES) {
			expect(isWeddingTheme(theme.id)).toBe(true);
		}
		expect(isWeddingTheme("neon")).toBe(false);
		expect(isWeddingTheme(undefined)).toBe(false);
	});

	it("resolves absent or invalid values to the default", () => {
		expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
		expect(resolveTheme("neon")).toBe(DEFAULT_THEME);
		expect(resolveTheme("terracota")).toBe("terracota");
	});
});
