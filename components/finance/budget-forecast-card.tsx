"use client";

import type { PayablePayment } from "@/components/payment-list-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { monthLabelPT, shiftMonth } from "@/lib/domain/calendar";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

interface BudgetForecastCardProps {
	pendingPayments: PayablePayment[];
	today: string;
	className?: string;
}

export function BudgetForecastCard({
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

	return (
		<Card className={cn("animate-card-enter", className)}>
			<CardHeader className="flex-row items-baseline justify-between">
				<div>
					<CardTitle className="font-display text-xl">
						Previsão dos próximos meses
					</CardTitle>
					<p className="mt-1 text-xs text-muted-foreground">
						Parcelas pendentes agrupadas por vencimento
					</p>
				</div>
				<span className="rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold text-secondary-foreground tabular-nums">
					{formatBRL(upcomingCents)}
				</span>
			</CardHeader>
			<CardContent>
				<div
					className="flex h-44 items-end gap-2"
					role="img"
					aria-label="Gastos previstos por mês"
				>
					{months.map((month, index) => {
						const heightPct =
							month.amountCents > 0
								? Math.max(
										Math.round((month.amountCents / maxMonthCents) * 100),
										8,
									)
								: 4;
						return (
							<div
								key={month.month}
								title={`${month.label}: ${formatBRL(month.amountCents)}`}
								className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
							>
								<span
									className={cn(
										"truncate text-center text-[11px] font-semibold tabular-nums",
										month.amountCents > 0
											? "text-muted-foreground"
											: "text-[#cdbfa8]",
									)}
								>
									{month.amountCents > 0 ? compactBRL(month.amountCents) : "—"}
								</span>
								<div
									className={cn(
										"grow-y w-full max-w-[40px] rounded-t-lg",
										month.amountCents > 0 ? "bg-[#8aa07f]" : "bg-[#e0d6c4]",
									)}
									style={{
										height: `${heightPct}%`,
										animationDelay: `${index * 70}ms`,
									}}
								/>
								<span className="text-[11px] font-medium text-muted-foreground capitalize">
									{month.shortLabel}
								</span>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

/** Short money label that fits a narrow chart column: "—", "R$ 850", "6k", "12,5k". */
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
	return `${formatted}k`;
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
