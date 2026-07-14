import { describe, expect, it } from "vitest";
import { dailyVerseIndex, SEED_VERSES } from "@/lib/domain/verses";

describe("dailyVerseIndex", () => {
	it("stays within range and is stable for a given day", () => {
		const count = SEED_VERSES.length;
		const a = dailyVerseIndex("2026-07-14", count);
		const b = dailyVerseIndex("2026-07-14", count);
		expect(a).toBe(b);
		expect(a).toBeGreaterThanOrEqual(0);
		expect(a).toBeLessThan(count);
	});

	it("advances by one each day and wraps around", () => {
		const count = SEED_VERSES.length;
		const d1 = dailyVerseIndex("2026-07-14", count);
		const d2 = dailyVerseIndex("2026-07-15", count);
		expect(d2).toBe((d1 + 1) % count);
	});

	it("is safe with an empty base", () => {
		expect(dailyVerseIndex("2026-07-14", 0)).toBe(0);
	});
});

describe("SEED_VERSES", () => {
	it("has unique references and non-empty texts", () => {
		const refs = new Set(SEED_VERSES.map((v) => v.reference));
		expect(refs.size).toBe(SEED_VERSES.length);
		for (const verse of SEED_VERSES) {
			expect(verse.text.trim().length).toBeGreaterThan(0);
		}
	});
});
