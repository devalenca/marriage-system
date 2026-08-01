import { Email } from "@convex-dev/auth/providers/Email";
import { isEmailEnabled, sendEmail } from "./lib/email";
import { passwordResetEmail } from "./lib/emailTemplates";
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
		await sendEmail({ to: email, ...passwordResetEmail(token) });
	},
});
