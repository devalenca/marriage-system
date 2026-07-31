import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { stubAuthTokenEnv } from "./authEnv";
import { setupUnauthenticatedTest } from "./helpers";

// "Minha conta": every signed-in user can change their own password and,
// with a verification code sent to the new address, their own e-mail.

const EMAIL = "ana@example.com";
const PASSWORD = "senha-atual-123";

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
	if (!match) throw new Error("no code found in email html");
	return match[1];
}

/** Signs up a real account (auth rows included) and returns an identified accessor. */
async function setupAccountTest() {
	const t = setupUnauthenticatedTest();
	await t.action(api.auth.signIn, {
		provider: "password",
		params: { email: EMAIL, password: PASSWORD, flow: "signUp" },
	});
	const userId = await t.run(async (ctx) => {
		const user = (await ctx.db.query("users").collect()).find(
			(u) => u.email === EMAIL,
		);
		if (!user) throw new Error("user not created");
		return user._id;
	});
	return {
		t,
		userId,
		asUser: t.withIdentity({ subject: `${userId}|session`, email: EMAIL }),
	};
}

beforeEach(() => {
	stubAuthTokenEnv();
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("account.changePassword", () => {
	test("changes the password after verifying the current one", async () => {
		stubResend();
		const { t, asUser } = await setupAccountTest();
		await asUser.action(api.account.changePassword, {
			currentPassword: PASSWORD,
			newPassword: "senha-nova-456",
		});

		await expect(
			t.action(api.auth.signIn, {
				provider: "password",
				params: { email: EMAIL, password: PASSWORD, flow: "signIn" },
			}),
		).rejects.toThrowError();
		const signedIn = await t.action(api.auth.signIn, {
			provider: "password",
			params: { email: EMAIL, password: "senha-nova-456", flow: "signIn" },
		});
		expect(signedIn.tokens).toBeTruthy();
	});

	test("rejects a wrong current password", async () => {
		stubResend();
		const { asUser } = await setupAccountTest();
		await expect(
			asUser.action(api.account.changePassword, {
				currentPassword: "senha-errada-999",
				newPassword: "senha-nova-456",
			}),
		).rejects.toThrowError(/senha atual/i);
	});

	test("rejects a short new password", async () => {
		stubResend();
		const { asUser } = await setupAccountTest();
		await expect(
			asUser.action(api.account.changePassword, {
				currentPassword: PASSWORD,
				newPassword: "curta",
			}),
		).rejects.toThrowError(/8 caracteres/i);
	});

	test("rejects anonymous callers", async () => {
		stubResend();
		const { t } = await setupAccountTest();
		await expect(
			t.action(api.account.changePassword, {
				currentPassword: PASSWORD,
				newPassword: "senha-nova-456",
			}),
		).rejects.toThrowError();
	});
});

describe("account e-mail change", () => {
	test("emails a code to the new address and applies the change", async () => {
		const sent = stubResend();
		const { t, asUser } = await setupAccountTest();

		await asUser.action(api.account.requestEmailChange, {
			newEmail: "ana.nova@example.com",
			password: PASSWORD,
		});
		const codeEmail = sent.at(-1);
		expect(codeEmail?.to).toBe("ana.nova@example.com");

		await asUser.action(api.account.confirmEmailChange, {
			code: codeFrom(codeEmail?.html ?? ""),
		});

		// The user doc AND the credential id follow the new e-mail: the same
		// password now signs in under the new address only.
		const email = await t.run(async (ctx) => {
			const users = await ctx.db.query("users").collect();
			return users[0]?.email;
		});
		expect(email).toBe("ana.nova@example.com");
		const signedIn = await t.action(api.auth.signIn, {
			provider: "password",
			params: {
				email: "ana.nova@example.com",
				password: PASSWORD,
				flow: "signIn",
			},
		});
		expect(signedIn.tokens).toBeTruthy();
		await expect(
			t.action(api.auth.signIn, {
				provider: "password",
				params: { email: EMAIL, password: PASSWORD, flow: "signIn" },
			}),
		).rejects.toThrowError();
	});

	test("requires the correct password to request the change", async () => {
		stubResend();
		const { asUser } = await setupAccountTest();
		await expect(
			asUser.action(api.account.requestEmailChange, {
				newEmail: "ana.nova@example.com",
				password: "senha-errada-999",
			}),
		).rejects.toThrowError(/senha/i);
	});

	test("rejects a code that does not match", async () => {
		stubResend();
		const { asUser } = await setupAccountTest();
		await asUser.action(api.account.requestEmailChange, {
			newEmail: "ana.nova@example.com",
			password: PASSWORD,
		});
		await expect(
			asUser.action(api.account.confirmEmailChange, { code: "00000000" }),
		).rejects.toThrowError(/código/i);
	});

	test("rejects an e-mail already in use", async () => {
		stubResend();
		const { t, asUser } = await setupAccountTest();
		await t.run(async (ctx) => {
			await ctx.db.insert("users", { email: "ocupado@example.com" });
		});
		await expect(
			asUser.action(api.account.requestEmailChange, {
				newEmail: "ocupado@example.com",
				password: PASSWORD,
			}),
		).rejects.toThrowError(/já existe/i);
	});

	test("blocks the superadmin (email is pinned by deployment config)", async () => {
		stubResend();
		vi.stubEnv("AUTH_ADMIN_EMAIL", EMAIL);
		const { asUser } = await setupAccountTest();
		await expect(
			asUser.action(api.account.requestEmailChange, {
				newEmail: "ana.nova@example.com",
				password: PASSWORD,
			}),
		).rejects.toThrowError(/administrador/i);
	});
});
