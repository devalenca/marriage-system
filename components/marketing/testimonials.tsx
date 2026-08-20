import { Sparkles } from "lucide-react";
import { SectionSurface } from "@/components/marketing/section-surface";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// What the app actually centralises — the inline claim under the hero CTAs.
// Deliberately a list of real product areas instead of a rating or a couples
// count: the product is new, and a metric we cannot back is a trust liability.
const CENTRALISED_AREAS = [
	"fornecedores",
	"orçamento",
	"convidados",
	"checklist",
	"inspirações",
] as const;

// PLACEHOLDER testimonials — illustrative copy, not quotes from real couples,
// and labelled as such in the section below. Each entry deliberately names a
// different pain (scattered information, no sense of control, not knowing the
// next step) so the section does not read as one complaint repeated three
// times. Swap the whole array once real quotes exist; the layout needs no
// changes.
const TESTIMONIALS = [
	{
		quote:
			"O que antes ficava espalhado entre WhatsApp, Pinterest e planilhas agora está no mesmo lugar.",
		couple: "Marina & Lucas",
		detail: "casam em outubro",
	},
	{
		quote: "Pela primeira vez sentimos que tínhamos controle da organização.",
		couple: "Camila & Rafael",
		detail: "8 meses para o grande dia",
	},
	{
		quote:
			"O checklist mensal virou nossa referência. Sempre sabíamos qual era o próximo passo.",
		couple: "Ana & Pedro",
		detail: "casaram em maio",
	},
] as const;

/**
 * The row is deliberately uneven: the first quote is the wide one, and the two
 * behind it sit off its baseline. Three identical columns read as a template;
 * a spread reads as a page someone laid out.
 */
const CARD_RHYTHM = ["p-8 sm:p-9 md:min-h-64", "md:mt-12", "md:-mt-4"] as const;

/** One-line promise under the hero CTAs: everything in a single place. */
export function SocialProofInline() {
	return (
		<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
			<Sparkles className="size-4 shrink-0 text-gold" aria-hidden />
			<span>
				<strong className="font-semibold text-foreground">
					{CENTRALISED_AREAS.join(", ")}
				</strong>{" "}
				— o casamento inteiro em um só lugar, aberto pelos dois
			</span>
		</p>
	);
}

/** Grid of couple testimonials — a grid (not a carousel) keeps it light. */
export function TestimonialsSection() {
	return (
		<section className="mt-24" aria-labelledby="depoimentos">
			{/* Heading, rule and disclaimer share one sheet of paper. The disclaimer
			    is the part that has to survive — a section that says out loud that
			    its quotes are illustrative cannot afford to have that line dissolve
			    into the grass. Each element keeps its own reveal. */}
			<SectionSurface className="max-w-3xl">
				<h2
					data-reveal="mask"
					id="depoimentos"
					className="font-display text-4xl leading-[1.05] font-light tracking-tight text-balance text-foreground sm:text-5xl"
				>
					O que muda quando tudo fica em um só lugar
				</h2>
				{/* Gold rule: the brand accent as structure, not as icon ink. */}
				<div
					aria-hidden
					data-reveal
					className="mt-6 h-1.5 w-32 rounded-full bg-gradient-to-r from-gold via-gold/55 to-transparent"
				/>
				<p
					data-reveal
					className="mt-5 max-w-xl text-sm text-pretty text-muted-foreground"
				>
					Depoimentos ilustrativos, escritos para mostrar o dia a dia no app: o
					produto está começando e ainda estamos reunindo os relatos dos
					primeiros casais.
				</p>
			</SectionSurface>
			<div
				data-reveal-stagger="scale"
				className="mt-10 grid gap-5 md:grid-cols-[1.15fr_0.9fr_0.95fr] md:items-start"
			>
				{TESTIMONIALS.map((t, index) => {
					const lead = index === 0;
					return (
						<Card
							key={t.couple}
							className={cn(
								"landing-card relative flex flex-col justify-between gap-6 p-7",
								CARD_RHYTHM[index],
							)}
						>
							{lead ? (
								<span
									aria-hidden
									className="pointer-events-none absolute top-0 right-5 font-display text-7xl leading-none font-light text-gold/20 select-none"
								>
									”
								</span>
							) : null}
							<blockquote
								className={cn(
									"text-pretty",
									lead
										? "font-display text-xl leading-snug font-light italic text-foreground sm:text-2xl"
										: "text-sm leading-relaxed text-foreground",
								)}
							>
								“{t.quote}”
							</blockquote>
							<footer className="flex items-center gap-3">
								<span
									aria-hidden
									className={cn(
										"flex shrink-0 items-center justify-center rounded-full font-display ring-1",
										lead
											? "size-12 bg-gold/15 text-base font-medium text-gold ring-gold/35"
											: "size-10 bg-primary/10 text-sm font-medium text-primary ring-primary/15",
									)}
								>
									{t.couple
										.split(" & ")
										.map((name) => name[0])
										.join("")}
								</span>
								<div>
									<p className="text-sm font-semibold text-foreground">
										{t.couple}
									</p>
									<p className="text-xs text-muted-foreground">{t.detail}</p>
								</div>
							</footer>
						</Card>
					);
				})}
			</div>
		</section>
	);
}
