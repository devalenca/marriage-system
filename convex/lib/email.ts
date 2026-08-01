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
	/**
	 * The line the inbox shows next to the subject. Without one, clients grab
	 * the first words of the body, which reads like a fragment.
	 */
	preview?: string;
	/** Already-safe HTML: interpolate user data through escapeHtml first. */
	bodyHtml: string;
	ctaLabel?: string;
	ctaUrl?: string;
	/** Small print under the button — expiry, "não foi você?", and the like. */
	footnote?: string;
};

// Palette mirrors the app (olive primary, gold accent, warm cream) using
// inline styles only — email clients ignore stylesheets.
const OLIVE = "#4a5d3a";
const GOLD = "#b8912f";
const CREAM = "#faf7f0";
const INK = "#2b2f26";
const MUTED = "#6b7061";
const LINE = "#e8e2d4";
const BODY_FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY_FONT = "Georgia,'Times New Roman',serif";

/**
 * A verification code, styled to be read out loud and typed. Shared so the
 * password reset and the e-mail change look like the same product.
 */
export function codeBlock(code: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr>
			<td style="background:${CREAM};border:1px solid ${LINE};border-radius:12px;padding:18px 28px;font-family:${BODY_FONT};font-size:30px;font-weight:bold;letter-spacing:8px;color:${OLIVE};text-align:center">${code}</td>
		</tr></table>`;
}

/** Branded pt-BR layout shared by every transactional email. */
export function renderEmail(template: EmailTemplate): string {
	const preview = template.preview
		? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};font-size:1px;line-height:1px">${template.preview}</div>`
		: "";
	const cta =
		template.ctaLabel && template.ctaUrl
			? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px"><tr><td style="border-radius:999px;background:${OLIVE}">
					<a href="${template.ctaUrl}" style="display:inline-block;padding:14px 30px;font-family:${BODY_FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">${template.ctaLabel}</a>
				</td></tr></table>`
			: "";
	const footnote = template.footnote
		? `<p style="margin:20px 0 0;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${MUTED}">${template.footnote}</p>`
		: "";
	return `<!doctype html>
<html lang="pt-BR">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<meta name="color-scheme" content="light">
	<title>${escapeHtml(template.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};-webkit-font-smoothing:antialiased">
	${preview}
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:40px 16px">
		<tr><td align="center">
			<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
				<tr><td align="center" style="padding:0 8px 24px">
					<div style="font-family:${DISPLAY_FONT};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${GOLD}">Nosso Casamento</div>
					<div style="margin-top:10px;font-family:${DISPLAY_FONT};font-size:15px;color:${LINE}">&#10022;</div>
				</td></tr>
				<tr><td style="background:#ffffff;border-radius:18px;padding:36px 32px;border:1px solid ${LINE}">
					<h1 style="margin:0 0 18px;font-family:${DISPLAY_FONT};font-size:26px;line-height:1.25;font-weight:normal;color:${INK}">${template.heading}</h1>
					<div style="font-family:${BODY_FONT};font-size:15px;line-height:1.65;color:${INK}">${template.bodyHtml}</div>
					${cta}
					${footnote}
				</td></tr>
				<tr><td align="center" style="padding:24px 8px 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${MUTED}">
					Você recebeu este e-mail porque tem uma conta no Nosso Casamento,<br>o painel onde o casal organiza o casamento até o grande dia.
				</td></tr>
			</table>
		</td></tr>
	</table>
</body>
</html>`;
}
