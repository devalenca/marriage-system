"use client";

import type { FunctionReturnType } from "convex/server";
import type { PayablePayment } from "@/components/payment-list-card";
import type { api } from "@/convex/_generated/api";
import { formatBRL } from "@/lib/domain/money";

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
}: {
	finance: FinanceSummary;
	pending: PayablePayment[];
	today: string;
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
		<section className="animate-card-enter rounded-[22px] border border-[#ece2d2] bg-[#fffefb] px-6 py-6 shadow-[0_1px_2px_rgba(46,38,32,0.05),0_22px_50px_-26px_rgba(46,38,32,0.28)] sm:px-7">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="font-display text-[22px] font-semibold text-[#2e2620]">
					Orçamento
				</h2>
				<span
					className={`text-[13px] font-bold ${overBudget ? "text-destructive" : "text-[#9a7a3e]"}`}
				>
					{committedPercent}% comprometido
				</span>
			</div>

			<div className="mt-4 mb-2 flex h-3.5 overflow-hidden rounded-full bg-[#eee4d4]">
				<div
					className="grow-x bg-[#b8924f] [animation-delay:.2s]"
					style={{ width: `${paidPct}%` }}
				/>
				<div
					className="grow-x bg-[#7a9078] [animation-delay:.35s]"
					style={{ width: `${contractedPct}%` }}
				/>
			</div>

			<div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-xs text-[#7a6e62]">
				<LegendDot
					color="#b8924f"
					label={`Pago ${formatBRL(finance.paidCents)}`}
				/>
				<LegendDot
					color="#7a9078"
					label={`Fechado ${formatBRL(finance.contractedCents)}`}
				/>
				<span
					className={`ml-auto font-bold ${overBudget ? "text-destructive" : "text-[#3c5741]"}`}
				>
					Saldo {formatBRL(finance.remainingCents)}
				</span>
			</div>

			<div className="mt-5 border-t border-[#eee4d4] pt-[18px]">
				<div className="mb-3.5 text-xs font-bold tracking-[0.06em] text-[#7a6e62] uppercase">
					Previsão dos próximos meses
				</div>
				<div
					className="flex h-24 items-end gap-3.5"
					role="img"
					aria-label="Previsão de pagamentos por mês"
				>
					{forecast.map((month) => {
						const heightPct =
							month.amountCents > 0
								? Math.max(Math.round((month.amountCents / maxMonth) * 100), 8)
								: 4;
						const isCurrent = month.month === today.slice(0, 7);
						return (
							<div
								key={month.month}
								title={`${month.shortLabel}: ${formatBRL(month.amountCents)}`}
								className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
							>
								<span
									className={`text-[10.5px] font-semibold tabular-nums ${
										month.amountCents > 0 ? "text-[#6b5f54]" : "text-[#cdbfa8]"
									}`}
								>
									{month.amountCents > 0
										? compactReais(month.amountCents)
										: "—"}
								</span>
								<div
									className={`grow-y w-full max-w-[38px] rounded-t-lg ${
										month.amountCents > 0
											? isCurrent
												? "bg-[#4b6b4f]"
												: "bg-[#8aa07f]"
											: "bg-[#e0d6c4]"
									}`}
									style={{ height: `${heightPct}%` }}
								/>
								<span className="text-[11px] text-[#8a7d6f]">
									{month.shortLabel}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function LegendDot({ color, label }: { color: string; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span
				className="size-[9px] rounded-[3px]"
				style={{ backgroundColor: color }}
			/>
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
