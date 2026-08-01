import { afterEach, describe, expect, test, vi } from "vitest";
import {
	chooseTransport,
	codeBlock,
	emailFrom,
	escapeHtml,
	renderEmail,
	sendEmail,
} from "../../convex/lib/email";

// Transactional email plumbing. Two transports — Resend, or the web app's
// SMTP relay for a personal mailbox — and a silent no-op when neither is
// configured, so local dev and this suite need no email setup at all.

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
		vi.stubEnv("SMTP_USER", "");
		expect(emailFrom()).toContain("onboarding@resend.dev");
	});

	test("defaults to the SMTP mailbox, which Gmail requires as sender", () => {
		vi.stubEnv("EMAIL_FROM", "");
		vi.stubEnv("SMTP_USER", "gabriel@gmail.com");
		expect(emailFrom()).toBe("Nosso Casamento <gabriel@gmail.com>");
	});
});

describe("chooseTransport", () => {
	test("prefers Resend, the sender with a domain behind it", () => {
		expect(
			chooseTransport({
				RESEND_API_KEY: "re_1",
				EMAIL_RELAY_SECRET: "s3cret",
			}),
		).toBe("resend");
	});

	test("falls back to the mailbox relay while there is no domain", () => {
		expect(chooseTransport({ EMAIL_RELAY_SECRET: "s3cret" })).toBe("relay");
	});

	test("reports none on an unconfigured deployment", () => {
		expect(chooseTransport({})).toBe("none");
		expect(chooseTransport({ RESEND_API_KEY: " " })).toBe("none");
	});
});

describe("sendEmail", () => {
	const message = {
		to: "casal@example.com",
		subject: "Bem-vindos!",
		html: "<p>Olá</p>",
	};
	test("skips silently when no transport is configured", async () => {
		vi.stubEnv("RESEND_API_KEY", "");
		vi.stubEnv("EMAIL_RELAY_SECRET", "");
		const fetchSpy = vi.fn();
		vi.stubGlobal("fetch", fetchSpy);

		await expect(sendEmail(message)).resolves.toBe("skipped");

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test("hands relay sends to the app's route with the shared secret", async () => {
		vi.stubEnv("RESEND_API_KEY", "");
		vi.stubEnv("EMAIL_RELAY_SECRET", "s3cret-relay-token");
		vi.stubEnv("SITE_URL", "https://app.example.com/");
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchSpy);

		await expect(sendEmail(message)).resolves.toBe("sent");

		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe("https://app.example.com/api/email");
		expect(init.headers.Authorization).toBe("Bearer s3cret-relay-token");
		expect(JSON.parse(init.body)).toEqual(message);
	});

	test("surfaces what the relay answered on a failed send", async () => {
		vi.stubEnv("RESEND_API_KEY", "");
		vi.stubEnv("EMAIL_RELAY_SECRET", "s3cret-relay-token");
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response("Invalid login: 535-5.7.8", { status: 502 }),
				),
		);

		await expect(sendEmail(message)).rejects.toThrowError(/535-5\.7\.8/);
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

	test("declares UTF-8, without which the accents arrive as garbage", () => {
		const html = renderEmail({
			heading: "Confirme seu e-mail",
			bodyHtml: "<p>Cerimônia às três horas, com refeição e coração.</p>",
		});
		expect(html).toContain('<meta charset="utf-8">');
		// The copy travels as real characters — no entities, no stripping.
		expect(html).toContain("Cerimônia às três horas, com refeição e coração.");
	});

	test("hides the preview line from the body but not from the inbox", () => {
		const html = renderEmail({
			heading: "Pagamentos no radar",
			preview: "Duas parcelas vencem esta semana.",
			bodyHtml: "<p>Resumo</p>",
		});
		expect(html).toContain("Duas parcelas vencem esta semana.");
		expect(html).toMatch(/display:none[^"]*">Duas parcelas/);
	});

	test("renders the small print under the call to action", () => {
		const html = renderEmail({
			heading: "Você foi convidado(a)",
			bodyHtml: "<p>Entre.</p>",
			ctaLabel: "Criar minha senha",
			ctaUrl: "https://app.example.com/convite?token=abc",
			footnote: "O convite vale por 7 dias.",
		});
		expect(html).toContain("O convite vale por 7 dias.");
		expect(html.indexOf("Criar minha senha")).toBeLessThan(
			html.indexOf("O convite vale por 7 dias."),
		);
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

describe("codeBlock", () => {
	test("presents the code as one readable, typeable block", () => {
		const html = codeBlock("12345678");
		expect(html).toContain("12345678");
		expect(html).toContain("letter-spacing");
	});
});

describe("escapeHtml", () => {
	test("escapes HTML-sensitive characters", () => {
		expect(escapeHtml(`<b>"Ana" & 'Bruno'</b>`)).toBe(
			"&lt;b&gt;&quot;Ana&quot; &amp; &#39;Bruno&#39;&lt;/b&gt;",
		);
	});
});
