import { createHash, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import nodemailer from "nodemailer";
import { emailFrom } from "@/convex/lib/email";

/**
 * SMTP relay: the app's outbound mail path, called by Convex.
 *
 * Convex's runtime speaks HTTP and nothing else, and SMTP needs a TCP socket,
 * so sends through a personal mailbox (Gmail by default) land here — Next.js
 * runs on Node, locally and on Vercel alike. A mailbox needs no domain of its
 * own, which is why this exists at all; once the product has a domain,
 * RESEND_API_KEY takes over and this route goes quiet.
 *
 * Gmail requires an **app password** (Google account → Security → 2-step
 * verification → App passwords), never the account password.
 *
 * Env vars (on the web app — Vercel or .env.local, NOT on Convex):
 * EMAIL_RELAY_SECRET, SMTP_USER, SMTP_PASSWORD, optionally EMAIL_FROM,
 * SMTP_HOST and SMTP_PORT.
 */

// nodemailer opens sockets; the Edge runtime has none.
export const runtime = "nodejs";

const GMAIL_HOST = "smtp.gmail.com";
const IMPLICIT_TLS_PORT = 465;

/** Constant-time secret comparison over digests, so lengths can't leak. */
function secretMatches(provided: string, expected: string): boolean {
	return timingSafeEqual(
		createHash("sha256").update(provided).digest(),
		createHash("sha256").update(expected).digest(),
	);
}

function bearerToken(request: Request): string {
	const header = request.headers.get("authorization") ?? "";
	return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

type RelayMessage = { to: string; subject: string; html: string };

/** One address, two strings — never an array, which would make this a fan-out. */
function parseMessage(body: unknown): RelayMessage | null {
	if (typeof body !== "object" || body === null) return null;
	const { to, subject, html } = body as Record<string, unknown>;
	if (
		typeof to !== "string" ||
		typeof subject !== "string" ||
		typeof html !== "string" ||
		to.trim() === ""
	) {
		return null;
	}
	return { to, subject, html };
}

export async function POST(request: Request): Promise<Response> {
	const secret = process.env.EMAIL_RELAY_SECRET?.trim();
	// With no secret configured there is no way to tell Convex from anyone
	// else, so the route does not exist rather than falling open.
	if (!secret) return new Response("Not found", { status: 404 });
	if (!secretMatches(bearerToken(request), secret)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const user = process.env.SMTP_USER?.trim();
	const pass = process.env.SMTP_PASSWORD?.trim();
	if (!user || !pass) {
		return new Response(
			"SMTP_USER e SMTP_PASSWORD precisam estar definidos no app",
			{ status: 503 },
		);
	}

	const message = parseMessage(await request.json().catch(() => null));
	if (message === null) {
		return new Response("Mensagem inválida", { status: 400 });
	}

	const host = process.env.SMTP_HOST?.trim() || GMAIL_HOST;
	const port = Number(process.env.SMTP_PORT ?? IMPLICIT_TLS_PORT);
	try {
		// Resolve the mailbox ourselves. nodemailer uses dns.resolve4/6, which
		// talks to the configured nameservers directly — plenty of networks
		// (corporate DNS, VPNs) refuse that outright, and nodemailer then falls
		// back to the bare hostname and lands on Gmail's AAAA record, which
		// those same networks black-hole for ~21s per send. dns.lookup goes
		// through the OS resolver, so it works wherever the machine does.
		const { address } = await lookup(host, { family: 4 });
		const transporter = nodemailer.createTransport({
			host: address,
			port,
			// 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
			secure: port === IMPLICIT_TLS_PORT,
			// Connecting by IP still has to present the name for SNI and the
			// certificate check.
			tls: { servername: host },
			// Fail fast and say why, rather than letting the caller time out with
			// nothing but an AbortError to show the user.
			connectionTimeout: 10_000,
			greetingTimeout: 10_000,
			socketTimeout: 20_000,
			auth: { user, pass },
		});
		await transporter.sendMail({ from: emailFrom(), ...message });
	} catch (error) {
		// The mailbox's own words travel back to the caller: "535-5.7.8
		// Username and Password not accepted" is the whole diagnosis.
		return new Response(
			error instanceof Error ? error.message : String(error),
			{
				status: 502,
			},
		);
	}
	return new Response(null, { status: 200 });
}
