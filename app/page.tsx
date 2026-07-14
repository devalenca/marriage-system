import {
	ArrowRight,
	CalendarClock,
	Heart,
	Images,
	ListChecks,
	MessagesSquare,
	Users,
	Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CockpitPreview } from "@/components/marketing/cockpit-preview";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { ThemeShowcase } from "@/components/marketing/theme-showcase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
	title: "Nosso Casamento — o casamento inteiro sob controle",
	description:
		"Organize fornecedores, orçamento, pagamentos, checklist e a contagem regressiva do casamento — tudo num lugar só. Experimente 14 dias grátis.",
};

export default function LandingPage() {
	return (
		<main className="animate-screen-enter mx-auto w-full max-w-6xl px-5 pt-6">
			{/* Top bar */}
			<header className="flex items-center justify-between">
				<span className="inline-flex items-center gap-2 font-display text-xl font-semibold text-primary">
					<Heart className="size-5 text-gold" aria-hidden />
					Nosso Casamento
				</span>
				<div className="flex items-center gap-1.5">
					<Button
						variant="ghost"
						className="h-10 px-4"
						render={<Link href="/login" />}
					>
						Entrar
					</Button>
					<Button
						size="lg"
						className="h-10 px-5"
						render={<Link href="/cadastro" />}
					>
						Criar conta
					</Button>
				</div>
			</header>

			{/* Hero */}
			<section className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1.05fr_0.95fr]">
				{/* Frosted paper backing keeps the copy readable over the field photo
				    (AA) while staying airy rather than a hard-edged card. */}
				<div className="rounded-[2.25rem] bg-card/55 p-7 shadow-[0_20px_60px_oklch(0.2_0.05_130_/_0.16)] ring-1 ring-border backdrop-blur-2xl sm:p-9">
					<h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						O casamento inteiro sob controle, num lugar só.
					</h1>
					<div
						aria-hidden
						className="mt-5 h-1.5 w-28 rounded-full bg-gradient-to-r from-gold via-gold/60 to-transparent"
					/>
					<p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
						Fornecedores, orçamento, pagamentos, checklist e a contagem
						regressiva até o grande dia — tudo organizado, sem planilha e sem
						perder um vencimento.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button
							size="lg"
							className="h-12 px-6 text-base"
							render={<Link href="/cadastro" />}
						>
							Criar conta
							<ArrowRight className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="h-12 px-6 text-base"
							render={<Link href="/login" />}
						>
							Entrar
						</Button>
					</div>
					<p className="mt-4 text-sm text-muted-foreground">
						Comece com{" "}
						<span className="font-medium text-foreground">14 dias grátis</span>.
						Depois, uma assinatura mensal simbólica.
					</p>
				</div>

				<div className="flex justify-center lg:justify-end">
					<CockpitPreview />
				</div>
			</section>

			{/* Customization — the differentiator, shown live */}
			<ThemeShowcase />

			{/* Como funciona — three steps, connected, not a card grid */}
			<section className="mt-24" aria-labelledby="como-funciona">
				<h2
					id="como-funciona"
					className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
				>
					Como funciona
				</h2>
				<ol className="mt-8 grid gap-6 sm:grid-cols-3">
					{[
						{
							n: "1",
							title: "Crie sua conta",
							body: "Informe o casal, a data e a meta de orçamento. Seu checklist mês a mês já nasce pronto.",
						},
						{
							n: "2",
							title: "Cadastre o que importa",
							body: "Fornecedores, valores fechados, entradas e parcelas com seus vencimentos.",
						},
						{
							n: "3",
							title: "Acompanhe sem esforço",
							body: "Veja o que está pago, o que vence e o que falta fazer — numa olhada, do celular.",
						},
					].map((step, index) => (
						<li
							key={step.n}
							className="animate-card-enter relative flex flex-col"
							style={{ animationDelay: `${index * 90}ms` }}
						>
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

			{/* Features — deliberately asymmetric, grounded in real product areas */}
			<section className="mt-24" aria-labelledby="recursos">
				<h2
					id="recursos"
					className="max-w-2xl font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
				>
					Tudo o que o casal precisa para chegar tranquilo ao altar
				</h2>

				<div className="mt-10 grid gap-4 md:grid-cols-6">
					{/* Wide hero feature: finance */}
					<Card className="flex flex-col justify-between gap-6 p-7 md:col-span-4">
						<div>
							<span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Wallet className="size-5" />
							</span>
							<h3 className="mt-4 font-display text-xl font-semibold text-foreground">
								Dashboard financeiro que você confia
							</h3>
							<p className="mt-2 max-w-md text-sm text-pretty text-muted-foreground">
								Meta, previsto, fechado, pago, pendente e saldo — cada número
								com nome e alinhado, em centavos. Sem ambiguidade, sem susto no
								fim do mês.
							</p>
						</div>
						<dl className="grid grid-cols-3 gap-3">
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
									<dd className="mt-0.5 font-display text-base font-semibold tabular-nums text-foreground">
										{stat.v}
									</dd>
								</div>
							))}
						</dl>
					</Card>

					{/* Tall feature: installments / due dates */}
					<Card className="flex flex-col gap-4 p-7 md:col-span-2">
						<span className="flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
							<CalendarClock className="size-5" />
						</span>
						<h3 className="font-display text-xl font-semibold text-foreground">
							Parcelas e vencimentos
						</h3>
						<p className="text-sm text-pretty text-muted-foreground">
							Entradas e parcelas com data. O app avisa o que vence primeiro
							para você nunca atrasar um pagamento.
						</p>
					</Card>

					{/* Three balanced-but-varied feature cards */}
					<Card className="flex flex-col gap-3 p-6 md:col-span-2">
						<span className="flex size-10 items-center justify-center rounded-xl bg-accent/70 text-accent-foreground">
							<ListChecks className="size-5" />
						</span>
						<h3 className="text-lg font-semibold text-foreground">
							Checklist mês a mês
						</h3>
						<p className="text-sm text-pretty text-muted-foreground">
							Um roteiro do que fazer agora e a cada mês, com o progresso até a
							data.
						</p>
					</Card>

					<Card className="flex flex-col gap-3 p-6 md:col-span-2">
						<span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
							<Users className="size-5" />
						</span>
						<h3 className="text-lg font-semibold text-foreground">
							Convidados e RSVP
						</h3>
						<p className="text-sm text-pretty text-muted-foreground">
							Monte a lista e registre as confirmações manualmente, do seu
							jeito.
						</p>
					</Card>

					<Card className="flex flex-col gap-3 p-6 md:col-span-2">
						<span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
							<Images className="size-5" />
						</span>
						<h3 className="text-lg font-semibold text-foreground">
							Inspirações
						</h3>
						<p className="text-sm text-pretty text-muted-foreground">
							Guarde referências e ideias de decoração num só lugar, sempre à
							mão.
						</p>
					</Card>
				</div>
			</section>

			{/* Feedback-driven — we listen and adapt */}
			<section className="mt-24">
				<Card className="flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
					<div className="max-w-xl">
						<span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
							Feito com casais de verdade
						</span>
						<h2 className="mt-4 font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl">
							Sua opinião molda o app
						</h2>
						<p className="mt-3 text-pretty text-muted-foreground">
							A gente ouve as dores de quem está planejando e transforma cada
							sugestão em melhoria. Dentro do app, é um toque para falar com a
							gente — e o que você pede pode virar a próxima novidade.
						</p>
					</div>
					<span
						aria-hidden
						className="flex size-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-primary/10 text-primary ring-1 ring-primary/15"
					>
						<MessagesSquare className="size-9" />
					</span>
				</Card>
			</section>

			{/* Pricing / trial band */}
			<section className="mt-24">
				<Card className="hero-wash relative overflow-hidden p-9 text-center text-white sm:p-14">
					<div className="relative z-10 mx-auto max-w-2xl">
						<span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-1.5 text-sm font-medium ring-1 ring-white/25 backdrop-blur-md">
							<Heart className="size-4 text-gold" aria-hidden />
							14 dias grátis
						</span>
						<h2 className="mt-5 font-display text-3xl font-semibold text-balance sm:text-4xl">
							Experimente sem compromisso
						</h2>
						<p className="mx-auto mt-4 max-w-lg text-pretty text-white/85">
							Use o cockpit completo por 14 dias. Se fizer sentido, siga com uma
							assinatura mensal simbólica — pensada para caber no orçamento do
							casamento.
						</p>
						<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
							<Button
								size="lg"
								className="h-12 px-7 text-base"
								render={<Link href="/cadastro" />}
							>
								Criar conta
								<ArrowRight className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="lg"
								className="h-12 px-6 text-base text-white hover:bg-white/15 hover:text-white"
								render={<Link href="/login" />}
							>
								Já tenho conta
							</Button>
						</div>
					</div>
				</Card>
			</section>

			<LandingFooter />
		</main>
	);
}
