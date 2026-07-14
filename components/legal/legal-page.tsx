import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for the public legal pages (Termos de Uso, Política de
 * Privacidade). Photo-led glass surface, Fraunces headings and a reading
 * measure kept around ~68ch so long-form pt-BR copy stays comfortable.
 *
 * These pages live OUTSIDE the (app) route group on purpose — they must be
 * reachable with no account and no auth.
 */

export function LegalPage({
	title,
	subtitle,
	updatedAt,
	children,
}: {
	title: string;
	subtitle: string;
	/** Human-readable last-review date, e.g. "14 de julho de 2026". */
	updatedAt: string;
	children: ReactNode;
}) {
	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col px-4 py-10 sm:py-16">
			<Link
				href="/"
				className="group mb-6 inline-flex w-fit items-center gap-2 rounded-full px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<span
					aria-hidden
					className="transition-transform group-hover:-translate-x-0.5"
				>
					←
				</span>
				Voltar ao início
			</Link>

			<article className="animate-card-enter rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_24px_60px_oklch(0.32_0.07_132_/_0.2)] backdrop-blur-2xl sm:p-10">
				<header className="mb-8">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
						Nosso Casamento
					</p>
					<h1 className="mt-3 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-balance text-foreground sm:text-4xl">
						{title}
					</h1>
					<div
						aria-hidden
						className="mt-4 h-1.5 w-24 rounded-full bg-gradient-to-r from-gold via-gold/70 to-transparent"
					/>
					<p className="mt-4 max-w-[60ch] text-pretty text-[15px] leading-7 text-muted-foreground">
						{subtitle}
					</p>
					<p className="mt-3 text-sm text-muted-foreground">
						Última atualização:{" "}
						<span className="font-medium text-foreground/80">{updatedAt}</span>
					</p>

					<div className="mt-6 rounded-2xl border border-accent bg-accent/40 p-4">
						<p className="text-sm leading-6 text-accent-foreground">
							<span className="font-semibold">Aviso:</span> este é um modelo
							inicial, redigido em linguagem simples para transparência. Ele
							deve ser revisado por um advogado antes de ser adotado como
							documento jurídico definitivo do serviço.
						</p>
					</div>
				</header>

				<div className="max-w-[68ch]">{children}</div>
			</article>

			<footer className="mt-8 px-1 text-center text-xs text-muted-foreground">
				<nav className="flex items-center justify-center gap-4">
					<Link
						href="/termos"
						className="transition-colors hover:text-foreground"
					>
						Termos de Uso
					</Link>
					<span aria-hidden className="text-border">
						•
					</span>
					<Link
						href="/privacidade"
						className="transition-colors hover:text-foreground"
					>
						Política de Privacidade
					</Link>
				</nav>
			</footer>
		</main>
	);
}

/** A numbered/titled section with a Fraunces heading. */
export function LegalSection({
	index,
	title,
	children,
}: {
	index: number;
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="mt-9 first:mt-0">
			<h2 className="flex items-baseline gap-2.5 font-display text-xl font-semibold tracking-tight text-foreground">
				<span className="text-base font-semibold tabular-nums text-primary/70">
					{index}.
				</span>
				{title}
			</h2>
			<div className="mt-3 flex flex-col gap-3">{children}</div>
		</section>
	);
}

/** Standard reading paragraph with the shared measure and rhythm. */
export function LegalParagraph({ children }: { children: ReactNode }) {
	return <p className="text-[15px] leading-7 text-foreground/90">{children}</p>;
}

/** Bulleted list for enumerations (dados coletados, direitos, etc.). */
export function LegalList({ children }: { children: ReactNode }) {
	return <ul className="flex flex-col gap-2 pl-1">{children}</ul>;
}

export function LegalListItem({ children }: { children: ReactNode }) {
	return (
		<li className="flex gap-2.5 text-[15px] leading-7 text-foreground/90">
			<span
				aria-hidden
				className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold"
			/>
			<span>{children}</span>
		</li>
	);
}
