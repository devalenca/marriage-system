import {
	ArrowRight,
	CalendarHeart,
	Check,
	CircleHelp,
	EyeOff,
	Heart,
	Images,
	ListChecks,
	ListTodo,
	MessagesSquare,
	Shuffle,
	Sparkles,
	Store,
	Users,
	Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { FaqSection } from "@/components/marketing/faq-section";
import { InspirationShowcase } from "@/components/marketing/inspiration-showcase";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingMotion } from "@/components/marketing/landing-motion";
import { ProductDemo } from "@/components/marketing/product-demo";
import { SectionSurface } from "@/components/marketing/section-surface";
import { TestimonialsSection } from "@/components/marketing/testimonials";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
	title: "Nosso Casamento — planejem tudo do casamento em um só lugar",
	description:
		"Orçamento, checklist inteligente, fornecedores, convidados, inspirações e cronograma reunidos num só painel. Criado por noivos, para noivos. 14 dias grátis, sem cartão de crédito.",
};

/**
 * The real problem isn't organising a wedding — it's organising it in a dozen
 * different places. Each card names one consequence of that scattering.
 */
const PAIN_POINTS = [
	{
		icon: ListTodo,
		title: "Tarefas esquecidas",
		body: "Com tantas decisões para tomar, é difícil saber o que fazer agora e o que pode esperar mais um pouco.",
	},
	{
		icon: EyeOff,
		title: "Gastos sem visibilidade",
		body: "Parcelas, entradas, contratos e pagamentos espalhados tornam o orçamento mais difícil de acompanhar.",
	},
	{
		icon: Shuffle,
		title: "Informações desencontradas",
		body: "Enquanto um salva referências, o outro conversa com fornecedores. Aos poucos, tudo fica espalhado.",
	},
	{
		icon: CircleHelp,
		title: "A sensação de que sempre falta algo",
		body: "Mesmo quando muita coisa já está resolvida, permanece a dúvida: “Será que esquecemos alguma coisa?”",
	},
] as const;

/**
 * What the couple finds inside — the breadth is the differentiator. Money is
 * `featured`: it is the area couples arrive worried about, so it gets the
 * champagne chip and rides one step above the rest of the grid instead of
 * being the first of six identical cards.
 */
const FEATURES = [
	{
		icon: Wallet,
		title: "Orçamento e pagamentos",
		body: "Meta, valores fechados, entradas e parcelas com vencimento. O que vence primeiro aparece primeiro.",
		featured: true,
	},
	{
		icon: ListChecks,
		title: "Checklist inteligente",
		body: "As etapas da organização já distribuídas no tempo, da reserva do espaço aos últimos detalhes.",
	},
	{
		icon: Store,
		title: "Fornecedores",
		body: "Contatos, propostas, contratos e o andamento de cada negociação reunidos por categoria.",
	},
	{
		icon: Users,
		title: "Convidados",
		body: "Lista completa, confirmações de presença e acompanhamento em tempo real de quem já respondeu.",
	},
	{
		icon: Images,
		title: "Inspirações",
		body: "Referências de decoração, vestidos, flores e paletas guardadas junto do resto do planejamento.",
	},
	{
		icon: CalendarHeart,
		title: "Cronograma até o grande dia",
		body: "Contagem regressiva, próximos vencimentos e as tarefas do momento sempre à vista.",
	},
] as const;

/**
 * The five steps of the journey. Step 2 is `featured` because the automatic
 * checklist is the feature that most helps couples who have no idea where to
 * start — it gets a full-width, tinted card instead of a plain column.
 */
const STEPS = [
	{
		n: "1",
		title: "Crie o seu casamento",
		body: "Informe a data do evento, defina uma meta de orçamento e personalize as informações iniciais.",
	},
	{
		n: "2",
		title: "Receba seu planejamento inicial",
		body: "O sistema cria automaticamente um checklist com as principais etapas da organização, distribuídas conforme a antecedência ideal de cada atividade.",
		featured: true,
	},
	{
		n: "3",
		title: "Organize do seu jeito",
		body: "Adicione novas tarefas, registre fornecedores, acompanhe contratos, convidados, inspirações e todos os detalhes importantes.",
	},
	{
		n: "4",
		title: "Acompanhe a evolução",
		body: "Visualize pagamentos, tarefas concluídas, próximos vencimentos e tudo o que ainda falta para o grande dia.",
	},
	{
		n: "5",
		title: "Cheguem ao altar com tranquilidade",
		body: "Com tudo organizado em um único lugar, vocês passam menos tempo controlando planilhas e mais tempo aproveitando a jornada.",
	},
] as const;

