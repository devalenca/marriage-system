import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { stubAuthTokenEnv } from "./authEnv";
import { setupUnauthenticatedTest } from "./helpers";

// Welcome email: scheduled (fire-and-forget) right after a wedding is
// created, for both the self-signup and the superadmin-provisioning paths.

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

beforeEach(() => {
	stubAuthTokenEnv();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("welcome email", () => {
	test("self-signup schedules a welcome email to the couple", async () => {
		const sent = stubResend();
		const t = setupUnauthenticatedTest();
		await t.action(api.auth.signIn, {
			provider: "password",
			params: {
				email: "casal@example.com",
				password: "senha-forte-123",
				flow: "signUp",
			},
		});
		const userId = await t.run(async (ctx) => {
			const user = (await ctx.db.query("users").collect())[0];
			return user._id;
		});
		const asUser = t.withIdentity({
			subject: `${userId}|session`,
			email: "casal@example.com",
		});
		await asUser.mutation(api.weddings.createForSelf, {
			coupleNames: "Ana & Bruno",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5_000_000,
			acceptedTerms: true,
		});
		await t.finishAllScheduledFunctions(vi.runAllTimers);

		const welcome = sent.find((m) => /bem-vindos/i.test(m.subject));
		expect(welcome).toBeTruthy();
		expect(welcome?.to).toBe("casal@example.com");
		expect(welcome?.html).toContain("Ana &amp; Bruno");
	});
});
