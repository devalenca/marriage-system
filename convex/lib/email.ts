// Transactional email. Two transports, chosen by whichever credentials the
// Convex deployment carries:
//
// - **Resend** (`RESEND_API_KEY`) — a direct HTTP call. Needs a verified
//   domain to reach anyone but the account owner, so it is where this goes
//   once the product has one.
// - **Relay** (`EMAIL_RELAY_SECRET`) — hands the message to the web app's
//   /api/email route, which sends it through a personal mailbox over SMTP
//   (see app/api/email/route.ts). A mailbox needs no domain and delivers to
//   anyone, and SMTP needs a TCP socket, which Convex's runtime has no way to
//   open — Next.js runs on Node and does.
//
// With neither configured every send is a logged no-op, which keeps local dev
// and the test suite free of any email setup.
//
// Other env vars: `EMAIL_FROM` (sender) and `SITE_URL` (the base for links
// inside the emails — and for reaching the relay).

export type EmailMessage = {
	to: string;
	subject: string;
	html: string;
};

export type EmailTransport = "resend" | "relay" | "none";

/**
 * Which transport this deployment can use. Resend wins when both are present:
 * a configured domain is the better sender, and the mailbox relay is the
 * stand-in until there is one.
 */
export function chooseTransport(
	env: Record<string, string | undefined>,
): EmailTransport {
	if (env.RESEND_API_KEY?.trim()) return "resend";
	if (env.EMAIL_RELAY_SECRET?.trim()) return "relay";
	return "none";
}

function transport(): EmailTransport {
	return chooseTransport(process.env);
}

const FALLBACK_FROM = "Nosso Casamento <onboarding@resend.dev>";

/**
 * The sender address. Shared by both transports, so the rule is written once
 * even though each side of the relay reads its own environment: over SMTP the
 * sender must be the authenticated mailbox, so it wins over Resend's test
 * address whenever it is configured.
 */
export function emailFrom(): string {
	const configured = process.env.EMAIL_FROM?.trim();
	if (configured) return configured;
	const mailbox = process.env.SMTP_USER?.trim();
	if (mailbox) return `Nosso Casamento <${mailbox}>`;
	return FALLBACK_FROM;
}

export function isEmailEnabled(): boolean {
	return transport() !== "none";
}

/** Where e-mailed links point to (SITE_URL on the deployment). */
export function appBaseUrl(): string {
	const configured = process.env.SITE_URL?.trim();
	return (configured ? configured : "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Sends one email through whichever transport is configured. Returns
 * "skipped" (without touching the network) when none is, so callers never
 * need to guard — reminder crons and invite flows degrade gracefully in dev.
 */
export async function sendEmail(
	message: EmailMessage,
): Promise<"sent" | "skipped"> {
	switch (transport()) {
		case "resend":
			await sendViaResend(message);
			return "sent";
		case "relay":
			await sendViaRelay(message);
			return "sent";
		default:
			console.log(
				`[email] sem transporte configurado — envio pulado: "${message.subject}" para ${message.to}`,
			);
			return "skipped";
	}
}

// A hung connection would otherwise burn the whole action's wall clock — in
// the daily cron that costs every couple after this one their e-mail.
const RESEND_TIMEOUT_MS = 20_000;
// The relay has a whole SMTP conversation to get through (connect, TLS, auth,
// DATA) and enforces its own tighter deadlines inside; this only has to be
// loose enough that the caller never gives up on a send that is still going —
// an abort here would report failure for a message that does get delivered.
const RELAY_TIMEOUT_MS = 45_000;

async function sendViaResend(message: EmailMessage): Promise<void> {
	const apiKey = process.env.RESEND_API_KEY?.trim();
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: emailFrom(),
			to: message.to,
			subject: message.subject,
			html: message.html,
		}),
		signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
	});
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Resend respondeu ${response.status}: ${body}`);
	}
}

async function sendViaRelay(message: EmailMessage): Promise<void> {
	const secret = process.env.EMAIL_RELAY_SECRET?.trim();
	const response = await fetch(`${appBaseUrl()}/api/email`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secret}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
		signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
	});
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`O envio respondeu ${response.status}: ${body}`);
	}
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export type EmailTemplate = {
	heading: string;
	/** Already-safe HTML: interpolate user data through escapeHtml first. */
	bodyHtml: string;
	ctaLabel?: string;
	ctaUrl?: string;
};

// Palette mirrors the app (olive primary, gold accent, warm cream) using
// inline styles only — email clients ignore stylesheets.
const OLIVE = "#4a5d3a";
const GOLD = "#b8912f";
const CREAM = "#faf7f0";
const INK = "#2b2f26";
const MUTED = "#6b7061";

/** Branded pt-BR layout shared by every transactional email. */
export function renderEmail(template: EmailTemplate): string {
	const cta =
		template.ctaLabel && template.ctaUrl
			? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="border-radius:10px;background:${OLIVE}">
					<a href="${template.ctaUrl}" style="display:inline-block;padding:12px 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">${template.ctaLabel}</a>
				</td></tr></table>`
			: "";
	return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:${CREAM}">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px">
		<tr><td align="center">
			<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
				<tr><td style="padding:0 8px 16px;font-family:Georgia,serif;font-size:20px;font-weight:bold;color:${OLIVE}">
					Nosso Casamento <span style="color:${GOLD}">&#10084;</span>
				</td></tr>
				<tr><td style="background:#ffffff;border-radius:16px;padding:32px 28px;border:1px solid #e6e1d3">
					<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:${INK}">${template.heading}</h1>
					<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${INK}">${template.bodyHtml}</div>
					${cta}
				</td></tr>
				<tr><td style="padding:20px 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${MUTED}">
					Você recebeu este e-mail porque tem uma conta no Nosso Casamento.
				</td></tr>
			</table>
		</td></tr>
	</table>
</body>
</html>`;
}
