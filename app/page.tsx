import {
	ArrowDown,
	ArrowRight,
	CalendarX2,
	Check,
	CircleHelp,
	Heart,
	ListChecks,
	MessagesSquare,
	Moon,
	Palette,
	ShieldCheck,
	Sparkles,
	Table2,
	Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CockpitPreview } from "@/components/marketing/cockpit-preview";
import { FaqSection } from "@/components/marketing/faq-section";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingMotion } from "@/components/marketing/landing-motion";
import {
	SocialProofInline,
	TestimonialsSection,
} from "@/components/marketing/testimonials";
import { ThemeShowcase } from "@/components/marketing/theme-showcase";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
	title: "Nosso Casamento — cheguem ao grande dia sem sustos no orçamento",
	description:
		"Fornecedores, orçamento em centavos, parcelas com vencimento, checklist mês a mês e contagem regressiva — o casamento inteiro sob controle, no celular. 14 dias grátis, sem cartão de crédito.",
};

/** The couple's biggest recurring pains — kept short and visceral. */
const PAIN_POINTS = [
	{
		icon: Table2,
		title: "A planilha que só um de vocês entende",
		body: "Três versões do mesmo arquivo, uma fórmula quebrada — e a dúvida eterna: esse total está certo?",
	},
	{
		icon: CalendarX2,
		title: "A parcela que passa em branco",
		body: "Um vencimento esquecido vira multa, juros e aquela ligação constrangedora para o fornecedor.",
	},
	{
		icon: CircleHelp,
		title: "“Quanto já gastamos?” vira discussão",
		body: "Quando cada um tem uma resposta diferente, o assunto dinheiro azeda até o jantar mais tranquilo.",
	},
	{
		icon: Moon,
		title: "A conferida mental das 2h da manhã",
		body: "Deitar repassando pagamentos de cabeça, com medo de ter esquecido algo — todo santo dia.",
	},
] as const;

