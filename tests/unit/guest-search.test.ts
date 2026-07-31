import { describe, expect, test } from "vitest";
import { matchesGuestSearch } from "../../lib/domain/guests";

// Day-of check-in search: finding one name among 150 must be forgiving —
// accents, case and partial words all match.

describe("matchesGuestSearch", () => {
	test("empty search matches everything", () => {
		expect(matchesGuestSearch("Qualquer Um", "")).toBe(true);
		expect(matchesGuestSearch("Qualquer Um", "   ")).toBe(true);
	});

	test("ignores case and accents", () => {
		expect(matchesGuestSearch("Antônio Gonçalves", "antonio")).toBe(true);
		expect(matchesGuestSearch("Antonio Goncalves", "ANTÔNIO")).toBe(true);
		expect(matchesGuestSearch("Inês", "ines")).toBe(true);
	});

	test("matches on any part of the name", () => {
		expect(matchesGuestSearch("Maria Eduarda Silva", "eduarda")).toBe(true);
		expect(matchesGuestSearch("Maria Eduarda Silva", "silva")).toBe(true);
	});

	test("rejects a name that does not contain the term", () => {
		expect(matchesGuestSearch("Maria Eduarda", "joao")).toBe(false);
	});
});
