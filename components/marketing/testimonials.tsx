import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";

// PLACEHOLDER social-proof numbers — replace with real metrics before launch.
// Keep both values honest: they render in the hero and in the testimonials
// section, and inflated numbers are a trust liability for a new product.
export const SOCIAL_PROOF_RATING = "4,9";
export const SOCIAL_PROOF_COUPLES = "mais de 40 casais";

// PLACEHOLDER testimonials — replace with real couples before launch.
// Each entry is illustrative copy written to mirror the product's core
// promises (finance trust, due dates, shared clarity). Swap the whole
// array once real quotes exist; the layout below needs no changes.
const TESTIMONIALS = [
	{
		quote:
			"A gente vivia brigando por causa da planilha. Agora abrimos o app juntos no sofá e a resposta está lá: quanto falta pagar e o que vence primeiro.",
		couple: "Marina & Lucas",
		detail: "casam em outubro",
	},
	{
		quote:
			"Eu tinha pavor de esquecer uma parcela do buffet. Ver os vencimentos em ordem, com o que já está pago marcado, tirou um peso das minhas costas.",
		couple: "Camila & Rafael",
		detail: "8 meses para o grande dia",
	},
	{
		quote:
			"O checklist do mês virou nosso ritual de domingo. Em vez de ansiedade, virou a sensação boa de ver o casamento andando.",
		couple: "Ana & Pedro",
		detail: "casaram em maio",
	},
] as const;

/** Compact star rating + couples count, used right under the hero CTAs. */
export function SocialProofInline() {
	return (
		<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
			<span
				className="flex items-center gap-0.5"
				role="img"
				aria-label={`Avaliação ${SOCIAL_PROOF_RATING} de 5`}
			>
				{Array.from({ length: 5 }, (_, i) => (
					<Star
						// biome-ignore lint/suspicious/noArrayIndexKey: static 5-star row
						key={i}
						className="size-4 fill-gold text-gold"
						aria-hidden
					/>
				))}
			</span>
			<span>
				<strong className="font-semibold text-foreground">
					{SOCIAL_PROOF_RATING}/5
				</strong>{" "}
				· {SOCIAL_PROOF_COUPLES} organizando o grande dia por aqui
			</span>
		</p>
	);
}

/** Grid of couple testimonials — a grid (not a carousel) keeps it light. */
export function TestimonialsSection() {
	return (
		<section className="mt-24" aria-labelledby="depoimentos">
			<h2
				data-reveal
				id="depoimentos"
				className="max-w-2xl font-display text-2xl font-semibold text-balance text-foreground sm:text-3xl"
			>
				Casais que trocaram a planilha pela tranquilidade
			</h2>
			<div data-reveal-stagger className="mt-8 grid gap-4 md:grid-cols-3">
				{TESTIMONIALS.map((t) => (
					<Card
						key={t.couple}
						className="landing-card flex flex-col justify-between gap-6 p-7"
					>
						<blockquote className="text-sm leading-relaxed text-pretty text-foreground">
							“{t.quote}”
						</blockquote>
						<footer className="flex items-center gap-3">
							<span
								aria-hidden
								className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary ring-1 ring-primary/15"
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
				))}
			</div>
		</section>
	);
}
