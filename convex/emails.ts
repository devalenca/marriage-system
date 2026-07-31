import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { superadminEmails } from "./lib/auth";
import { appBaseUrl, escapeHtml, renderEmail, sendEmail } from "./lib/email";

// Fire-and-forget transactional emails, scheduled from mutations with
// ctx.scheduler.runAfter(0, ...) so a Resend hiccup never fails the write.

export const sendFeedbackAlert = internalAction({
	args: {
		kind: v.string(),
		message: v.string(),
		fromEmail: v.optional(v.string()),
		coupleNames: v.optional(v.string()),
	},
	handler: async (_ctx, { kind, message, fromEmail, coupleNames }) => {
		// The superadmin hears about new feedback without opening /admin.
		const to = superadminEmails()[0];
		if (!to) return;
		await sendEmail({
			to,
			subject: `Novo feedback (${kind}) — Nosso Casamento`,
			html: renderEmail({
				heading: "Chegou um feedback novo",
				bodyHtml: `<p><b>Tipo:</b> ${escapeHtml(kind)}</p>
					${coupleNames ? `<p><b>Casal:</b> ${escapeHtml(coupleNames)}</p>` : ""}
					${fromEmail ? `<p><b>De:</b> ${escapeHtml(fromEmail)}</p>` : ""}
					<p style="white-space:pre-wrap;border-left:3px solid #b8912f;padding-left:12px">${escapeHtml(message)}</p>`,
				ctaLabel: "Abrir o painel admin",
				ctaUrl: `${appBaseUrl()}/admin`,
			}),
		});
	},
});

export const sendWelcome = internalAction({
	args: { email: v.string(), coupleNames: v.string() },
	handler: async (_ctx, { email, coupleNames }) => {
		await sendEmail({
			to: email,
			subject: "Bem-vindos ao Nosso Casamento!",
			html: renderEmail({
				heading: `Que alegria ter vocês aqui, ${escapeHtml(coupleNames)}!`,
				bodyHtml: `<p>Sua conta está pronta e o painel do casamento já nasceu com o checklist dos próximos meses.</p>
					<p>Alguns primeiros passos que valem a pena:</p>
					<ul>
						<li>Cadastre os fornecedores que vocês já contrataram;</li>
						<li>Lance as parcelas com as datas de vencimento;</li>
						<li>Convide seu par em Ajustes &rarr; Acessos.</li>
					</ul>
					<p>Qualquer ideia ou dificuldade, use o "Fale com a gente" dentro do app — a gente lê tudo.</p>`,
				ctaLabel: "Abrir meu painel",
				ctaUrl: `${appBaseUrl()}/dashboard`,
			}),
		});
	},
});
