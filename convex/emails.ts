import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { appBaseUrl, escapeHtml, renderEmail, sendEmail } from "./lib/email";

// Fire-and-forget transactional emails, scheduled from mutations with
// ctx.scheduler.runAfter(0, ...) so a Resend hiccup never fails the write.

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
