"use client";

import type { CSSProperties } from "react";
import type { FinanceSummary } from "@/components/finance/budget-card";
import type { PayablePayment } from "@/components/payment-list-card";
import { Card, CardContent } from "@/components/ui/card";
import { monthLabelPT, shiftMonth } from "@/lib/domain/calendar";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

type ChartStyle = CSSProperties & {
	"--bar-height": string;
	"--bar-delay": string;
};

interface BudgetForecastCardProps {
	finance: FinanceSummary;
	pendingPayments: PayablePayment[];
	today: string;
	className?: string;
}

export function BudgetForecastCard({
	finance,
	pendingPayments,
	today,
	className,
}: BudgetForecastCardProps) {
	const months = buildMonthlyForecast(pendingPayments, today, 6);
	const maxMonthCents = Math.max(
		...months.map((month) => month.amountCents),
		1,
	);
	const upcomingCents = months.reduce(
		(total, month) => total + month.amountCents,
		0,
	);
	const spentPercent =
		finance.goalCents > 0
			? Math.min(Math.round((finance.paidCents / finance.goalCents) * 100), 100)
			: 0;
	const committedPercent =
		finance.goalCents > 0
			? Math.min(
					Math.round((finance.contractedCents / finance.goalCents) * 100),
					140,
				)
			: 0;

	return (
		<Card
			className={cn(
				"finance-glow-card animate-card-enter overflow-hidden border-white/10 bg-[#2a3324] text-white ring-white/10",
				className,
			)}
		>
			<CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.85fr_1.15fr]">
				<div className="flex flex-col justify-between gap-5">
					<div>
						<div className="flex items-center justify-between gap-3">
							<p className="text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">
								Cartão do casamento
							</p>
							<span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
								6 meses
							</span>
						</div>
						<p className="mt-5 text-sm text-white/60">Orçamento total</p>
						<p className="mt-1 font-display text-4xl font-semibold tracking-tight tabular-nums">
							{formatBRL(finance.goalCents)}
						</p>
					</div>

					<div className="space-y-3">
						<MetricRow
							label="Já pago"
							value={formatBRL(finance.paidCents)}
							percent={spentPercent}
							tone="paid"
						/>
						<MetricRow
							label="Fechado"
							value={formatBRL(finance.contractedCents)}
							percent={committedPercent}
							tone={finance.percentConsumed > 1 ? "danger" : "committed"}
						/>
						<div className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10">
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-xs font-medium text-white/58">
									Previsto nos próximos meses
								</span>
								<span className="text-sm font-semibold tabular-nums">
									{formatBRL(upcomingCents)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="rounded-[1.6rem] bg-black/18 p-4 ring-1 ring-white/10">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<h3 className="font-display text-xl font-semibold">
								Próximas faturas
							</h3>
							<p className="text-xs text-white/52">
								Parcelas pendentes agrupadas por vencimento
							</p>
						</div>
						<div className="h-9 w-14 rounded-full bg-gradient-to-br from-white/35 to-white/5 p-1 shadow-inner">
							<div className="h-full w-7 rounded-full bg-white/80 shadow-sm" />
						</div>
					</div>

					<div
						className="grid min-h-44 grid-cols-6 items-end gap-2"
						role="img"
						aria-label="Gastos previstos por mês"
					>
						{months.map((month, index) => {
							const height = Math.max(
								month.amountCents > 0
									? Math.round((month.amountCents / maxMonthCents) * 100)
									: 4,
								4,
							);
							return (
								<div
									key={month.month}
									title={`${month.label}: ${formatBRL(month.amountCents)}`}
									className="flex h-44 min-w-0 flex-col items-center justify-end gap-2"
								>
									<span
										className={cn(
											"w-full truncate text-center text-[10px] font-semibold tabular-nums",
											month.amountCents > 0 ? "text-white/75" : "text-white/35",
										)}
									>
										{compactBRL(month.amountCents)}
									</span>
									<div className="flex h-28 w-full items-end rounded-full bg-white/[0.07] p-1 ring-1 ring-white/10">
										<div
											className="chart-bar w-full rounded-full bg-gradient-to-t from-[#5d6b45] via-[#a8854e] to-[#ecd49a] shadow-[0_0_24px_rgba(168,133,78,0.4)]"
											style={
												{
													"--bar-height": `${height}%`,
													"--bar-delay": `${index * 80}ms`,
												} as ChartStyle
											}
										/>
									</div>
									<span className="text-[11px] font-semibold text-white/48 uppercase">
										{month.shortLabel}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function MetricRow({
	label,
	value,
	percent,
	tone,
}: {
	label: string;
	value: string;
	percent: number;
	tone: "paid" | "committed" | "danger";
}) {
	return (
		<div>
			<div className="mb-1.5 flex items-baseline justify-between gap-3">
				<span className="text-xs font-medium text-white/58">{label}</span>
				<span className="text-sm font-semibold tabular-nums">{value}</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/10">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-700 ease-out",
						tone === "paid" && "bg-[#9cc795]",
						tone === "committed" &&
							"bg-gradient-to-r from-[#5d6b45] to-[#a8854e]",
						tone === "danger" && "bg-destructive",
					)}
					style={{ width: `${Math.min(percent, 100)}%` }}
				/>
			</div>
		</div>
	);
}

/** Short money label that fits a narrow chart column: "—", "R$ 850", "R$ 6k", "R$ 12,5k". */
function compactBRL(cents: number): string {
	if (cents <= 0) return "—";
	const reais = cents / 100;
	if (reais < 1000) {
		return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
	}
	const thousands = reais / 1000;
	const formatted = thousands.toLocaleString("pt-BR", {
		maximumFractionDigits:
			thousands < 100 && !Number.isInteger(thousands) ? 1 : 0,
	});
	return `R$ ${formatted}k`;
}

function buildMonthlyForecast(
	payments: PayablePayment[],
	today: string,
	monthCount: number,
) {
	const startMonth = today.slice(0, 7);
	const totals = new Map<string, number>();

	for (const payment of payments) {
		const month = payment.dueDate.slice(0, 7);
		totals.set(month, (totals.get(month) ?? 0) + payment.amountCents);
	}

	return Array.from({ length: monthCount }, (_, index) => {
		const month = shiftMonth(startMonth, index);
		const label = monthLabelPT(month);
		return {
			month,
			label,
			shortLabel: label.slice(0, 3),
			amountCents: totals.get(month) ?? 0,
		};
	});
}
