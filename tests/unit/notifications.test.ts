import { describe, expect, test } from "vitest";
import {
	digestPayments,
	shouldSendPaymentDigest,
	subscriptionReminderDaysLeft,
} from "../../lib/domain/notifications";

// Daily reminder selection: nudge on D-7, D-3, D-1, the due day and the day
// after (newly overdue) — never every single day, to avoid inbox fatigue.

const TODAY = "2026-08-10";

function payment(dueDate: string, description = "Parcela") {
	return {
		description,
		vendorName: "Buffet Sabor",
		amountCents: 150_000,
		dueDate,
	};
}

describe("shouldSendPaymentDigest", () => {
	test.each([
		["2026-08-17", true], // D-7
		["2026-08-13", true], // D-3
		["2026-08-11", true], // D-1
		["2026-08-10", true], // due today
		["2026-08-09", true], // newly overdue (D+1)
		["2026-08-15", false], // D-5 — quiet day
		["2026-08-01", false], // long overdue — already nudged
		["2026-09-10", false], // far future
	])("due %s → %s", (dueDate, expected) => {
		expect(shouldSendPaymentDigest([payment(dueDate)], TODAY)).toBe(expected);
	});

	test("empty list never triggers", () => {
		expect(shouldSendPaymentDigest([], TODAY)).toBe(false);
	});
});

describe("digestPayments", () => {
	test("splits overdue from upcoming (14-day window), sorted by due date", () => {
		const { overdue, upcoming } = digestPayments(
			[
				payment("2026-08-09", "Atrasada"),
				payment("2026-08-01", "Bem atrasada"),
				payment("2026-08-12", "Em breve"),
				payment("2026-08-24", "Na janela"),
				payment("2026-08-25", "Fora da janela"),
			],
			TODAY,
		);
		expect(overdue.map((p) => p.description)).toEqual([
			"Bem atrasada",
			"Atrasada",
		]);
		expect(upcoming.map((p) => p.description)).toEqual([
			"Em breve",
			"Na janela",
		]);
	});
});

describe("subscriptionReminderDaysLeft", () => {
	test.each([
		["2026-08-17", 7],
		["2026-08-13", 3],
		["2026-08-11", 1],
	])("expiring %s → reminds with %s days left", (activeUntil, days) => {
		expect(subscriptionReminderDaysLeft(activeUntil, TODAY)).toBe(days);
	});

	test("quiet on non-trigger days and when unlimited", () => {
		expect(subscriptionReminderDaysLeft("2026-08-20", TODAY)).toBeNull();
		expect(subscriptionReminderDaysLeft("2026-08-09", TODAY)).toBeNull();
		expect(subscriptionReminderDaysLeft(undefined, TODAY)).toBeNull();
	});
});
