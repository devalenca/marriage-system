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
