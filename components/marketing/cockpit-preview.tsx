import {
	CalendarClock,
	Check,
	Images,
	ListChecks,
	Store,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

/**
 * Illustrative, static preview of the in-app cockpit shown on the marketing
 * hero. Purely decorative — no Convex, no state — but deliberately faithful to
 * what the couple finds after signing in: the same tokens (glass card, the
 * premium finance surface, olive→gold progress) and the same six things the
 * dashboard puts on one screen — budget, checklist, countdown, vendors, guests
 * and inspirations. The numbers are fictional but sized like a real Brazilian
 * wedding.
 *
 * Narrow screens keep the headline reads and drop the two detail strips (the
 * payment forecast and the vendor rows) so the card stays a panel instead of
 * turning into an endless column.
 */

// Money is integer centavos everywhere (see AGENTS.md); formatting happens here.
const GOAL_CENTS = 9_600_000;
const PAID_CENTS = 4_480_000;
const CONTRACTED_CENTS = 7_840_000;
const REMAINING_CENTS = CONTRACTED_CENTS - PAID_CENTS;

const PAID_PERCENT = (PAID_CENTS / GOAL_CENTS) * 100;
const CONTRACTED_PERCENT = (REMAINING_CENTS / GOAL_CENTS) * 100;
const COMMITTED_PERCENT = Math.round((CONTRACTED_CENTS / GOAL_CENTS) * 100);

/** Pending installments per month, mirroring the real budget forecast strip. */
const FORECAST = [
	{ month: "ago", compact: "4,2k", height: 44 },
	{ month: "set", compact: "6,8k", height: 71 },
	{ month: "out", compact: "5,4k", height: 56 },
	{ month: "nov", compact: "7,6k", height: 79 },
	{ month: "dez", compact: "9,6k", height: 100 },
];

export function CockpitPreview() {
	return (
		// Entrance is owned by the landing GSAP timeline (data-hero-visual).
		<Card
			role="img"
			aria-label="Prévia do painel do casal: orçamento, tarefas, contagem regressiva, fornecedores, convidados e inspirações numa só tela."
			className="landing-card w-full max-w-md gap-0 p-5 sm:p-6"
		>
			{/* Who the wedding belongs to, and when it is. */}
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
						Nosso Casamento
					</p>
					<p className="font-display text-lg font-semibold text-primary">
						Marina &amp; Rafael
					</p>
				</div>
				<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/70 px-3 py-1 text-xs font-medium text-accent-foreground ring-1 ring-border">
					<CalendarClock className="size-3.5" aria-hidden />
					<span className="tabular-nums">05/12/2026</span>
				</span>
			</div>

			{/* Countdown — the first thing the real dashboard shows. */}
			<div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent/55 px-4 py-2.5 ring-1 ring-border">
				<p className="font-display text-4xl leading-none font-light tabular-nums text-primary">
					124
				</p>
				<p className="text-xs text-muted-foreground">dias para o grande dia</p>
				<p className="ml-auto hidden truncate text-[11px] text-muted-foreground sm:block">
					Fazenda Vista Verde
				</p>
			</div>

			{/* Premium finance surface, mirrors the real budget overview card. */}
			<div className="finance-glow-card relative mt-3 overflow-hidden rounded-2xl p-4 text-white sm:p-5">
				<div className="flex items-baseline justify-between gap-2">
					<p className="text-xs font-medium tracking-wide text-white/70">
						Orçamento
					</p>
					<p className="text-[11px] font-semibold text-white/80 tabular-nums">
						{COMMITTED_PERCENT}% comprometido
					</p>
				</div>
				<p className="mt-1 font-display text-3xl font-semibold tabular-nums">
					{formatBRL(GOAL_CENTS)}
				</p>

				{/* Meters are grown by the landing timeline (data-hero-meter), not by
				    a CSS animation of their own — see landing-motion.tsx. */}
				<div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/15">
					<div
						data-hero-meter="bar"
						className="origin-left bg-gold"
						style={{ width: `${PAID_PERCENT}%` }}
					/>
					<div
						data-hero-meter="bar"
						className="origin-left bg-white/45"
						style={{ width: `${CONTRACTED_PERCENT}%` }}
					/>
				</div>
				<div className="mt-2 flex items-center justify-between text-[11px] text-white/75">
					<span className="tabular-nums">Pago {formatBRL(PAID_CENTS)}</span>
					<span className="tabular-nums">
						Falta {formatBRL(REMAINING_CENTS)}
					</span>
				</div>

				{/* Payment forecast: a detail strip, dropped on narrow screens. */}
				<div className="mt-4 hidden items-end gap-2 sm:flex">
					{FORECAST.map((column, index) => (
						<div
							key={column.month}
							className="flex flex-1 flex-col items-center gap-1"
						>
							<span className="text-[10px] text-white/70 tabular-nums">
								{column.compact}
							</span>
							<div className="flex h-14 w-full items-end">
								<div
									data-hero-meter="column"
									className={cn(
										"w-full origin-bottom rounded-t-md bg-gradient-to-t",
										// The last month is the heaviest one — it gets the gold.
										index === FORECAST.length - 1
											? "from-gold/45 to-gold/80"
											: "from-white/20 to-white/55",
									)}
									style={{ height: `${column.height}%` }}
								/>
							</div>
							<span className="text-[10px] text-white/60">{column.month}</span>
						</div>
					))}
				</div>
			</div>

			{/* Checklist: progress plus the two rows the couple acts on. */}
			<div className="mt-3 rounded-2xl bg-card/45 p-3 ring-1 ring-border/60">
				<div className="flex items-center justify-between gap-2">
					<p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
						<ListChecks className="size-3.5" aria-hidden />
						Tarefas
					</p>
					<p className="text-[11px] font-semibold text-primary tabular-nums">
						34 de 52 concluídas
					</p>
				</div>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
					<div
						data-hero-meter="bar"
						className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-gold"
						style={{ width: "65%" }}
					/>
				</div>
				<ul className="mt-2.5 flex flex-col gap-1.5">
					<li className="flex items-center gap-2">
						<span
							aria-hidden
							className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
						>
							<Check className="size-3" />
						</span>
						<span className="truncate text-xs text-foreground/70 line-through">
							Prova do menu com o buffet
						</span>
					</li>
					<li className="flex items-center gap-2">
						<span
							aria-hidden
							className="size-4 shrink-0 rounded-full border border-warning/60"
						/>
						<span className="truncate text-xs text-foreground">
							Escolher o bolo
						</span>
						<span className="ml-auto shrink-0 text-[11px] font-medium text-warning">
							até 20/08
						</span>
					</li>
				</ul>
			</div>

			{/* The other three corners of the cockpit, side by side. */}
			<div className="mt-2 grid grid-cols-3 gap-2">
				<StatTile
					icon={<Store className="size-3.5" aria-hidden />}
					label="Fornecedores"
					value="9"
					caption="de 14 fechados"
				/>
				<StatTile
					icon={<Users className="size-3.5" aria-hidden />}
					label="Convidados"
					value="96"
					caption="de 148 confirmados"
				/>
				<StatTile
					icon={<Images className="size-3.5" aria-hidden />}
					label="Inspirações"
					value="42"
					caption="imagens salvas"
				/>
			</div>

			{/* Vendor detail: named suppliers, dropped on narrow screens. */}
			<div className="mt-2 hidden flex-col gap-1.5 sm:flex">
				<div className="flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ring-border">
					<span
						aria-hidden
						className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<Store className="size-3.5" />
					</span>
					<div className="min-w-0">
						<p className="truncate text-xs font-medium text-foreground">
							Buffet Sabor &amp; Arte
						</p>
						<p className="text-[10px] text-muted-foreground">
							Buffet · parcela em 12/09
						</p>
					</div>
					<span className="ml-auto shrink-0 text-xs font-semibold tabular-nums">
						{formatBRL(680_000)}
					</span>
				</div>
				<div className="flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ring-border">
					<span
						aria-hidden
						className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success"
					>
						<Check className="size-3.5" />
					</span>
					<div className="min-w-0">
						<p className="truncate text-xs font-medium text-foreground">
							Fotografia Luz Natural
						</p>
						<p className="text-[10px] text-muted-foreground">
							Fotografia · tudo pago
						</p>
					</div>
					<span className="ml-auto shrink-0 text-xs font-semibold text-success">
						Quitado
					</span>
				</div>
			</div>
		</Card>
	);
}

function StatTile({
	icon,
	label,
	value,
	caption,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	caption: string;
}) {
	return (
		<div className="rounded-2xl bg-card/45 p-2.5 ring-1 ring-border/60">
			<p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
				{icon}
				<span className="truncate">{label}</span>
			</p>
			<p className="mt-0.5 font-display text-xl font-semibold text-foreground tabular-nums">
				{value}
			</p>
			<p className="text-[10px] leading-tight text-muted-foreground">
				{caption}
			</p>
		</div>
	);
}
