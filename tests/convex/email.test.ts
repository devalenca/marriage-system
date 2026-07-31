import { afterEach, describe, expect, test, vi } from "vitest";
import {
	emailFrom,
	escapeHtml,
	renderEmail,
	sendEmail,
} from "../../convex/lib/email";

// Transactional email plumbing (Resend HTTP API). The send is skipped —
// never crashes — when the deployment has no RESEND_API_KEY, so local dev
// works without any email setup.

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("emailFrom", () => {
	test("uses EMAIL_FROM when configured", () => {
		vi.stubEnv("EMAIL_FROM", "Nosso Casamento <contato@exemplo.com.br>");
		expect(emailFrom()).toBe("Nosso Casamento <contato@exemplo.com.br>");
	});

	test("falls back to the Resend test sender", () => {
		vi.stubEnv("EMAIL_FROM", "");
		expect(emailFrom()).toContain("onboarding@resend.dev");
	});
});

describe("sendEmail", () => {
	const message = {
		to: "casal@example.com",
		subject: "Bem-vindos!",
		html: "<p>Olá</p>",
	};

	test("skips silently when RESEND_API_KEY is missing", async () => {
		vi.stubEnv("RESEND_API_KEY", "");
		const fetchSpy = vi.fn();
		vi.stubGlobal("fetch", fetchSpy);
		await expect(sendEmail(message)).resolves.toBe("skipped");
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test("posts to the Resend API with the key and from address", async () => {
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
		vi.stubEnv("EMAIL_FROM", "Nosso Casamento <contato@exemplo.com.br>");
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ id: "email_1" }), { status: 200 }),
			);
		vi.stubGlobal("fetch", fetchSpy);

		await expect(sendEmail(message)).resolves.toBe("sent");

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe("https://api.resend.com/emails");
		expect(init.method).toBe("POST");
		expect(init.headers.Authorization).toBe("Bearer re_test_123");
		const body = JSON.parse(init.body);
		expect(body).toMatchObject({
			from: "Nosso Casamento <contato@exemplo.com.br>",
			to: "casal@example.com",
			subject: "Bem-vindos!",
		});
	});

	test("throws with the API error body on a failed send", async () => {
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ message: "domain not verified" }), {
					status: 403,
				}),
			),
		);
		await expect(sendEmail(message)).rejects.toThrowError(/403/);
	});
});

describe("renderEmail", () => {
	test("wraps heading and body in the branded pt-BR layout", () => {
		const html = renderEmail({
			heading: "Bem-vindos ao Nosso Casamento!",
			bodyHtml: "<p>Seu painel está pronto.</p>",
		});
		expect(html).toContain("Bem-vindos ao Nosso Casamento!");
		expect(html).toContain("<p>Seu painel está pronto.</p>");
		expect(html).toContain("Nosso Casamento");
	});

	test("renders an optional call-to-action button", () => {
		const html = renderEmail({
			heading: "Você foi convidado(a)",
			bodyHtml: "<p>Crie sua senha para entrar.</p>",
			ctaLabel: "Criar minha senha",
			ctaUrl: "https://app.example.com/convite?token=abc",
		});
		expect(html).toContain("Criar minha senha");
		expect(html).toContain("https://app.example.com/convite?token=abc");
	});
});

describe("escapeHtml", () => {
	test("escapes HTML-sensitive characters", () => {
		expect(escapeHtml(`<b>"Ana" & 'Bruno'</b>`)).toBe(
			"&lt;b&gt;&quot;Ana&quot; &amp; &#39;Bruno&#39;&lt;/b&gt;",
		);
	});
});
