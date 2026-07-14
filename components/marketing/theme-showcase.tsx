"use client";

import { Check, Heart } from "lucide-react";
import { useState } from "react";
import { WEDDING_THEMES } from "@/lib/domain/themes";
import { cn } from "@/lib/utils";

/**
 * The landing's centerpiece: the visitor picks an accent and a live preview
 * of the app recolours instantly — using the very same per-wedding theme
 * system couples get inside. Shows, not tells, that the app is theirs to
 * customize. The preview is wrapped in `data-wedding-theme` so the accent
 * tokens cascade to it while the rest of the page keeps its own colour.
 */
export function ThemeShowcase() {
	const [theme, setTheme] = useState("terracota");

	return (
		<section className="mt-24" aria-labelledby="personalizacao">
			<div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
				<div>
					<span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/15">
						<Heart className="size-4 text-gold" aria-hidden />
						Do jeito de vocês
					</span>
					<h2
						id="personalizacao"
						className="mt-5 font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
					>
						Um espaço com a cara do casamento de vocês
					</h2>
					<p className="mt-4 max-w-md text-pretty text-muted-foreground">
						Escolha a paleta que combina com a festa e o app inteiro se veste
						dela — do painel aos botões. Experimente aqui e veja mudar na hora.
					</p>

					<div className="mt-6 flex flex-wrap gap-2">
						{WEDDING_THEMES.map((option) => {
							const selected = option.id === theme;
							return (
								<button
									key={option.id}
									type="button"
									aria-pressed={selected}
									onClick={() => setTheme(option.id)}
									className={cn(
										"flex min-h-11 items-center gap-2.5 rounded-2xl border px-3.5 text-sm font-medium transition-colors",
										selected
											? "border-foreground/25 bg-card/70 text-foreground shadow-sm"
											: "border-border text-muted-foreground hover:bg-card/50 hover:text-foreground",
									)}
								>
									<span
										className="flex size-5 items-center justify-center rounded-full ring-1 ring-black/10"
										style={{ backgroundColor: option.swatch }}
									>
										{selected ? (
											<Check className="size-3.5 text-white" aria-hidden />
										) : null}
									</span>
									{option.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* Live preview: everything inside recolours with the chosen theme. */}
				<div
					data-wedding-theme={theme}
					className="rounded-[2rem] bg-card/70 p-5 shadow-[0_20px_60px_oklch(0.2_0.05_130_/_0.16)] ring-1 ring-border backdrop-blur-2xl sm:p-6"
				>
					<div className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-[1.1rem] bg-primary/12 text-primary ring-1 ring-primary/15">
							<Heart className="size-5" aria-hidden />
						</span>
						<div>
							<p className="font-display text-lg font-semibold leading-tight text-primary">
								Alice & Gabriel
							</p>
							<p className="text-xs text-muted-foreground">faltam 124 dias</p>
						</div>
					</div>

					<div className="mt-5 rounded-2xl bg-background/70 p-4 ring-1 ring-border">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium text-foreground">Orçamento</span>
							<span className="text-muted-foreground">62% comprometido</span>
						</div>
						<div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-300"
								style={{ width: "62%" }}
							/>
						</div>
						<div className="mt-3 flex flex-wrap gap-1.5">
							{["Buffet", "Fotografia", "Decoração"].map((label) => (
								<span
									key={label}
									className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
								>
									{label}
								</span>
							))}
						</div>
					</div>

					<div className="mt-4 flex items-center gap-2">
						<button
							type="button"
							tabIndex={-1}
							aria-hidden
							className="flex h-10 flex-1 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
						>
							Salvar
						</button>
						<button
							type="button"
							tabIndex={-1}
							aria-hidden
							className="flex h-10 items-center justify-center rounded-2xl border border-primary/30 px-4 text-sm font-semibold text-primary"
						>
							Novo
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
