import {
	Flower2,
	ImagePlus,
	type LucideIcon,
	Mail,
	Maximize2,
	Plus,
	Shirt,
	Sparkles,
} from "lucide-react";
import { SectionSurface } from "@/components/marketing/section-surface";
import { cn } from "@/lib/utils";

type GalleryTile = {
	name: string;
	count: string;
	/** Decorative stand-in for the gallery's cover photo. */
	icon: LucideIcon;
	/** Token-derived wash, so the mosaic re-tints itself with the theme. */
	tint: string;
	/** Footprint + proportion in the mosaic; the first tile is the hero. */
	frame: string;
};

/**
 * Illustrative galleries — the themes couples open first. They mirror what
 * `components/inspiration/inspiration-content.tsx` actually supports (a named
 * gallery holding uploaded photos), and never promise more than that.
 */
const GALLERIES: readonly GalleryTile[] = [
	{
		name: "Decoração",
		count: "24 fotos",
		icon: Sparkles,
		tint: "from-primary/18 via-accent/40 to-gold/14",
		frame: "col-span-2 aspect-[16/10] sm:aspect-[16/9]",
	},
	{
		name: "Vestido e traje",
		count: "12 fotos",
		icon: Shirt,
		tint: "from-gold/18 to-accent/45",
		frame: "aspect-[4/5] sm:aspect-square",
	},
	{
		name: "Flores",
		count: "31 fotos",
		icon: Flower2,
		tint: "from-primary/14 to-accent/40",
		frame: "aspect-[4/5] sm:aspect-square",
	},
	{
		name: "Convites",
		count: "9 fotos",
		icon: Mail,
		tint: "from-accent/50 to-gold/16",
		frame: "aspect-[4/5] sm:aspect-square",
	},
] as const;

/** What a gallery lets the couple do — every claim is shipped behaviour. */
const CAPABILITIES = [
	{
		icon: ImagePlus,
		text: "Suba várias fotos de uma vez, direto do celular",
	},
	{
		icon: Maximize2,
		text: "Toque para ampliar e passar de uma foto para a outra",
	},
	{
		icon: Plus,
		text: "Crie quantas galerias quiser, com o nome que fizer sentido",
	},
] as const;

/** The palette the couple picks for the app — six token-derived swatches. */
const PALETTE_SWATCHES = [
	"bg-primary",
	"bg-gold",
	"bg-accent",
	"bg-primary/55",
	"bg-gold/50",
	"bg-muted",
] as const;

/**
 * The landing's emotional beat: every reference for the wedding — decoração,
 * vestido, flores, convites — living together instead of spread across prints,
 * conversations and open tabs.
 *
 * There are no stock photos in the repo, so the mosaic is composed entirely
 * from design tokens: each tile is a gradient wash derived from the theme
 * accent (`--primary`, `--gold`, `--accent`) with a lucide glyph standing in
 * for the cover. That keeps it honest — nothing here pretends to be a real
 * couple's album — and makes the whole section re-tint itself along with the
 * wedding theme, in light and dark alike.
 *
 * Static and server-rendered; entrance motion belongs to the landing GSAP
 * timeline via `data-reveal` / `data-parallax`.
 */
