import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

describe("settings", () => {
	it("returns null before onboarding", async () => {
		const t = setupTest();
		expect(await t.query(api.settings.get, {})).toBeNull();
	});

	it("saves and reads the couple's configuration", async () => {
		const t = setupTest();
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		});

		const settings = await t.query(api.settings.get, {});
		expect(settings).toMatchObject({
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		});
	});

	it("updates the singleton instead of creating a second row", async () => {
		const t = setupTest();
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		});
		await t.mutation(api.settings.save, {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-09-25",
			budgetGoalCents: 6000000,
		});

		const settings = await t.query(api.settings.get, {});
		expect(settings?.weddingDate).toBe("2027-09-25");
		expect(settings?.budgetGoalCents).toBe(6000000);

		const all = await t.run(async (ctx) => ctx.db.query("settings").collect());
		expect(all).toHaveLength(1);
	});

	it("rejects an invalid wedding date", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.settings.save, {
				coupleNames: "Gabriel & Alice",
				weddingDate: "12/06/2027",
				budgetGoalCents: 5500000,
			}),
		).rejects.toThrow();
	});

	it("rejects a negative budget goal", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.settings.save, {
				coupleNames: "Gabriel & Alice",
				weddingDate: "2027-06-12",
				budgetGoalCents: -1,
			}),
		).rejects.toThrow();
	});
});
