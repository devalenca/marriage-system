import { afterEach, describe, expect, it, vi } from "vitest";
import { isSuperadminEmail, superadminEmails } from "../../convex/lib/auth";

// AUTH_ADMIN_EMAIL may hold one operator or several (comma/semicolon list).

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("superadminEmails", () => {
	it("parses a single e-mail", () => {
		vi.stubEnv("AUTH_ADMIN_EMAIL", "gabriel@example.com");
		expect(superadminEmails()).toEqual(["gabriel@example.com"]);
	});

	it("parses a comma-separated list, trimming and lowercasing", () => {
		vi.stubEnv("AUTH_ADMIN_EMAIL", " Gabriel@example.com , Alice@example.com ");
		expect(superadminEmails()).toEqual([
			"gabriel@example.com",
			"alice@example.com",
		]);
	});

	it("supports semicolons and drops empty entries", () => {
		vi.stubEnv("AUTH_ADMIN_EMAIL", "a@example.com;;b@example.com;");
		expect(superadminEmails()).toEqual(["a@example.com", "b@example.com"]);
	});

	it("is empty when unset", () => {
		vi.stubEnv("AUTH_ADMIN_EMAIL", "");
		expect(superadminEmails()).toEqual([]);
	});
});

describe("isSuperadminEmail", () => {
	it("matches any e-mail in the list, case-insensitively", () => {
		vi.stubEnv("AUTH_ADMIN_EMAIL", "gabriel@example.com,alice@example.com");
		expect(isSuperadminEmail("ALICE@example.com")).toBe(true);
		expect(isSuperadminEmail("gabriel@example.com")).toBe(true);
	});

	it("rejects e-mails not in the list, and undefined", () => {
		vi.stubEnv("AUTH_ADMIN_EMAIL", "gabriel@example.com");
		expect(isSuperadminEmail("alice@example.com")).toBe(false);
		expect(isSuperadminEmail(undefined)).toBe(false);
	});
});
