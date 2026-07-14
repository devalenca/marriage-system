import Link from "next/link";

export function LandingFooter() {
	return (
		<footer className="mt-24 border-t border-border/70 pt-10 pb-12">
			<div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="font-display text-lg font-semibold text-primary">
						Nosso Casamento
					</p>
					<p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
						O cockpit de planejamento para o casal acompanhar tudo até o grande
						dia.
					</p>
				</div>
				<nav
					aria-label="Rodapé"
					className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
				>
					<Link
						href="/login"
						className="text-muted-foreground hover:text-foreground"
					>
						Entrar
					</Link>
					<Link
						href="/cadastro"
						className="text-muted-foreground hover:text-foreground"
					>
						Criar conta
					</Link>
					<Link
						href="/termos"
						className="text-muted-foreground hover:text-foreground"
					>
						Termos de uso
					</Link>
					<Link
						href="/privacidade"
						className="text-muted-foreground hover:text-foreground"
					>
						Privacidade
					</Link>
				</nav>
			</div>
			<p className="mx-auto mt-8 max-w-5xl px-5 text-xs text-muted-foreground">
				Feito com carinho para quem está planejando o casamento.
			</p>
		</footer>
	);
}
