import { describe, expect, test } from "vitest";
import { canCreateUser } from "../../convex/lib/userCreation";

// Account creation policy: the authenticated admin can always create
// accounts; otherwise only the very first account (bootstrap) is allowed,
// and only for the admin e-mail. Everything else is rejected.

describe("canCreateUser", () => {
	const adminEmail = "admin@example.com";

	test("admin caller can create any account", () => {
		expect(
			canCreateUser({
				callerIsAdmin: true,
				anyUserExists: true,
				email: "nova@example.com",
				adminEmail,
			}),
		).toBe(true);
	});

	test("bootstrap: first account allowed only for the admin e-mail", () => {
		expect(
			canCreateUser({
				callerIsAdmin: false,
				anyUserExists: false,
				email: "ADMIN@example.com ",
				adminEmail,
			}),
		).toBe(true);
		expect(
			canCreateUser({
				callerIsAdmin: false,
				anyUserExists: false,
				email: "intruso@example.com",
				adminEmail,
			}),
		).toBe(false);
	});

	test("self sign-up is rejected once any user exists", () => {
		expect(
			canCreateUser({
				callerIsAdmin: false,
				anyUserExists: true,
				email: adminEmail,
				adminEmail,
			}),
		).toBe(false);
	});

	test("fails closed without a configured admin e-mail or empty e-mail", () => {
		expect(
			canCreateUser({
				callerIsAdmin: false,
				anyUserExists: false,
				email: "x@example.com",
				adminEmail: "",
			}),
		).toBe(false);
		expect(
			canCreateUser({
				callerIsAdmin: true,
				anyUserExists: true,
				email: "  ",
				adminEmail,
			}),
		).toBe(false);
	});
});
