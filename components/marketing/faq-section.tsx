import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
	{
		id: "cartao",
		question: "Preciso de cartão de crédito para testar?",
		answer:
			"Não. Os 14 dias grátis começam só com e-mail e senha. Como não pedimos cartão, é impossível haver cobrança surpresa no fim do teste.",
	},
	{
		id: "depois-do-trial",
		question: "O que acontece depois dos 14 dias?",
		answer:
			"Vocês decidem. Se o app estiver ajudando, assinam a mensalidade simbólica e seguem exatamente de onde pararam. Se não, nada é cobrado — não há cartão cadastrado — e tudo o que vocês registraram continua guardado caso mudem de ideia.",
	},
	{
		id: "celular",
		question: "Funciona bem no celular?",
		answer:
			"Foi feito primeiro para o celular: dá para conferir o orçamento na fila do buffet, marcar uma parcela como paga na saída da reunião e riscar tarefas do sofá. No computador, a mesma conta abre em tela cheia para as revisões maiores.",
	},
	{
		id: "casal",
		question: "Meu noivo ou minha noiva também acessa?",
		answer:
			"Sim — a conta é do casal. Os dois entram com o próprio acesso e veem os mesmos números ao mesmo tempo: o que um registra, o outro enxerga na hora. Fim das versões diferentes da planilha.",
	},
	{
		id: "cancelar",
		question: "Posso cancelar quando quiser?",
		answer:
			"Pode, a qualquer momento, sem fidelidade e sem multa. O plano é mensal justamente para vocês só pagarem enquanto fizer sentido — normalmente, até o casamento.",
	},
	{
		id: "seguranca",
		question: "Meus dados ficam seguros?",
		answer:
			"Ficam. O acesso é protegido por senha, a conexão é criptografada e os números do casamento são só de vocês dois — não vendemos nem compartilhamos seus dados com fornecedores ou anunciantes.",
	},
] as const;

/** Objection-handling FAQ: accessible accordions, one item open at a time. */
export function FaqSection() {
	return (
		<section className="mt-24" aria-labelledby="perguntas">
			<div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
				<div data-reveal>
					<h2
						id="perguntas"
						className="font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
					>
						Perguntas de quem está quase começando
					</h2>
					<p className="mt-3 max-w-sm text-pretty text-muted-foreground">
						Se a dúvida de vocês não estiver aqui, é um toque para falar com a
						gente dentro do app.
					</p>
				</div>
				<div
					data-reveal
					className="landing-glass rounded-[2rem] bg-card/70 px-6 py-2 ring-1 ring-border backdrop-blur-2xl sm:px-8 dark:bg-card/85"
				>
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
			</div>
		</section>
	);
}
