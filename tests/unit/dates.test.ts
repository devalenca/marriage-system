import { describe, expect, it } from "vitest";
import {
	addMonthsISO,
	daysBetween,
	formatDateBR,
	isValidISODate,
	isValidISOTime,
	todayInSaoPaulo,
} from "@/lib/domain/dates";

describe("formatDateBR", () => {
	it("formats ISO date as dd/MM/yyyy", () => {
		expect(formatDateBR("2026-11-21")).toBe("21/11/2026");
	});

	it("pads day and month", () => {
		expect(formatDateBR("2026-01-05")).toBe("05/01/2026");
	});
});

describe("isValidISODate", () => {
	it("accepts a valid ISO date", () => {
		expect(isValidISODate("2026-02-28")).toBe(true);
	});

	it("rejects malformed strings", () => {
		expect(isValidISODate("21/11/2026")).toBe(false);
		expect(isValidISODate("2026-13-01")).toBe(false);
		expect(isValidISODate("2026-02-30")).toBe(false);
		expect(isValidISODate("")).toBe(false);
	});
});

describe("isValidISOTime", () => {
	it("accepts valid 24-hour times", () => {
		expect(isValidISOTime("00:00")).toBe(true);
		expect(isValidISOTime("15:30")).toBe(true);
		expect(isValidISOTime("23:59")).toBe(true);
	});

	it("rejects out-of-range or malformed times", () => {
		expect(isValidISOTime("24:00")).toBe(false);
		expect(isValidISOTime("15:60")).toBe(false);
		expect(isValidISOTime("9:5")).toBe(false); // unpadded
		expect(isValidISOTime("15h30")).toBe(false);
		expect(isValidISOTime("")).toBe(false);
	});
});

describe("daysBetween", () => {
	it("counts days from one date to another", () => {
		expect(daysBetween("2026-06-09", "2026-06-19")).toBe(10);
	});

	it("is negative when the target is in the past", () => {
		expect(daysBetween("2026-06-09", "2026-06-01")).toBe(-8);
	});

	it("is zero for the same day", () => {
		expect(daysBetween("2026-06-09", "2026-06-09")).toBe(0);
	});

	it("crosses month and year boundaries", () => {
		expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
	});
});

describe("addMonthsISO", () => {
	it("adds months keeping the day", () => {
		expect(addMonthsISO("2026-06-15", 3)).toBe("2026-09-15");
	});

	it("clamps the day at shorter months", () => {
		expect(addMonthsISO("2026-01-31", 1)).toBe("2026-02-28");
	});

	it("subtracts months with negative input", () => {
		expect(addMonthsISO("2026-11-21", -12)).toBe("2025-11-21");
	});

	it("crosses year boundaries forward", () => {
		expect(addMonthsISO("2026-11-21", 2)).toBe("2027-01-21");
	});
});

describe("todayInSaoPaulo", () => {
	it("returns an ISO date string", () => {
		expect(isValidISODate(todayInSaoPaulo())).toBe(true);
	});
});
