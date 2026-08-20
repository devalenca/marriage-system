import Link from "next/link";
import { SectionSurface } from "@/components/marketing/section-surface";

const FOOTER_LINKS = [
	{ href: "/login", label: "Entrar" },
	{ href: "/cadastro", label: "Criar conta" },
	{ href: "/termos", label: "Termos de uso" },
	{ href: "/privacidade", label: "Privacidade" },
] as const;

export function LandingFooter() {
	return (
		<footer data-reveal className="relative mt-24 pt-12 pb-12">
			{/* The closing line of the page: a champagne hairline that fades into
			    the page edges instead of a flat 1px border across the whole width. */}
			<span
				aria-hidden
				className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent"
			/>
			{/* The whole footer was ink on grass: wordmark, description and all four
			    links. It is also the last thing on the page, where the photograph is
			    at its densest, so it gets a full sheet rather than four separate
			    patches. */}
			<SectionSurface className="mx-auto max-w-5xl">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="font-display text-2xl font-light tracking-tight text-primary">
							Nosso Casamento
						</p>
						<p className="mt-2 max-w-xs text-sm text-muted-foreground text-pretty">
							O cockpit de planejamento para o casal acompanhar tudo até o
							grande dia.
						</p>
					</div>
					<nav
						aria-label="Rodapé"
						className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
					>
						{FOOTER_LINKS.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								/* 0.65 of the foreground lands at ~4.2:1 even on paper —
								   under AA for a 14px link. 0.75 clears it in both themes
								   without turning the row into four headlines. */
								className="text-foreground/75 underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline hover:decoration-gold/60"
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
				<p className="mt-10 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
					Feito com carinho para quem está planejando o casamento.
				</p>
			</SectionSurface>
		</footer>
	);
}
