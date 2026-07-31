import { Email } from "@convex-dev/auth/providers/Email";
import { isEmailEnabled, renderEmail, sendEmail } from "./lib/email";
import { generateNumericCode } from "./lib/otp";

// Auth.js-style email provider plugged into Password({ reset }): generates
// an 8-digit code, emails it and lets the login page exchange it (flow
// "reset-verification") for a new password + session.

const CODE_MAX_AGE_SECONDS = 15 * 60;

export const ResendOTPPasswordReset = Email({
	id: "password-reset-otp",
	maxAge: CODE_MAX_AGE_SECONDS,
	async generateVerificationToken() {
		return generateNumericCode(8);
	},
	async sendVerificationRequest({ identifier: email, token }) {
		if (!isEmailEnabled()) {
			// Local dev with no transport configured: surface the code in the
			// backend logs so the flow stays testable end to end.
			console.log(`[email] código de redefinição para ${email}: ${token}`);
			return;
		}
		await sendEmail({
			to: email,
			subject: "Redefinição de senha — Nosso Casamento",
			html: renderEmail({
				heading: "Redefinir sua senha",
				bodyHtml: `<p>Recebemos um pedido para redefinir a senha da sua conta.</p>
					<p>Use o código abaixo na tela de login. Ele vale por 15 minutos.</p>
					<p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0">${token}</p>
					<p>Se você não pediu a redefinição, pode ignorar este e-mail — sua senha continua a mesma.</p>`,
			}),
		});
	},
});
