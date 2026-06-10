import { describe, expect, test } from "vitest";
import { assertEmailAllowed } from "../../convex/lib/allowlist";

// Sign-up gate: only e-mails listed in AUTH_ALLOWED_EMAILS (comma-separated)
// may create an account. Missing/empty allowlist denies everyone — a
// misconfigured deployment must fail closed, not open.

describe("assertEmailAllowed", () => {
	test("allows an e-mail present in the list", () => {
		expect(() =>
			assertEmailAllowed("ana@example.com", "ana@example.com,bia@example.com"),
		).not.toThrow();
	});

	test("is case-insensitive and ignores surrounding spaces", () => {
		expect(() =>
			assertEmailAllowed(
				"Ana@Example.com",
				" ana@example.com , bia@example.com ",
			),
		).not.toThrow();
	});

	test("rejects an e-mail not in the list", () => {
		expect(() =>
			assertEmailAllowed("intruso@example.com", "ana@example.com"),
		).toThrowError(/não autorizado/i);
	});

	test("rejects everyone when the allowlist is undefined", () => {
		expect(() => assertEmailAllowed("ana@example.com", undefined)).toThrowError(
			/não autorizado/i,
		);
	});

	test("rejects everyone when the allowlist is empty", () => {
		expect(() => assertEmailAllowed("ana@example.com", "  ")).toThrowError(
			/não autorizado/i,
		);
	});

	test("rejects an empty e-mail", () => {
		expect(() => assertEmailAllowed("", "ana@example.com")).toThrowError(
			/não autorizado/i,
		);
	});
});
