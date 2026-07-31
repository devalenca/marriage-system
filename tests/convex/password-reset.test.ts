import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { generateNumericCode } from "../../convex/lib/otp";
import { stubAuthTokenEnv } from "./authEnv";
import { setupUnauthenticatedTest } from "./helpers";

// Self-service password reset: the login page requests a numeric code by
// email (Resend) and exchanges it plus a new password for a session.

const EMAIL = "casal@example.com";
const OLD_PASSWORD = "senha-antiga-123";
const NEW_PASSWORD = "senha-nova-456";

/** Captures emails "sent" through the stubbed Resend API. */
function stubResend() {
	const sent: { to: string; subject: string; html: string }[] = [];
	vi.stubEnv("RESEND_API_KEY", "re_test_123");
	vi.stubGlobal(
		"fetch",
		vi.fn(async (_url: string, init: RequestInit) => {
			sent.push(JSON.parse(String(init.body)));
			return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
		}),
	);
	return sent;
}

function codeFrom(html: string): string {
	const match = html.match(/\b(\d{8})\b/);
	if (!match?.[1]) throw new Error("no code found in email html");
	return match[1];
}

beforeEach(() => {
	stubAuthTokenEnv();
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("generateNumericCode", () => {
	test("returns only digits at the requested length", () => {
		for (let i = 0; i < 20; i++) {
			expect(generateNumericCode(8)).toMatch(/^\d{8}$/);
		}
	});

	test("is not constant", () => {
		const codes = new Set(
			Array.from({ length: 20 }, () => generateNumericCode(8)),
		);
		expect(codes.size).toBeGreaterThan(1);
	});
});

describe("password reset flow", () => {
	test("emails a code and accepts it with a new password", async () => {
		const sent = stubResend();
		const t = setupUnauthenticatedTest();
		await t.action(api.auth.signIn, {
			provider: "password",
			params: { email: EMAIL, password: OLD_PASSWORD, flow: "signUp" },
		});

		await t.action(api.auth.signIn, {
			provider: "password",
			params: { email: EMAIL, flow: "reset" },
		});
		const resetEmail = sent.at(-1);
		expect(resetEmail?.to).toBe(EMAIL);
		expect(resetEmail?.subject).toMatch(/senha/i);

		const result = await t.action(api.auth.signIn, {
			provider: "password",
			params: {
				email: EMAIL,
				code: codeFrom(resetEmail?.html ?? ""),
				newPassword: NEW_PASSWORD,
				flow: "reset-verification",
			},
		});
		expect(result.tokens).toBeTruthy();

		// The old password no longer signs in; the new one does.
		await expect(
			t.action(api.auth.signIn, {
				provider: "password",
				params: { email: EMAIL, password: OLD_PASSWORD, flow: "signIn" },
			}),
		).rejects.toThrowError();
		const signedIn = await t.action(api.auth.signIn, {
			provider: "password",
			params: { email: EMAIL, password: NEW_PASSWORD, flow: "signIn" },
		});
		expect(signedIn.tokens).toBeTruthy();
	});

	test("rejects a wrong code", async () => {
		const sent = stubResend();
		const t = setupUnauthenticatedTest();
		await t.action(api.auth.signIn, {
			provider: "password",
			params: { email: EMAIL, password: OLD_PASSWORD, flow: "signUp" },
		});
		await t.action(api.auth.signIn, {
			provider: "password",
			params: { email: EMAIL, flow: "reset" },
		});
		expect(sent.length).toBeGreaterThan(0);
		await expect(
			t.action(api.auth.signIn, {
				provider: "password",
				params: {
					email: EMAIL,
					code: "00000000",
					newPassword: NEW_PASSWORD,
					flow: "reset-verification",
				},
			}),
		).rejects.toThrowError();
	});

	test("rejects reset for an unknown e-mail", async () => {
		stubResend();
		const t = setupUnauthenticatedTest();
		await expect(
			t.action(api.auth.signIn, {
				provider: "password",
				params: { email: "ninguem@example.com", flow: "reset" },
			}),
		).rejects.toThrowError();
	});
});
