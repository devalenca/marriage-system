import { describe, expect, test } from "vitest";
import { canCreateUser } from "../../convex/lib/userCreation";

// Account creation policy: the superadmin (provisioning tenants), a wedding
// admin (adding members) and anyone (when public self-signup is on) can create
// accounts; otherwise only the very first account (bootstrap), for a configured
// superadmin e-mail.

describe("canCreateUser", () => {
	const superadminEmails = ["admin@example.com", "second@example.com"];
	const base = {
		callerIsSuperadmin: false,
		callerIsWeddingAdmin: false,
		selfSignupEnabled: false,
		anyUserExists: true,
		superadminEmails,
	};

	test("anyone can create an account when self-signup is enabled", () => {
		expect(
			canCreateUser({
				...base,
				selfSignupEnabled: true,
				email: "estranho@example.com",
			}),
		).toBe(true);
	});

	test("a stranger is rejected when self-signup is disabled", () => {
		expect(canCreateUser({ ...base, email: "estranho@example.com" })).toBe(
			false,
		);
	});

	test("superadmin caller can create any account", () => {
		expect(
			canCreateUser({
				...base,
				callerIsSuperadmin: true,
				email: "nova@example.com",
			}),
		).toBe(true);
	});

	test("wedding admin caller can create any account", () => {
		expect(
			canCreateUser({
				...base,
				callerIsWeddingAdmin: true,
				email: "membro@example.com",
			}),
		).toBe(true);
	});

	test("bootstrap: first account allowed for any configured superadmin e-mail", () => {
		expect(
			canCreateUser({
				...base,
				anyUserExists: false,
				email: "admin@example.com",
			}),
		).toBe(true);
		expect(
			canCreateUser({
				...base,
				anyUserExists: false,
				email: "second@example.com",
			}),
		).toBe(true);
		expect(
			canCreateUser({
				...base,
				anyUserExists: false,
				email: "intruso@example.com",
			}),
		).toBe(false);
	});

	test("self sign-up is rejected once any user exists", () => {
		expect(canCreateUser({ ...base, email: "admin@example.com" })).toBe(false);
	});

	test("fails closed without configured superadmins or with an empty e-mail", () => {
		expect(
			canCreateUser({
				...base,
				anyUserExists: false,
				email: "x@example.com",
				superadminEmails: [],
			}),
		).toBe(false);
		expect(
			canCreateUser({ ...base, callerIsSuperadmin: true, email: "  " }),
		).toBe(false);
	});
});
