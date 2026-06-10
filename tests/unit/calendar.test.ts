import { describe, expect, it } from "vitest";
import { monthGrid, monthLabelPT, shiftMonth } from "@/lib/domain/calendar";

describe("monthLabelPT", () => {
	it("labels a month in pt-BR", () => {
		expect(monthLabelPT("2026-06")).toBe("junho de 2026");
		expect(monthLabelPT("2027-01")).toBe("janeiro de 2027");
	});
});

describe("shiftMonth", () => {
	it("moves forward and backward across years", () => {
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
		expect(shiftMonth("2026-01", -1)).toBe("2025-12");
		expect(shiftMonth("2026-06", 0)).toBe("2026-06");
	});
});

describe("monthGrid", () => {
	it("builds full weeks starting on Sunday", () => {
		// June 2026 starts on a Monday and ends on a Tuesday.
		const grid = monthGrid("2026-06");

		expect(grid.length % 7).toBe(0);
		expect(grid[0]?.date).toBe("2026-05-31"); // Sunday before
		expect(grid[0]?.inMonth).toBe(false);
		expect(grid[1]?.date).toBe("2026-06-01");
		expect(grid[1]?.inMonth).toBe(true);
		expect(grid.at(-1)?.date).toBe("2026-07-04"); // Saturday after
	});

	it("contains every day of the month exactly once", () => {
		const grid = monthGrid("2026-02");
		const inMonth = grid.filter((d) => d.inMonth);
		expect(inMonth).toHaveLength(28);
		expect(inMonth[0]?.date).toBe("2026-02-01");
		expect(inMonth.at(-1)?.date).toBe("2026-02-28");
	});
});
