import { describe, expect, it } from "vitest";
import {
	isSubscriptionActive,
	subscriptionStatus,
	TRIAL_DAYS,
	trialUntil,
} from "@/lib/domain/subscription";

describe("isSubscriptionActive", () => {
	it("treats a missing date as unlimited (grandfathered/comped weddings)", () => {
		expect(isSubscriptionActive(undefined, "2026-07-14")).toBe(true);
	});

	it("is active on and before the expiry date", () => {
		expect(isSubscriptionActive("2026-07-14", "2026-07-14")).toBe(true);
		expect(isSubscriptionActive("2026-07-20", "2026-07-14")).toBe(true);
	});

	it("is expired the day after the expiry date", () => {
		expect(isSubscriptionActive("2026-07-13", "2026-07-14")).toBe(false);
	});
});

describe("trialUntil", () => {
	it("adds the trial window to the start date", () => {
		expect(trialUntil("2026-07-14")).toBe(
			// 14 days after 2026-07-14
			"2026-07-28",
		);
		expect(TRIAL_DAYS).toBe(14);
	});
});

describe("subscriptionStatus", () => {
	it("reports days left while active", () => {
		expect(subscriptionStatus("2026-07-20", "2026-07-14")).toEqual({
			active: true,
			activeUntil: "2026-07-20",
			daysLeft: 6,
		});
	});

	it("reports zero days left on the expiry day (still active)", () => {
		expect(subscriptionStatus("2026-07-14", "2026-07-14")).toEqual({
			active: true,
			activeUntil: "2026-07-14",
			daysLeft: 0,
		});
	});

	it("reports negative days left once expired", () => {
		expect(subscriptionStatus("2026-07-10", "2026-07-14")).toEqual({
			active: false,
			activeUntil: "2026-07-10",
			daysLeft: -4,
		});
	});

	it("reports unlimited when there is no date", () => {
		expect(subscriptionStatus(undefined, "2026-07-14")).toEqual({
			active: true,
			activeUntil: null,
			daysLeft: null,
		});
	});
});
