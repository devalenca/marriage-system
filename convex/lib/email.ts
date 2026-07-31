// Transactional email via the Resend HTTP API. No SDK: a plain fetch keeps
// the dependency surface at zero and works in the Convex default runtime.
//
// Deployment env vars:
// - RESEND_API_KEY — when missing, sends become no-ops (local dev friendly).
// - EMAIL_FROM — verified sender, e.g. "Nosso Casamento <contato@dominio.com>".
//   Falls back to Resend's test sender, which only delivers to the account
//   owner's inbox — good enough to validate flows before a domain exists.

export type EmailMessage = {
	to: string;
	subject: string;
	html: string;
};

const FALLBACK_FROM = "Nosso Casamento <onboarding@resend.dev>";

export function emailFrom(): string {
	const configured = process.env.EMAIL_FROM?.trim();
	return configured ? configured : FALLBACK_FROM;
}

export function isEmailEnabled(): boolean {
	return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Where e-mailed links point to (SITE_URL on the deployment). */
export function appBaseUrl(): string {
	const configured = process.env.SITE_URL?.trim();
	return (configured ? configured : "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Sends one email through Resend. Returns "skipped" (without touching the
 * network) when the deployment has no API key, so callers never need to
 * guard — reminder crons and invite flows degrade gracefully in dev.
 */
export async function sendEmail(
	message: EmailMessage,
): Promise<"sent" | "skipped"> {
	const apiKey = process.env.RESEND_API_KEY?.trim();
	if (!apiKey) {
		console.log(
			`[email] RESEND_API_KEY ausente — envio pulado: "${message.subject}" para ${message.to}`,
		);
		return "skipped";
	}
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
	});
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Resend respondeu ${response.status}: ${body}`);
	}
	return "sent";
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
