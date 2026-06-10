import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL(".", import.meta.url)),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "convex",
					include: ["tests/convex/**/*.test.ts"],
					environment: "edge-runtime",
					// First test per file pays the edge-runtime cold start (~7s
					// when files run in parallel).
					testTimeout: 30000,
					server: { deps: { inline: ["convex-test"] } },
				},
			},
			{
				extends: true,
				test: {
					name: "unit",
					include: ["tests/unit/**/*.test.{ts,tsx}"],
					environment: "jsdom",
					setupFiles: ["./tests/setup.ts"],
				},
			},
		],
	},
});
