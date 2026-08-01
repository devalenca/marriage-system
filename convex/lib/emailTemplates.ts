// Every word the product sends by e-mail, in one place. Each function is
// pure — it takes the facts and returns { subject, html } — so the copy can
// be read end to end, unit-tested, and previewed without a backend.
//
// The layout itself (header, card, button, footer) lives in ./email.ts.

import { formatDateBR } from "../../lib/domain/dates";
import { formatBRL } from "../../lib/domain/money";
import type { ReminderPayment } from "../../lib/domain/notifications";
import { appBaseUrl, codeBlock, escapeHtml, renderEmail } from "./email";

export type EmailContent = { subject: string; html: string };

/** Sent right after a couple creates their account. */
export function welcomeEmail(coupleNames: string): EmailContent {
	return {
		subject: "Bem-vindos ao Nosso Casamento!",
		html: renderEmail({
			heading: `Que alegria ter vocês aqui, ${escapeHtml(coupleNames)}!`,
			preview: "O painel de vocês já está pronto — veja por onde começar.",
			bodyHtml: `<p style="margin:0 0 14px">A conta de vocês está pronta, e o painel já nasceu com o checklist dos próximos meses montado a partir da data do casamento.</p>
				<p style="margin:0 0 10px">Três coisas que valem os primeiros minutos:</p>
				<ul style="margin:0 0 14px;padding-left:20px">
					<li style="margin-bottom:6px"><b>Cadastrem os fornecedores</b>, tanto os já fechados quanto os que ainda estão em conversa;</li>
					<li style="margin-bottom:6px"><b>Lancem as parcelas</b> com as datas de vencimento — a gente avisa antes de cada uma;</li>
					<li><b>Convidem um ao outro</b> em Configurações &rarr; Acessos, para acompanharem juntos.</li>
				</ul>
				<p style="margin:0">Qualquer dúvida, ideia ou incômodo, é só usar o "Fale com a gente" dentro do app. A gente lê tudo.</p>`,
			ctaLabel: "Abrir meu painel",
			ctaUrl: `${appBaseUrl()}/dashboard`,
		}),
	};
}

/** Sent to someone the couple invited to their wedding. */
export function invitationEmail(
	coupleNames: string,
	link: string,
): EmailContent {
	return {
		subject: `Convite para o casamento de ${coupleNames} — Nosso Casamento`,
		html: renderEmail({
			heading: `${escapeHtml(coupleNames)} convidaram você`,
			preview: "Crie sua senha e acompanhe o planejamento de perto.",
			bodyHtml: `<p style="margin:0 0 14px">Você foi convidado(a) a acompanhar o planejamento do casamento de <b>${escapeHtml(coupleNames)}</b> no Nosso Casamento — o painel onde o casal organiza fornecedores, pagamentos, convidados e o checklist até o grande dia.</p>
				<p style="margin:0">É só criar uma senha para entrar. Leva menos de um minuto.</p>`,
			ctaLabel: "Criar minha senha",
			ctaUrl: link,
			footnote:
				"O convite vale por 7 dias. Se ele expirar, peça um novo para o casal. Se você não esperava este e-mail, pode ignorá-lo com tranquilidade.",
		}),
	};
}

/** The 8-digit code behind "esqueci minha senha". */
export function passwordResetEmail(code: string): EmailContent {
	return {
		subject: "Redefinição de senha — Nosso Casamento",
		html: renderEmail({
			heading: "Vamos redefinir sua senha",
			preview: "Seu código de verificação está aqui dentro.",
			bodyHtml: `<p style="margin:0">Recebemos um pedido para redefinir a senha da sua conta. Digite o código abaixo na tela de login:</p>
				${codeBlock(code)}`,
			footnote:
				"O código vale por 15 minutos. Se não foi você que pediu, pode ignorar este e-mail — sua senha continua a mesma.",
		}),
	};
}

/** Confirms a new address before it replaces the current one. */
export function emailChangeEmail(newEmail: string, code: string): EmailContent {
	return {
		subject: "Confirme seu novo e-mail — Nosso Casamento",
		html: renderEmail({
			heading: "Confirme seu novo e-mail",
			preview: "Um código de 8 dígitos para concluir a troca.",
			bodyHtml: `<p style="margin:0">Para passar a usar <b>${escapeHtml(newEmail)}</b> na sua conta, digite o código abaixo na tela de confirmação:</p>
				${codeBlock(code)}`,
			footnote:
				"O código vale por 15 minutos. Se você não pediu essa troca, ignore este e-mail — seu endereço atual continua valendo.",
		}),
	};
}

