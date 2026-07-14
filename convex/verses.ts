import { todayInSaoPaulo } from "../lib/domain/dates";
import { dailyVerseIndex, SEED_VERSES } from "../lib/domain/verses";
import { internalMutation } from "./_generated/server";
import { authedQuery } from "./lib/auth";

/**
 * The verse of the day for the home screen — the same for everyone on a given
 * date, rotating daily. Sorted by reference so the rotation is stable
 * regardless of insertion order. Returns null before the base is seeded.
 */
export const daily = authedQuery({
	args: {},
	handler: async (ctx) => {
		const verses = await ctx.db.query("verses").collect();
		if (verses.length === 0) return null;
		verses.sort((a, b) => a.reference.localeCompare(b.reference, "pt-BR"));
		const index = dailyVerseIndex(todayInSaoPaulo(), verses.length);
		const verse = verses[index];
		if (verse === undefined) return null;
		return { reference: verse.reference, text: verse.text };
	},
});

/**
 * Idempotent: populates the verse base from the free/public-domain seed. Safe
 * to re-run; only inserts references that aren't there yet.
 */
export const seed = internalMutation({
	args: {},
	handler: async (ctx) => {
		let inserted = 0;
		for (const verse of SEED_VERSES) {
			const existing = await ctx.db
				.query("verses")
				.withIndex("by_reference", (q) => q.eq("reference", verse.reference))
				.first();
			if (existing === null) {
				await ctx.db.insert("verses", verse);
				inserted++;
			}
		}
		return { inserted };
	},
});