export default function LandingPage() {
	return (
		<main className="mx-auto w-full max-w-6xl px-5 pt-6">
			<LandingMotion />

			{/* Top bar */}
			<header data-hero-nav className="flex items-center justify-between">
				<span className="inline-flex items-center gap-2 font-display text-xl font-semibold text-primary">
					<Heart className="size-5 text-gold" aria-hidden />
					Nosso Casamento
				</span>
				<div className="flex items-center gap-1.5">
					<ThemeToggle />
					<Button
						variant="ghost"
						className="h-10 px-4"
						nativeButton={false}
						render={<Link href="/login" />}
					>
						Entrar
					</Button>
					<Button
						size="lg"
						className="cta-button h-10 px-5"
						nativeButton={false}
						render={<Link href="/cadastro" />}
					>
						Testar grátis
					</Button>
				</div>
			</header>

			{/* 1. Hero — the promise: peace of mind + total control */}
			<section
				data-hero-section
				aria-labelledby="hero-title"
				className="relative isolate mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1.05fr_0.95fr]"
			>
				{/* Ambient backdrop: three low-opacity gradient blobs in the brand
				    tones drift slowly behind the glass card (GSAP, desktop only —
				    they stay as a static painted-once glow on mobile and for
				    reduced-motion users). Purely decorative. */}
				<div aria-hidden data-hero-ambient className="hero-ambient">
					<span data-hero-blob className="hero-blob hero-blob-olive" />
					<span data-hero-blob className="hero-blob hero-blob-gold" />
					<span data-hero-blob className="hero-blob hero-blob-champagne" />
				</div>

				{/* Frosted paper backing keeps the copy readable over the field photo
				    (AA) while staying airy rather than a hard-edged card. */}
				<div className="landing-glass rounded-[2.25rem] bg-card/55 p-7 ring-1 ring-border backdrop-blur-2xl sm:p-9">
					<span
						data-hero-item
						className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/15"
					>
						<Sparkles className="size-4 text-gold" aria-hidden />
						14 dias grátis · sem cartão de crédito
					</span>
					<h1
						data-hero-item
						id="hero-title"
						className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
					>
						Cheguem ao grande dia com tudo pago, no prazo e sem sustos.
					</h1>
					<div
						data-hero-bar
						aria-hidden
						className="mt-5 h-1.5 w-28 rounded-full bg-gradient-to-r from-gold via-gold/60 to-transparent"
					/>
					<p
						data-hero-item
						className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground"
					>
						Fornecedores, orçamento centavo a centavo, parcelas com vencimento e
						o checklist do mês — num app que os dois abrem do celular e
						respondem, numa olhada, exatamente onde o casamento está.
					</p>
					<div
						data-hero-item
						className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
					>
						<Button
							size="lg"
							className="cta-button h-12 px-6 text-base"
							nativeButton={false}
							render={<Link href="/cadastro" />}
						>
							Começar 14 dias grátis
							<ArrowRight className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="cta-button h-12 px-6 text-base"
							nativeButton={false}
							render={<Link href="/login" />}
						>
							Entrar
						</Button>
					</div>
					<div data-hero-item className="mt-5 flex flex-col gap-2">
						<SocialProofInline />
						<p className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<ShieldCheck className="size-4 text-success" aria-hidden />
							Conta pronta em 1 minuto. Cancele quando quiser.
						</p>
					</div>
				</div>

				<div
					data-hero-visual
					data-parallax="5"
					className="flex justify-center lg:justify-end"
				>
					<CockpitPreview />
				</div>
			</section>

			{/* 2. Pain — the real cost of staying on the spreadsheet */}
			<section className="mt-24" aria-labelledby="dores">
				<div data-reveal className="max-w-2xl">
					<h2
						id="dores"
						className="font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
					>
						Planejar o dia mais feliz não deveria tirar o sono de vocês
					</h2>
					<p className="mt-3 text-pretty text-muted-foreground">
						Enquanto o casamento vive numa planilha, é isso que continua
						acontecendo:
					</p>
				</div>
				<ul data-reveal-stagger className="mt-8 grid gap-4 sm:grid-cols-2">
					{PAIN_POINTS.map((pain) => (
						<li
							key={pain.title}
							className="landing-tile flex gap-4 rounded-2xl bg-card/55 p-5 ring-1 ring-border backdrop-blur-xl"
						>
							<span
								aria-hidden
								className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
							>
								<pain.icon className="size-5" />
							</span>
							<div>
								<h3 className="text-base font-semibold text-foreground">
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

			{/* 3. Solution — three benefits, then the live customization demo */}
			<section className="mt-24" aria-labelledby="solucao">
				<div data-reveal className="max-w-2xl">
					<h2
						id="solucao"
						className="font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
					>
						Troquem a ansiedade por uma olhada que resolve
					</h2>
					<p className="mt-3 text-pretty text-muted-foreground">
						O Nosso Casamento é o cockpit do casal: três coisas que ele faz por
						vocês todos os dias, até o altar.
					</p>
				</div>

				<div data-reveal-stagger className="mt-10 grid gap-4 md:grid-cols-3">
					{/* (a) Trustworthy finance */}
					<Card className="landing-card flex flex-col gap-5 p-7">
						<span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Wallet className="size-5" aria-hidden />
						</span>
						<div>
							<h3 className="font-display text-xl font-semibold text-foreground">
								Números que vocês confiam de olhos fechados
							</h3>
							<p className="mt-2 text-sm text-pretty text-muted-foreground">
								Meta, fechado, pago e saldo calculados centavo a centavo, com
								entradas e parcelas datadas. O que vence primeiro aparece
								primeiro — nenhum boleto pega vocês de surpresa.
							</p>
						</div>
						<dl className="mt-auto grid grid-cols-3 gap-2">
							{[
								{ k: "Meta", v: "R$ 80.000" },
								{ k: "Pago", v: "R$ 49.600" },
								{ k: "Saldo", v: "R$ 30.400" },
							].map((stat) => (
								<div
									key={stat.k}
									className="rounded-xl bg-muted/50 px-3 py-2.5 ring-1 ring-border"
								>
									<dt className="text-xs text-muted-foreground">{stat.k}</dt>
									<dd className="mt-0.5 font-display text-sm font-semibold tabular-nums text-foreground sm:text-base">
										{stat.v}
									</dd>
								</div>
							))}
						</dl>
					</Card>

					{/* (b) Month-by-month checklist */}
					<Card className="landing-card flex flex-col gap-5 p-7">
						<span className="flex size-11 items-center justify-center rounded-xl bg-accent/70 text-accent-foreground">
							<ListChecks className="size-5" aria-hidden />
						</span>
						<div>
							<h3 className="font-display text-xl font-semibold text-foreground">
								Um checklist que diz o que fazer agora
							</h3>
							<p className="mt-2 text-sm text-pretty text-muted-foreground">
								O roteiro mês a mês nasce pronto com a data do casamento. Em vez
								de adivinhar por onde começar, vocês só abrem o mês e riscam.
							</p>
						</div>
						<ul className="mt-auto flex flex-col gap-2">
							{[
								{ label: "Fechar buffet", done: true },
								{ label: "Provar o vestido", done: true },
								{ label: "Enviar convites", done: false },
							].map((task) => (
								<li
									key={task.label}
									className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2 text-sm ring-1 ring-border"
								>
									<span
										aria-hidden
										className={
											task.done
												? "flex size-5 items-center justify-center rounded-full bg-success text-white"
												: "size-5 rounded-full ring-1 ring-border"
										}
									>
										{task.done ? <Check className="size-3.5" /> : null}
									</span>
									<span
										className={
											task.done
												? "text-muted-foreground line-through"
												: "font-medium text-foreground"
										}
									>
										{task.label}
									</span>
									<span className="sr-only">
										{task.done ? "(feito)" : "(pendente)"}
									</span>
								</li>
							))}
						</ul>
					</Card>

					{/* (c) Everything in one place, in the couple's colors */}
					<Card className="landing-card flex flex-col gap-5 p-7">
						<span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
							<Palette className="size-5" aria-hidden />
						</span>
						<div>
							<h3 className="font-display text-xl font-semibold text-foreground">
								Tudo do casal num lugar só — com a cara de vocês
							</h3>
							<p className="mt-2 text-sm text-pretty text-muted-foreground">
								Fornecedores, convidados e RSVP, inspirações e a contagem
								regressiva na mesma conta. E o app inteiro se veste da paleta do
								casamento de vocês.
							</p>
						</div>
						<p className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary">
							Experimente as cores logo abaixo
							<ArrowDown className="size-4" aria-hidden />
						</p>
					</Card>
				</div>

				{/* Live proof of (c): the visitor recolours the app right here. */}
				<ThemeShowcase />
			</section>

			{/* Como funciona — three steps, low-friction bridge to the trial */}
			<section className="mt-24" aria-labelledby="como-funciona">
				<h2
					data-reveal
					id="como-funciona"
					className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
				>
					Como funciona
				</h2>
				<ol data-reveal-stagger className="mt-8 grid gap-6 sm:grid-cols-3">
					{[
						{
							n: "1",
							title: "Criem a conta grátis",
							body: "Informem o casal, a data e a meta de orçamento. O checklist mês a mês já nasce pronto.",
						},
						{
							n: "2",
							title: "Cadastrem o que importa",
							body: "Fornecedores, valores fechados, entradas e parcelas com seus vencimentos.",
						},
						{
							n: "3",
							title: "Acompanhem sem esforço",
							body: "Vejam o que está pago, o que vence e o que falta fazer — numa olhada, do celular.",
						},
					].map((step) => (
						<li key={step.n} className="relative flex flex-col">
							<span className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary ring-1 ring-primary/15">
								{step.n}
							</span>
							<h3 className="mt-4 text-lg font-semibold text-foreground">
								{step.title}
							</h3>
							<p className="mt-1.5 text-sm text-pretty text-muted-foreground">
								{step.body}
							</p>
						</li>
					))}
				</ol>
			</section>

			{/* 4. Social proof — couples like them, no carousel weight */}
			<TestimonialsSection />

			{/* Feedback-driven — honest authority for a young product */}
			<section data-reveal className="mt-24" aria-labelledby="feedback">
				<Card className="landing-card flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
					<div className="max-w-xl">
						<span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
							Feito com casais de verdade
						</span>
						<h2
							id="feedback"
							className="mt-4 font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
						>
							Sua opinião molda o app
						</h2>
						<p className="mt-3 text-pretty text-muted-foreground">
							A gente ouve as dores de quem está planejando e transforma cada
							sugestão em melhoria. Dentro do app, é um toque para falar com a
							gente — e o que vocês pedem pode virar a próxima novidade.
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

			{/* 5. FAQ — objection handling */}
			<FaqSection />

			{/* 6. Final CTA — honest urgency: the date doesn't move */}
			<section data-reveal className="mt-24" aria-labelledby="cta-final">
				<Card className="hero-wash relative overflow-hidden p-9 text-center text-white sm:p-14">
					<div className="relative z-10 mx-auto max-w-2xl">
						<span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-1.5 text-sm font-medium ring-1 ring-white/25 backdrop-blur-md">
							<Heart className="size-4 text-gold" aria-hidden />
							14 dias grátis · sem cartão
						</span>
						<h2
							id="cta-final"
							className="mt-5 font-display text-3xl font-semibold text-balance sm:text-4xl"
						>
							A data do casamento não espera
						</h2>
						<p className="mx-auto mt-4 max-w-lg text-pretty text-white/85">
							Cada mês na planilha é mais um vencimento que pode passar batido —
							e mais um fim de semana de conferência em vez de tranquilidade. Em
							poucos minutos, o orçamento inteiro de vocês está num lugar só.
						</p>
						<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<Button
								size="lg"
								className="cta-button h-12 px-7 text-base"
								nativeButton={false}
								render={<Link href="/cadastro" />}
							>
								Começar 14 dias grátis
								<ArrowRight className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="lg"
								className="cta-button h-12 px-6 text-base text-white hover:bg-white/15 hover:text-white"
								nativeButton={false}
								render={<Link href="/login" />}
							>
								Já tenho conta
							</Button>
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
				<Button
					size="lg"
					className="cta-button h-12 w-full max-w-sm px-6 text-base shadow-[0_18px_44px_oklch(0.2_0.06_132_/_0.35)]"
					nativeButton={false}
					render={<Link href="/cadastro" />}
				>
					Começar 14 dias grátis
					<ArrowRight className="size-4" />
				</Button>
			</div>
		</main>
	);
}
