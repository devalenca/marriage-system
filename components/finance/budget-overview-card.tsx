"use client";

import type { FunctionReturnType } from "convex/server";
import type { PayablePayment } from "@/components/payment-list-card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { api } from "@/convex/_generated/api";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

type FinanceSummary = FunctionReturnType<
	typeof api.dashboard.summary
>["finance"];

const MONTHS_SHORT = [
	"jan",
	"fev",
	"mar",
	"abr",
	"mai",
	"jun",
	"jul",
	"ago",
	"set",
	"out",
	"nov",
	"dez",
];

/**
 * The couple's "wedding card": a single read of where the budget stands —
 * a paid/contracted progress bar plus a 6-month payment forecast.
 */
export function BudgetOverviewCard({
	finance,
	pending,
	today,
	showBudget = true,
}: {
	finance: FinanceSummary;
	pending: PayablePayment[];
	today: string;
	/** When false, renders only the monthly forecast (no budget bar/legend). */
	showBudget?: boolean;
}) {
	const goal = Math.max(finance.goalCents, 1);
	const paidPct = Math.min((finance.paidCents / goal) * 100, 100);
	const contractedRemaining = Math.max(
		finance.contractedCents - finance.paidCents,
		0,
	);
	const contractedPct = Math.min(
		(contractedRemaining / goal) * 100,
		100 - paidPct,
	);
	const committedPercent = Math.round((finance.contractedCents / goal) * 100);
	const overBudget = finance.remainingCents < 0;

	const forecast = buildForecast(pending, today, 6);
	const maxMonth = Math.max(...forecast.map((m) => m.amountCents), 1);

	return (
		<section className="animate-card-enter flex flex-col rounded-[22px] border border-border bg-card px-6 py-6 shadow-[0_1px_2px_oklch(0.2_0.02_75_/_0.05),0_22px_50px_-26px_oklch(0.2_0.02_75_/_0.28)] sm:px-7">
			{showBudget ? (
				<>
					<div className="flex items-baseline justify-between gap-3">
						<h2 className="font-display text-[22px] font-semibold text-foreground">
							Orçamento
						</h2>
						<span
							className={cn(
								"text-[13px] font-bold",
								overBudget ? "text-destructive" : "text-gold",
							)}
						>
							{committedPercent}% comprometido
						</span>
					</div>

					<div className="mt-4 mb-2 flex h-3.5 overflow-hidden rounded-full bg-muted">
						<div
							className="grow-x bg-gold [animation-delay:.2s]"
							style={{ width: `${paidPct}%` }}
						/>
						<div
							className="grow-x bg-primary/70 [animation-delay:.35s]"
							style={{ width: `${contractedPct}%` }}
						/>
					</div>

					<div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-xs text-muted-foreground">
						<LegendDot
							className="bg-gold"
							label={`Pago ${formatBRL(finance.paidCents)}`}
						/>
						<LegendDot
							className="bg-primary/70"
							label={`Fechado ${formatBRL(finance.contractedCents)}`}
						/>
						<span
							className={cn(
								"ml-auto font-bold",
								overBudget ? "text-destructive" : "text-primary",
							)}
						>
							Saldo {formatBRL(finance.remainingCents)}
						</span>
					</div>
				</>
			) : null}

			<div
				className={cn(
					"flex flex-1 flex-col",
					showBudget && "mt-5 border-t border-border pt-[18px]",
				)}
			>
				<div className="mb-3.5 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
					Previsão dos próximos meses
				</div>
				{/* The tooltips replace a native `title`, which rendered as the
				    browser's own grey box — out of place on the chart. */}
				<TooltipProvider delay={120}>
					<div
						className={cn(
							"flex items-end gap-3.5",
							// Standalone (dashboard): fixed height so the % bars resolve.
							// In the Financeiro grid (!showBudget): fill so the card matches
							// its taller sibling instead of leaving dead space below.
							showBudget ? "h-28" : "min-h-28 flex-1",
						)}
						role="img"
						aria-label="Previsão de pagamentos por mês"
					>
						{forecast.map((month) => {
							const heightPct =
								month.amountCents > 0
									? Math.max(
											Math.round((month.amountCents / maxMonth) * 100),
											8,
										)
									: 4;
							const isCurrent = month.month === today.slice(0, 7);
							return (
								<Tooltip key={month.month}>
									<TooltipTrigger
										render={
											<div className="flex h-full flex-1 cursor-default flex-col items-center justify-end gap-1.5" />
										}
									>
										<span
											className={cn(
												"text-[10.5px] font-semibold tabular-nums",
												month.amountCents > 0
													? "text-foreground/70"
													: "text-muted-foreground/50",
											)}
										>
											{month.amountCents > 0
												? compactReais(month.amountCents)
												: "—"}
										</span>
										<div
											className={cn(
												"grow-y w-full max-w-[38px] rounded-t-lg",
												month.amountCents > 0
													? isCurrent
														? "bg-primary"
														: "bg-primary/55"
													: "bg-muted",
											)}
											style={{ height: `${heightPct}%` }}
										/>
										<span className="text-[11px] text-muted-foreground">
											{month.shortLabel}
										</span>
									</TooltipTrigger>
									<TooltipContent>
										{month.shortLabel} ·{" "}
										<span className="font-semibold tabular-nums">
											{formatBRL(month.amountCents)}
										</span>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</TooltipProvider>
			</div>
		</section>
	);
}

function LegendDot({ className, label }: { className: string; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span className={cn("size-[9px] rounded-[3px]", className)} />
			{label}
		</span>
	);
}

/** Groups pending installments into the next `count` months starting at `today`. */
function buildForecast(
	payments: PayablePayment[],
	today: string,
	count: number,
) {
	const startMonth = today.slice(0, 7);
	const totals = new Map<string, number>();
	for (const p of payments) {
		const m = p.dueDate.slice(0, 7);
		totals.set(m, (totals.get(m) ?? 0) + p.amountCents);
	}
	return Array.from({ length: count }, (_, i) => {
		const month = shiftMonth(startMonth, i);
		return {
			month,
			shortLabel: MONTHS_SHORT[Number(month.slice(5, 7)) - 1] ?? "",
			amountCents: totals.get(month) ?? 0,
		};
	});
}

function shiftMonth(month: string, delta: number): string {
	const year = Number(month.slice(0, 4));
	const m = Number(month.slice(5, 7));
	const date = new Date(year, m - 1 + delta, 1);
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	return `${date.getFullYear()}-${mm}`;
}

/** Compact reais for the forecast columns: "15,2k", "5,6k", "850". */
function compactReais(cents: number): string {
	const reais = Math.round(cents / 100);
	if (reais < 1000) return reais.toLocaleString("pt-BR");
	const k = reais / 1000;
	return `${k.toLocaleString("pt-BR", {
		maximumFractionDigits: k < 100 && !Number.isInteger(k) ? 1 : 0,
	})}k`;
}
