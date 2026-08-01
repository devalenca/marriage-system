import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { superadminEmails } from "./lib/auth";
import { sendEmail } from "./lib/email";
import { feedbackAlertEmail, welcomeEmail } from "./lib/emailTemplates";

// Fire-and-forget transactional emails, scheduled from mutations with
// ctx.scheduler.runAfter(0, ...) so a delivery hiccup never fails the write.
// The copy itself lives in lib/emailTemplates.ts.

export const sendFeedbackAlert = internalAction({
	args: {
		kind: v.string(),
		message: v.string(),
		fromEmail: v.optional(v.string()),
		coupleNames: v.optional(v.string()),
	},
	handler: async (_ctx, feedback) => {
		// The superadmin hears about new feedback without opening /admin.
		const to = superadminEmails()[0];
		if (!to) return;
		await sendEmail({ to, ...feedbackAlertEmail(feedback) });
	},
});

export const sendWelcome = internalAction({
	args: { email: v.string(), coupleNames: v.string() },
	handler: async (_ctx, { email, coupleNames }) => {
		await sendEmail({ to: email, ...welcomeEmail(coupleNames) });
	},
});
