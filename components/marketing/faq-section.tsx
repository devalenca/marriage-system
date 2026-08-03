import { SectionSurface } from "@/components/marketing/section-surface";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

// Every answer below is checked against the product: the 14-day trial with no
// card (lib/domain/subscription.ts + components/signup-form.tsx), e-mail
// invitations where the guest picks their own password (convex/access.ts), the
// checklist seeded from the wedding date (lib/domain/checklist.ts, fired by
// OnboardingCard), vendor payment schedules and reminders (convex/payments.ts,
// convex/crons.ts), inspiration galleries (convex/inspiration.ts) and the
// permanent deletion in Ajustes (convex/weddings.ts `deleteOwn`).

const FAQ_ITEMS = [
	{
		id: "cartao",
		question: "Preciso de cartão de crédito para testar?",
		answer:
			"Não. Os 14 dias de teste começam com e-mail, senha e a data do casamento — nada além disso. Como não pedimos cartão, nenhuma cobrança acontece sozinha quando o período termina.",
	},
	{
		id: "par",
		question: "Meu noivo ou minha noiva também pode acessar?",
		answer:
			"Pode. Em Ajustes → Acessos vocês enviam um convite por e-mail; a pessoa recebe um link, cria a própria senha e passa a ver o mesmo casamento. O que um registra, o outro enxerga na hora.",
	},
	{
		id: "checklist",
		question: "O checklist já vem pronto?",
		answer:
			"Vem. Assim que vocês informam a data, o app monta um checklist mês a mês, de doze meses antes até a semana da festa, com o prazo de cada tarefa já calculado a partir do grande dia.",
	},
	{
		id: "tarefas",
		question: "Posso criar minhas próprias tarefas?",
		answer:
			"Sim. Vocês criam quantas tarefas quiserem, com prazo, prioridade e categoria, e podem editar ou apagar qualquer uma — inclusive as que vieram prontas, quando não fizerem sentido para o casamento de vocês.",
	},
	{
		id: "fornecedores",
		question: "Consigo controlar fornecedores e pagamentos?",
		answer:
			"Consegue. Cada fornecedor guarda o valor contratado, a entrada e as parcelas com vencimento; vocês marcam o que já foi pago, anexam contratos e comprovantes e recebem lembretes por e-mail antes de cada vencimento.",
	},
	{
		id: "inspiracoes",
		question: "Posso salvar inspirações?",
		answer:
			"Pode. Dá para criar galerias por tema — decoração, traje, papelaria — e subir as fotos que servem de referência, no mesmo lugar em que estão o orçamento e os fornecedores.",
	},
	{
		id: "celular",
		question: "Funciona no celular?",
		answer:
			"Funciona. As telas se adaptam ao celular, então dá para conferir o orçamento na reunião com o fornecedor e riscar tarefas de onde vocês estiverem. Não é preciso instalar nada: é o mesmo acesso no celular e no computador.",
	},
	{
		id: "ja-comecei",
		question: "Posso usar mesmo que já tenha começado a organizar o casamento?",
		answer:
			"Pode, e é o caso mais comum. Vocês cadastram os fornecedores já fechados, marcam as parcelas que foram pagas e concluem ou removem as tarefas que já resolveram — o app parte do ponto em que vocês estão.",
	},
	{
		id: "dados",
		question: "Meus dados ficam salvos?",
		answer:
			"Ficam. Tudo o que vocês registram continua na conta e aparece atualizado em qualquer aparelho, com acesso protegido por senha. Só quem vocês convidam enxerga o casamento de vocês.",
	},
	{
		id: "cancelar",
		question: "Posso cancelar quando quiser?",
		answer:
			"Pode. Não guardamos cartão e nada é renovado automaticamente: o acesso vale até o fim do período contratado e, para encerrar, basta não renovar. Se quiserem apagar tudo antes disso, a exclusão definitiva da conta fica em Ajustes.",
	},
] as const;

/**
 * Objection-handling FAQ. The accordion primitive carries the a11y contract:
 * each trigger is a button that toggles on Enter/Space and announces its state
 * through `aria-expanded` and `aria-controls`.
 */
export function FaqSection() {
	return (
		<section className="mt-24" aria-labelledby="perguntas">
			{/* The heading survived on the photo and the three-line subtitle under
			    it did not — same colour problem, different luck with the pixels. The
			    pair moves onto paper together, so the italic light face keeps its
			    delicacy instead of having to be shouted. */}
			<SectionSurface
				className="mx-auto max-w-2xl text-center"
				data-reveal="mask"
			>
				{/* Fraunces earns its keep here: light, large and italic, the only
				    voice on the page that speaks the way the section is titled. */}
				<h2
					id="perguntas"
					className="font-display text-4xl leading-[1.05] font-light italic tracking-tight text-balance text-foreground sm:text-5xl"
				>
					De noivos para noivos
				</h2>
				<div
					aria-hidden
					className="mx-auto mt-6 h-1.5 w-28 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent"
				/>
				<p className="mt-5 text-pretty text-muted-foreground">
					Sabemos que organizar um casamento traz muitas dúvidas. Por isso,
					esclarecemos as principais perguntas para ajudar vocês a aproveitar
					essa fase com mais confiança e tranquilidade.
				</p>
			</SectionSurface>
			<div
				data-reveal="scale"
				className="landing-glass relative mx-auto mt-12 max-w-3xl rounded-[2rem] bg-card/95 px-6 py-2 ring-1 ring-border backdrop-blur-2xl sm:px-8 dark:bg-card/85"
			>
				{/* Champagne hairline along the top edge of the glass. */}
				<span
					aria-hidden
					className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
				/>
				<Accordion>
					{FAQ_ITEMS.map((item) => (
						<AccordionItem key={item.id} value={item.id}>
							{/* Discreet hover for the accordion: soft primary tint +
							    the component's own text-primary shift; keyboard focus
							    ring comes from the primitive and is untouched. */}
							<AccordionTrigger className="-mx-3 rounded-xl px-3 text-base transition-colors duration-200 hover:bg-primary/5">
								{item.question}
							</AccordionTrigger>
							<AccordionContent className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
								{item.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
