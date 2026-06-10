/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import schema from "../../convex/schema";

// convex-test needs every function module including _generated (.ts and .js).
export const modules = import.meta.glob([
	"../../convex/**/*.{js,ts}",
	"!../../convex/**/*.test.ts",
	"!../../convex/**/*.d.ts",
]);

export function setupTest() {
	return convexTest(schema, modules);
}
