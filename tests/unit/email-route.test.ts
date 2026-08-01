import { afterEach, describe, expect, test, vi } from "vitest";

// The SMTP relay: the one place that opens a socket to a real mailbox.
// Convex hands it a message over HTTP because its runtime cannot do TCP, so
// this route is the app's only outbound mail path — and the shared secret is
// the only thing standing between it and an open relay.

const sendMail = vi.fn().mockResolvedValue({ messageId: "<1@gmail.com>" });
const createTransport = vi.fn((_options: Record<string, unknown>) => ({
	sendMail,
}));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const lookup = vi.fn().mockResolvedValue({ address: "172.217.192.108" });
vi.mock("node:dns/promises", () => ({ lookup, default: { lookup } }));

afterEach(() => {
	vi.unstubAllEnvs();
	sendMail.mockClear();
	createTransport.mockClear();
});

const message = {
	to: "casal@example.com",
	subject: "Bem-vindos!",
	html: "<p>Olá</p>",
};

/** A request as Convex sends it, with whatever bearer token is given. */
function request(token: string | null, body: unknown = message) {
	return new Request("http://localhost:3000/api/email", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token === null ? {} : { Authorization: `Bearer ${token}` }),
		},
		body: JSON.stringify(body),
	});
}

async function post(token: string | null, body?: unknown) {
	const { POST } = await import("../../app/api/email/route");
	return await POST(request(token, body));
}

function configure() {
	vi.stubEnv("EMAIL_RELAY_SECRET", "s3cret-relay-token");
	vi.stubEnv("SMTP_USER", "gabriel@gmail.com");
	vi.stubEnv("SMTP_PASSWORD", "senha-de-app");
}

describe("POST /api/email", () => {
	test("sends through the configured mailbox", async () => {
		configure();
		vi.stubEnv("EMAIL_FROM", "");

		const response = await post("s3cret-relay-token");

		expect(response.status).toBe(200);
		expect(createTransport).toHaveBeenCalledWith(
			expect.objectContaining({
				port: 465,
				secure: true,
				auth: { user: "gabriel@gmail.com", pass: "senha-de-app" },
			}),
		);
	});

	test("resolves the mailbox itself, over IPv4, and fails fast", async () => {
		configure();

		await post("s3cret-relay-token");

		// nodemailer resolves DNS with dns.resolve4/6, which plenty of networks
		// refuse outright (corporate DNS, VPNs); it then falls back to the
		// hostname and lands on Gmail's AAAA record, which those same networks
		// black-hole for ~21s. dns.lookup goes through the OS resolver, which
		// works wherever the machine itself works.
		expect(lookup).toHaveBeenCalledWith("smtp.gmail.com", { family: 4 });
		expect(createTransport).toHaveBeenCalledWith(
			expect.objectContaining({
				host: "172.217.192.108",
				// Connecting by IP still has to present the name, or the
				// certificate does not match.
				tls: { servername: "smtp.gmail.com" },
				// When something else stalls, failing fast beats the caller
				// timing out with nothing to show the user.
				connectionTimeout: 10_000,
				greetingTimeout: 10_000,
				socketTimeout: 20_000,
			}),
		);
		expect(sendMail).toHaveBeenCalledWith({
			// Gmail rejects a From that is not the authenticated mailbox.
			from: "Nosso Casamento <gabriel@gmail.com>",
			to: "casal@example.com",
			subject: "Bem-vindos!",
			html: "<p>Olá</p>",
		});
	});

	test("uses STARTTLS on port 587", async () => {
		configure();
		vi.stubEnv("SMTP_PORT", "587");

		await post("s3cret-relay-token");

		expect(createTransport).toHaveBeenCalledWith(
			expect.objectContaining({ port: 587, secure: false }),
		);
	});

	test("rejects a wrong secret without sending", async () => {
		configure();

		const response = await post("palpite-errado");

		expect(response.status).toBe(401);
		expect(sendMail).not.toHaveBeenCalled();
	});

	test("rejects a missing secret without sending", async () => {
		configure();

		expect((await post(null)).status).toBe(401);
		expect(sendMail).not.toHaveBeenCalled();
	});

	test("stays shut when the deployment configured no secret", async () => {
		vi.stubEnv("EMAIL_RELAY_SECRET", "");
		vi.stubEnv("SMTP_USER", "gabriel@gmail.com");
		vi.stubEnv("SMTP_PASSWORD", "senha-de-app");

		// No secret means no way to authenticate a caller, so the route must not
		// answer at all — never fall open.
		expect((await post("")).status).toBe(404);
		expect(sendMail).not.toHaveBeenCalled();
	});

	test("refuses a message that is not one address and two strings", async () => {
		configure();

		expect((await post("s3cret-relay-token", { to: 1 })).status).toBe(400);
		expect(
			(await post("s3cret-relay-token", { ...message, to: ["a@b.com"] }))
				.status,
		).toBe(400);
		expect(sendMail).not.toHaveBeenCalled();
	});

	test("reports the mailbox's own error so a bad password is diagnosable", async () => {
		configure();
		sendMail.mockRejectedValueOnce(
			new Error("Invalid login: 535-5.7.8 Username and Password not accepted"),
		);

		const response = await post("s3cret-relay-token");

		expect(response.status).toBe(502);
		expect(await response.text()).toContain("535-5.7.8");
	});

	test("answers 503 when SMTP credentials are missing", async () => {
		vi.stubEnv("EMAIL_RELAY_SECRET", "s3cret-relay-token");
		vi.stubEnv("SMTP_USER", "");
		vi.stubEnv("SMTP_PASSWORD", "");

		expect((await post("s3cret-relay-token")).status).toBe(503);
		expect(sendMail).not.toHaveBeenCalled();
	});
});
