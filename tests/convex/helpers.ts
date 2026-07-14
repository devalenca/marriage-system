/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import schema from "../../convex/schema";

// convex-test needs every function module including _generated (.ts and .js).
export const modules = import.meta.glob([
	"../../convex/**/*.{js,ts}",
	"!../../convex/**/*.test.ts",
	"!../../convex/**/*.d.ts",
]);

/** Raw backend accessor with NO identity — for testing auth rejection. */
export function setupUnauthenticatedTest() {
	return convexTest(schema, modules);
}

/** Backend accessor signed in as the couple — the normal test entry point. */
export function setupTest() {
	return convexTest(schema, modules).withIdentity({
		subject: "test-user",
		email: "casal@example.com",
	});
}

/**
 * Multi-tenant test entry point: two weddings, each with one admin user.
 * `asCoupleA`/`asCoupleB` are signed-in accessors; use them to prove both
 * normal behavior and that wedding A never sees wedding B's rows.
 */
export async function setupWeddingScopedTest() {
	const t = convexTest(schema, modules);
	const ids = await t.run(async (ctx) => {
		const weddingA = await ctx.db.insert("weddings", {
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5_000_000,
		});
		const weddingB = await ctx.db.insert("weddings", {
			coupleNames: "Carla & Diego",
			weddingDate: "2027-09-25",
			budgetGoalCents: 8_000_000,
		});
		const userA = await ctx.db.insert("users", { email: "ana@example.com" });
		const userB = await ctx.db.insert("users", { email: "carla@example.com" });
		await ctx.db.insert("memberships", {
			weddingId: weddingA,
			userId: userA,
			role: "admin",
		});
		await ctx.db.insert("memberships", {
			weddingId: weddingB,
			userId: userB,
			role: "admin",
		});
		return { weddingA, weddingB, userA, userB };
	});
	return {
		t,
		...ids,
		asCoupleA: t.withIdentity({
			subject: `${ids.userA}|session`,
			email: "ana@example.com",
		}),
		asCoupleB: t.withIdentity({
			subject: `${ids.userB}|session`,
			email: "carla@example.com",
		}),
	};
}