/** One section of the digest: a titled table plus its subtotal. */
function paymentTable(
	title: string,
	accent: string,
	payments: ReminderPayment[],
): string {
	const rows = payments
		.map(
			(payment) =>
				`<tr>
					<td style="padding:8px 12px 8px 0;border-top:1px solid #f0ece0;white-space:nowrap;color:#6b7061">${formatDateBR(payment.dueDate)}</td>
					<td style="padding:8px 12px 8px 0;border-top:1px solid #f0ece0"><b>${escapeHtml(payment.vendorName)}</b><br><span style="color:#6b7061">${escapeHtml(payment.description)}</span></td>
					<td style="padding:8px 0;border-top:1px solid #f0ece0;text-align:right;white-space:nowrap;font-weight:bold">${formatBRL(payment.amountCents)}</td>
				</tr>`,
		)
		.join("");
	const total = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
	return `<p style="margin:24px 0 8px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${accent}">${title}</p>
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45">${rows}
			<tr><td colspan="2" style="padding:10px 12px 0 0;border-top:2px solid #e8e2d4;color:#6b7061">Total</td>
				<td style="padding:10px 0 0;border-top:2px solid #e8e2d4;text-align:right;white-space:nowrap;font-weight:bold">${formatBRL(total)}</td></tr>
		</table>`;
}

/** The daily digest of what is overdue and what is about to come due. */
export function paymentDigestEmail(
	coupleNames: string,
	overdue: ReminderPayment[],
	upcoming: ReminderPayment[],
): EmailContent {
	const sections = [
		overdue.length > 0 ? paymentTable("Já venceram", "#b4442f", overdue) : "",
		upcoming.length > 0
			? paymentTable("Próximos 14 dias", "#b8912f", upcoming)
			: "",
	].join("");
	return {
		subject: "Vencimentos chegando — Nosso Casamento",
		html: renderEmail({
			heading: "Pagamentos no radar",
			preview:
				overdue.length > 0
					? `${overdue.length} ${overdue.length === 1 ? "parcela atrasada" : "parcelas atrasadas"} e o que vem por aí.`
					: "O que vence nos próximos dias.",
			bodyHtml: `<p style="margin:0">Um resumo rápido para ${escapeHtml(coupleNames)} não deixarem nada passar:</p>${sections}`,
			ctaLabel: "Ver no financeiro",
			ctaUrl: `${appBaseUrl()}/financeiro`,
			footnote:
				"Você pode desligar estes lembretes em Configurações &rarr; Notificações por e-mail.",
		}),
	};
}

/** Warns the wedding's admin that the access period is running out. */
export function subscriptionEndingEmail(
	coupleNames: string,
	activeUntil: string,
	daysLeft: number,
	supportEmail: string | undefined,
): EmailContent {
	const contact = supportEmail
		? `<p style="margin:14px 0 0">Para renovar, é só responder este e-mail ou escrever para <a href="mailto:${supportEmail}" style="color:#4a5d3a">${supportEmail}</a>.</p>`
		: "";
	return {
		subject: "Sua assinatura está chegando ao fim — Nosso Casamento",
		html: renderEmail({
			heading:
				daysLeft === 1
					? "Seu acesso termina amanhã"
					: `Seu acesso termina em ${daysLeft} dias`,
			preview: `O período do casamento de ${coupleNames} vai até ${formatDateBR(activeUntil)}.`,
			bodyHtml: `<p style="margin:0 0 14px">O período de acesso do casamento de ${escapeHtml(coupleNames)} vai até <b>${formatDateBR(activeUntil)}</b>.</p>
				<p style="margin:0">Depois dessa data o painel continua abrindo normalmente, só que em modo de leitura: vocês seguem vendo tudo, mas sem poder editar. <b>Nada é apagado.</b></p>${contact}`,
		}),
	};
}

/** Proof that a deployment can deliver, sent by the couple to themselves. */
export function testEmail(): EmailContent {
	return {
		subject: "Deu certo! Teste de envio — Nosso Casamento",
		html: renderEmail({
			heading: "Deu certo!",
			preview: "O envio de e-mails do sistema está funcionando.",
			bodyHtml: `<p style="margin:0 0 14px">Este é um e-mail de teste, disparado por você mesmo lá nas configurações.</p>
				<p style="margin:0">Se ele chegou até aqui, está tudo certo: os lembretes de vencimento, os convites e os códigos de redefinição de senha vão chegar do mesmo jeito.</p>`,
			ctaLabel: "Voltar ao painel",
			ctaUrl: `${appBaseUrl()}/dashboard`,
		}),
	};
}

/** Internal: tells the superadmin that a couple wrote in. */
export function feedbackAlertEmail(feedback: {
	kind: string;
	message: string;
	fromEmail?: string;
	coupleNames?: string;
}): EmailContent {
	const { kind, message, fromEmail, coupleNames } = feedback;
	return {
		subject: `Novo feedback (${kind}) — Nosso Casamento`,
		html: renderEmail({
			heading: "Chegou um feedback novo",
			preview: `${kind}${coupleNames ? ` — ${coupleNames}` : ""}`,
			bodyHtml: `<p style="margin:0 0 4px;color:#6b7061;font-size:13px"><b>Tipo:</b> ${escapeHtml(kind)}${coupleNames ? ` &nbsp;·&nbsp; <b>Casal:</b> ${escapeHtml(coupleNames)}` : ""}${fromEmail ? ` &nbsp;·&nbsp; <b>De:</b> ${escapeHtml(fromEmail)}` : ""}</p>
				<p style="white-space:pre-wrap;margin:16px 0 0;border-left:3px solid #b8912f;padding-left:14px">${escapeHtml(message)}</p>`,
			ctaLabel: "Abrir o painel admin",
			ctaUrl: `${appBaseUrl()}/admin`,
		}),
	};
}
