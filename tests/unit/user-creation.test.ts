import { describe, expect, test } from "vitest";
import { canCreateUser } from "../../convex/lib/userCreation";

// Account creation policy: the superadmin (provisioning tenants) and a wedding
// admin (adding members) can create accounts; otherwise only the very first
// account (bootstrap) is allowed, and only for the superadmin e-mail.

describe("canCreateUser", () => {
	const adminEmail = "admin@example.com";
	const base = {
		callerIsSuperadmin: false,
		callerIsWeddingAdmin: false,
		anyUserExists: true,
		adminEmail,
	};

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

	test("bootstrap: first account allowed only for the superadmin e-mail", () => {
		expect(
			canCreateUser({
				...base,
				anyUserExists: false,
				email: "ADMIN@example.com ",
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
		expect(canCreateUser({ ...base, email: adminEmail })).toBe(false);
	});

	test("fails closed without a configured superadmin e-mail or empty e-mail", () => {
		expect(
			canCreateUser({
				...base,
				anyUserExists: false,
				email: "x@example.com",
				adminEmail: "",
			}),
		).toBe(false);
		expect(
			canCreateUser({ ...base, callerIsSuperadmin: true, email: "  " }),
		).toBe(false);
	});
});