/** Reassurance strip on the closing CTA. */
const CTA_HIGHLIGHTS = [
	"14 dias grátis",
	"Sem cartão de crédito",
	"Criado por noivos, para noivos",
] as const;

/**
 * Section headings share one voice: display face, light weight, tight
 * tracking, and a jump of roughly 3x over the 1rem body underneath them.
 * The lighter weight is deliberate against the semibold card titles below —
 * the contrast between the two is what makes the page read as typeset rather
 * than as one weight repeated at two sizes.
 */
const SECTION_HEADING =
	"font-display text-[2rem] leading-[1.06] font-light tracking-tight text-balance text-foreground sm:text-5xl";

/** Champagne rule under a section heading — the accent as structure. */
function GoldRule() {
	return (
		<span
			aria-hidden
			className="mt-5 block h-1 w-16 rounded-full bg-gradient-to-r from-gold via-gold/55 to-transparent"
		/>
	);
}

export default function LandingPage() {
	return (
		<main className="mx-auto w-full max-w-6xl px-5 pt-6">
			<LandingMotion />

			{/* Top bar. It carries the wordmark and the "Entrar" ghost link, both of
			    them ink straight on the photograph, so the bar itself becomes the
			    paper — the same two layers the in-app page header uses. The negative
			    margin exactly cancels the padding at the narrowest width, so the row
			    keeps the horizontal room it had (at 390px it has ~10px to spare) and
			    the bar simply reaches a little further into the page gutter. */}
			<header
				data-hero-nav
				className="-mx-3 flex items-center justify-between gap-2 rounded-[1.5rem] border border-border/60 bg-card/95 bg-linear-to-br from-transparent to-accent/20 px-3 py-2 shadow-sm backdrop-blur-sm sm:px-4"
			>
				<span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-primary sm:text-xl">
					<Heart className="size-5 text-gold" aria-hidden />
					Nosso Casamento
				</span>
				<div className="flex items-center gap-1.5">
					<ThemeToggle />
					{/* At 390px the wordmark plus three controls overflow the viewport
					    and buy a horizontal scrollbar; signing in is one tap away in
					    the hero and the footer, so this is the one that gives way. */}
					<ButtonLink
						variant="ghost"
						className="hidden h-10 px-4 sm:inline-flex"
						href="/login"
					>
						Entrar
					</ButtonLink>
					<ButtonLink
						size="lg"
						className="cta-button h-10 px-5"
						href="/cadastro"
					>
						Testar grátis
					</ButtonLink>
				</div>
			</header>

			{/* 1. Hero — a cinematic full-bleed band, the casar.com structure: the
			    field photograph fills the top of the page, the promise runs huge
			    and centred across it, and the product frame rises into it from
			    below. The band paints its own scrim (radial behind the headline,
			    linear at the foot, where the frame seats), so the white ink here
			    follows the `.hero-wash` pattern — the one sanctioned way of
			    writing straight on the photograph. Like the closing band, the
			    surface is a photograph and ignores the light/dark axis. */}
			<section
				data-hero-section
				aria-labelledby="hero-title"
				className="landing-band landing-band-hero relative isolate mt-4 flex max-h-[56rem] min-h-[78svh] flex-col items-center justify-center pt-16 pb-40 text-center sm:pb-48 lg:min-h-[82svh]"
			>
				{/* Kicker: the trial promise as a whisper above the shout, flanked
				    by two hairline gold bars (GSAP scales them from the centre). */}
				<p
					data-hero-item
					className="flex items-center gap-3 text-[0.8125rem] font-medium tracking-[0.22em] text-gold uppercase sm:text-sm"
				>
					<span
						data-hero-bar
						aria-hidden
						className="h-px w-8 bg-gradient-to-r from-transparent via-gold/70 to-transparent sm:w-12"
					/>
					14 dias grátis · sem cartão
					<span
						data-hero-bar
						aria-hidden
						className="h-px w-8 bg-gradient-to-r from-transparent via-gold/70 to-transparent sm:w-12"
					/>
				</p>
				{/* Three fixed lines — manual breaks, no text-balance — so the
				    headline keeps its shape at every width. The clamp lands ~38px
				    at 390, ~59px at 768 and tops out at 104px on desktop: the
				    largest type on the page by design ("chamando bastante
				    atenção"). The closing line takes the display italic, the same
				    roman/italic pair the final CTA already uses; the whitespace
				    between the block spans keeps the accessible name readable and
				    never renders. */}
				<h1
					data-hero-item
					id="hero-title"
					className="mt-6 font-display text-[clamp(2.25rem,0.8rem+6vw,6.5rem)] leading-[1.04] font-[350] tracking-tight text-white"
				>
					<span className="block">Planeje cada detalhe</span>{" "}
					<span className="block">do seu casamento</span>{" "}
					<span className="block text-white/85 italic [font-synthesis-style:none]">
						em um só lugar.
					</span>
				</h1>
				<p
					data-hero-item
					className="mx-auto mt-6 max-w-xl text-base text-pretty text-white/85 sm:text-lg"
				>
					Orçamento, fornecedores, convidados e todas as etapas até o grande dia
					— sem planilhas.
				</p>
				<div
					data-hero-item
					className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
				>
					<ButtonLink
						size="lg"
						className="cta-button h-12 w-full max-w-xs px-7 text-base sm:w-auto"
						href="/cadastro"
					>
						Começar 14 dias grátis
						<ArrowRight className="size-4" />
					</ButtonLink>
					{/* Not the stock outline variant: paper on the photograph reads
					    as a hole in the scene. Translucent white glass instead, in
					    both themes — the surface under it is the photo either way. */}
					<ButtonLink
						variant="outline"
						size="lg"
						className="cta-button h-12 w-full max-w-xs border-white/40 bg-white/10 px-7 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20"
						href="/login"
					>
						Já tenho conta
					</ButtonLink>
				</div>
			</section>

			{/* The stage: the product frame rises out of the hero's bottom scrim
			    (negative margin), casar.com-style — photograph above, product
			    below, one shared centre axis. ProductDemo animates itself; the
			    page only carries the entrance and parallax hooks. */}
			<div
				data-hero-visual
				data-parallax="5"
				className="relative z-10 -mt-28 flex justify-center sm:-mt-36 lg:-mt-40"
			>
				<ProductDemo />
			</div>

			{/* 2. Pain — the cost of keeping the wedding in a dozen places.
			    It stands on the cool, recessed band: this is the one stretch of
			    the page that is deliberately desaturated, so the colour returns
			    with the solution. The stage above already provides the pause, so
			    the approach is one step shorter than the other bands'. */}
			<section
				className="landing-band landing-band-deep mt-24 sm:mt-32"
				aria-labelledby="dores"
			>
				<SectionSurface data-reveal className="max-w-3xl">
					<h2 id="dores" className={SECTION_HEADING}>
						Menos tempo procurando. Mais tempo realizando.
					</h2>
					<GoldRule />
					<p className="mt-5 max-w-2xl text-pretty text-muted-foreground">
						Enquanto o orçamento fica na planilha, os convidados no WhatsApp e
						as inspirações salvas em dezenas de pastas, a organização vira uma
						preocupação constante.
					</p>
				</SectionSurface>
				<ul data-reveal-stagger className="mt-10 grid gap-4 sm:grid-cols-2">
					{PAIN_POINTS.map((pain) => (
						<li
							key={pain.title}
							className="landing-tile flex gap-4 rounded-2xl bg-card/95 p-5 ring-1 ring-border backdrop-blur-xl"
						>
							{/* Not `destructive`: the system's error colour was the only
							    sharp hue on the page and it belonged to nothing in the
							    identity. Muted is the point here — these are the greyed
							    months the product replaces. */}
							<span
								aria-hidden
								className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground ring-1 ring-border/70"
							>
								<pain.icon className="size-5" />
							</span>
							<div className="min-w-0">
								<h3 className="text-base font-semibold text-balance text-foreground">
									{pain.title}
								</h3>
								<p className="mt-1 text-sm text-pretty text-muted-foreground">
									{pain.body}
								</p>
							</div>
						</li>
					))}
				</ul>
			</section>

			{/* 3. Solution — the command centre, then everything it holds. Tight
			    against the pain band on purpose: the answer follows the problem
			    without a pause. */}
			<section className="mt-28" aria-labelledby="solucao">
				<SectionSurface data-reveal className="max-w-3xl">
					<h2 id="solucao" className={SECTION_HEADING}>
						Um painel pensado para acompanhar vocês até o altar.
					</h2>
					<GoldRule />
					<p className="mt-5 max-w-2xl text-pretty text-muted-foreground">
						Visualizem orçamento, tarefas, fornecedores, convidados e próximas
						etapas em segundos.
					</p>
				</SectionSurface>

				<ul
					data-reveal-stagger
					className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
				>
					{FEATURES.map((feature) => {
						const featured = "featured" in feature && feature.featured;
						return (
							<li key={feature.title} className={featured ? "lg:-mt-8" : ""}>
								<Card
									className={
										featured
											? "landing-card h-full gap-4 p-7 ring-gold/35"
											: "landing-card h-full gap-4 p-7"
									}
								>
									<span
										className={
											featured
												? "flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/30"
												: "flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
										}
									>
										<feature.icon className="size-5" aria-hidden />
									</span>
									<div>
										<h3
											className={
												featured
													? "font-display text-xl font-semibold text-balance text-foreground"
													: "font-display text-lg font-semibold text-balance text-foreground"
											}
										>
											{feature.title}
										</h3>
										<p className="mt-2 text-sm text-pretty text-muted-foreground">
											{feature.body}
										</p>
									</div>
								</Card>
							</li>
						);
					})}
				</ul>
			</section>

			{/* 4. Inspirations — references become plans (owns its own heading) */}
			<InspirationShowcase />

			{/* 5. Como funciona — five steps; the automatic checklist leads.
			    Warm ground, gold top edge: the page's second change of terrain
			    and the point where the product starts doing the work. */}
			<section
				className="landing-band landing-band-warm mt-28 [--band-bottom:2.5rem] sm:mt-36"
				aria-labelledby="como-funciona"
			>
				{/* Two words and a rule, and it still gets paper: a 3rem display face
				    at weight 300 is the worst possible ink to lay on a photograph.
				    `w-fit` keeps it a plaque rather than an empty slab. */}
				<SectionSurface className="w-fit">
					<h2 data-reveal id="como-funciona" className={SECTION_HEADING}>
						Como funciona
					</h2>
					<div data-reveal>
						<GoldRule />
					</div>
				</SectionSurface>
				{/* Single column until lg: a 2-column grid would leave a hole next to
				    the double-width featured step. */}
				<ol data-reveal-stagger className="mt-10 grid gap-4 lg:grid-cols-3">
					{STEPS.map((step) => {
						const featured = "featured" in step && step.featured;
						return (
							<li
								key={step.n}
								className={
									// The featured step keeps its primary tint, but the tint is
									// now a gradient *over* an opaque card instead of being the
									// whole surface: at bg-primary/8 the step's paragraph was
									// 92% field photograph.
									featured
										? "landing-tile relative flex flex-col rounded-2xl bg-card/95 bg-linear-to-br from-primary/14 to-gold/10 p-7 ring-1 ring-gold/40 lg:col-span-2"
										: "landing-tile flex flex-col rounded-2xl bg-card/95 p-7 ring-1 ring-border backdrop-blur-xl"
								}
							>
								<div className="flex items-center gap-3">
									<span
										className={
											featured
												? "flex size-12 items-center justify-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground"
												: "flex size-11 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary ring-1 ring-primary/15"
										}
									>
										{step.n}
									</span>
									{featured ? (
										<span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
											<Sparkles className="size-3.5 text-gold" aria-hidden />
											Automático
										</span>
									) : null}
								</div>
								<h3
									className={
										featured
											? "mt-4 font-display text-xl font-semibold text-balance text-foreground sm:text-2xl"
											: "mt-4 text-lg font-semibold text-balance text-foreground"
									}
								>
									{step.title}
								</h3>
								<p
									className={
										featured
											? "mt-2 max-w-2xl text-pretty text-muted-foreground"
											: "mt-1.5 text-sm text-pretty text-muted-foreground"
									}
								>
									{step.body}
								</p>
							</li>
						);
					})}
				</ol>
			</section>

			{/* 6. Social proof — couples like them, no carousel weight */}
			<TestimonialsSection />

			{/* 7. Feedback-driven — honest authority for a young product. It sits
			    in the gap between the testimonials and the FAQ, so it carries an
			    ambient field: the hero's atmosphere returns once, halfway down. */}
			<section
				data-reveal
				className="relative isolate mt-20"
				aria-labelledby="feedback"
			>
				<div aria-hidden className="ambient-field">
					<span data-ambient-blob className="ambient-blob ambient-blob-lead" />
					<span data-ambient-blob className="ambient-blob ambient-blob-trail" />
				</div>
				<Card className="landing-card flex flex-col gap-5 border-t-2 border-gold/70 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
					<div className="max-w-xl">
						<span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
							Feito com casais de verdade
						</span>
						<h2
							id="feedback"
							className="mt-4 font-display text-[1.75rem] leading-[1.1] font-light tracking-tight text-balance text-foreground sm:text-4xl"
						>
							Construído junto com quem está vivendo essa fase.
						</h2>
						<p className="mt-4 text-pretty text-muted-foreground">
							O Nosso Casamento evolui com a ajuda de casais reais. Cada
							sugestão pode se transformar na próxima melhoria da plataforma.
						</p>
					</div>
					<span
						aria-hidden
						data-parallax="8"
						className="flex size-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-primary/10 text-primary ring-1 ring-primary/15"
					>
						<MessagesSquare className="size-9" />
					</span>
				</Card>
			</section>

			{/* 8. FAQ — objection handling */}
			<FaqSection />

			{/* 9. Final CTA — the day is short, the planning is long. The longest
			    approach on the page, the largest heading on the page, and the only
			    italic: the climax should not arrive at the same size and in the
			    same voice as every argument before it. */}
			<section
				data-reveal
				className="relative isolate mt-32 sm:mt-40"
				aria-labelledby="cta-final"
			>
				<div aria-hidden className="ambient-field">
					<span data-ambient-blob className="ambient-blob ambient-blob-lead" />
					<span data-ambient-blob className="ambient-blob ambient-blob-trail" />
				</div>
				<Card className="hero-wash relative overflow-hidden p-9 text-center text-white sm:p-14">
					{/* `.hero-wash` darkens the photo from the left only (42%, gone by
					    58%), so this centred block runs off that scrim and onto raw
					    sky — white at weight 300 and 3.75rem has nothing to hold on to
					    there. This closes the wash from the other side. Literal black
					    like the `text-white` around it: the surface is a photograph and
					    does not follow the light/dark axis. */}
					<span
						aria-hidden
						className="absolute inset-0 bg-linear-to-l from-black/45 via-black/30 to-transparent"
					/>
					{/* `data-reveal` stays on the section; the stagger is added here so
					    headline, sub, highlights and button cascade instead of landing
					    as one block. */}
					<div data-reveal-stagger className="relative z-10 mx-auto max-w-2xl">
						<h2
							id="cta-final"
							className="font-display text-4xl leading-[1.06] font-light tracking-tight text-balance sm:text-6xl"
						>
							O casamento acontece em um dia.
							{/* `font-synthesis-style: none` is load-bearing: the display face
							    is currently loaded without an italic (app/layout.tsx), and a
							    browser-sheared high-contrast serif at this size looks broken.
							    This asks for the real italic and accepts roman until the font
							    config ships one — it never accepts a fake. */}
							<span className="block text-white/80 italic [font-synthesis-style:none]">
								A organização acontece durante meses.
							</span>
						</h2>
						<p className="mx-auto mt-6 max-w-lg text-pretty text-white/85">
							Comecem hoje a organizar tudo em um só lugar e vivam essa fase com
							mais tranquilidade.
						</p>
						<ul className="mx-auto mt-7 flex max-w-lg flex-col items-center justify-center gap-x-6 gap-y-2.5 sm:flex-row sm:flex-wrap">
							{CTA_HIGHLIGHTS.map((highlight) => (
								<li
									key={highlight}
									className="flex items-center gap-2 text-sm font-medium text-white/90"
								>
									<span
										aria-hidden
										className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/35 ring-1 ring-gold/60"
									>
										<Check className="size-3.5" />
									</span>
									{highlight}
								</li>
							))}
						</ul>
						<div className="mt-8 flex justify-center">
							<ButtonLink
								size="lg"
								className="cta-button h-12 px-7 text-base"
								href="/cadastro"
							>
								Começar agora
								<ArrowRight className="size-4" />
							</ButtonLink>
						</div>
					</div>
				</Card>
			</section>

			<LandingFooter />

			{/* Floating CTA (mobile): slides in once the hero CTAs scroll away. */}
			<div
				data-floating-cta
				className="floating-cta fixed inset-x-0 bottom-4 z-50 flex justify-center px-5 sm:hidden"
			>
				<ButtonLink
					size="lg"
					className="cta-button h-12 w-full max-w-sm px-6 text-base shadow-[0_18px_44px_oklch(0.2_0.06_132_/_0.35)]"
					href="/cadastro"
				>
					Começar 14 dias grátis
					<ArrowRight className="size-4" />
				</ButtonLink>
			</div>
		</main>
	);
}