export function InspirationShowcase() {
	return (
		<section className="mt-24" aria-labelledby="inspiracoes">
			{/* Not the hero's split mirrored: the copy holds a narrow column and
			    the mosaic takes the rest, bleeding into the page gutter on the
			    widest screens (never past it — no horizontal scroll). */}
			<div className="grid items-center gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:gap-8">
				{/* The whole copy column is paper now: the paragraph and the three
				    capability lines were the longest unbacked run of text on the
				    page, and the mosaic beside them is already a panel — so the two
				    halves finally read as the same material. */}
				<SectionSurface
					data-reveal
					className="relative z-10 px-5 py-6 sm:px-6 sm:py-7"
				>
					<span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary ring-1 ring-gold/35">
						<Sparkles className="size-4 text-gold" aria-hidden />
						Inspirações
					</span>
					<h2
						id="inspiracoes"
						className="mt-5 font-display text-4xl leading-[1.05] font-light tracking-tight text-balance text-foreground sm:text-5xl"
					>
						Todas as referências do casamento no mesmo lugar
					</h2>
					<p className="mt-5 max-w-md text-pretty text-muted-foreground">
						A decoração que vocês salvaram sem saber onde guardar, o vestido que
						veio pelo grupo da família, o convite que encantou. Reúnam tudo em
						galerias por tema e cheguem na reunião com o fornecedor sabendo
						exatamente o que mostrar.
					</p>

					<ul className="mt-7 flex flex-col gap-3">
						{CAPABILITIES.map((item, index) => (
							<li key={item.text} className="flex items-start gap-3">
								<span
									aria-hidden
									className={cn(
										"flex size-8 shrink-0 items-center justify-center rounded-xl ring-1",
										// The first capability is the one couples care about
										// most, so it carries the gold instead of the tint.
										index === 0
											? "bg-gold/15 text-gold ring-gold/35"
											: "bg-primary/10 text-primary ring-primary/15",
									)}
								>
									<item.icon className="size-4" />
								</span>
								<span className="pt-1.5 text-sm text-pretty text-foreground">
									{item.text}
								</span>
							</li>
						))}
					</ul>
				</SectionSurface>

				{/* The mosaic: a stand-in for the couple's own album, built from the
				    same surfaces the app uses, so it never fakes a photograph. */}
				<div
					data-reveal="scale"
					data-parallax="4"
					className="landing-glass relative rounded-[2rem] bg-card/95 p-5 ring-1 ring-border backdrop-blur-2xl sm:p-6 lg:-mt-6 xl:-mr-12 2xl:-mr-20 dark:bg-card/90"
				>
					{/* Champagne hairline on the panel's top edge, the same signature
					    the FAQ glass carries. */}
					<span
						aria-hidden
						className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-gold/55 to-transparent"
					/>
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="font-display text-2xl font-light leading-tight tracking-tight text-primary">
								Inspirações
							</p>
							<p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
								{GALLERIES.length} galerias
							</p>
						</div>
						<span
							aria-hidden
							className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-gold/40"
						>
							<Plus className="size-3.5" />
							Nova galeria
						</span>
					</div>

					<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
						{GALLERIES.map((gallery, index) => (
							<figure
								key={gallery.name}
								className={cn(
									"landing-tile relative isolate overflow-hidden rounded-2xl bg-card/60 ring-1",
									// The cover tile is the one with the champagne edge.
									index === 0 ? "ring-gold/30" : "ring-border/70",
									gallery.frame,
								)}
							>
								{/* Cover stand-in: a token gradient behind an oversized
								    glyph, absolutely placed so the tile keeps its shape
								    even when the grid row stretches it. */}
								<div
									aria-hidden
									className={cn(
										"absolute inset-0 flex items-center justify-center bg-gradient-to-br",
										gallery.tint,
									)}
								>
									<gallery.icon className="size-10 text-primary/35 sm:size-12" />
								</div>
								<figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/85 to-background/55 px-3 py-2 backdrop-blur-sm">
									<p className="truncate font-display text-sm font-medium text-foreground">
										{gallery.name}
									</p>
									<p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
										{gallery.count}
									</p>
								</figcaption>
							</figure>
						))}

						{/* Sixth cell: the palette the couple picks for the app itself.
						    Personalization survives here, as a detail rather than a
						    section of its own. */}
						<div className="flex flex-col justify-between gap-3 rounded-2xl bg-card/60 p-3 ring-1 ring-border/70">
							<div className="flex flex-wrap gap-1.5">
								{PALETTE_SWATCHES.map((swatch) => (
									<span
										key={swatch}
										aria-hidden
										className={cn(
											"size-5 rounded-full ring-1 ring-border/70",
											swatch,
										)}
									/>
								))}
							</div>
							<div>
								<p className="font-display text-sm font-medium text-foreground">
									Paleta de cores
								</p>
								<p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
									as cores da festa
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
