"use client";

import type { FunctionReturnType } from "convex/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { api } from "@/convex/_generated/api";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export type FinanceSummary = FunctionReturnType<
	typeof api.dashboard.summary
>["finance"];

export function BudgetCard({ finance }: { finance: FinanceSummary }) {
	const percent = Math.round(finance.percentConsumed * 100);
	const overBudget = finance.percentConsumed > 1;

	const kpis = [
		{ label: "Meta", value: finance.goalCents },
		{ label: "Previsto", value: finance.plannedCents },
		{ label: "Fechado", value: finance.contractedCents },
		{ label: "Pago", value: finance.paidCents, tone: "text-success" },
		{ label: "Pendente", value: finance.pendingCents },
		{
			label: "Saldo restante",
			value: finance.remainingCents,
			tone: finance.remainingCents < 0 ? "text-destructive" : "text-gold",
		},
	];

	return (
		<Card className="animate-card-enter">
			<CardHeader className="flex-row items-baseline justify-between">
				<CardTitle className="font-display text-xl">Orçamento</CardTitle>
				<span
					className={cn(
						"rounded-full bg-card/55 px-2.5 py-1 text-sm font-semibold tabular-nums ring-1 ring-border/60",
						overBudget ? "text-destructive" : "text-muted-foreground",
					)}
				>
					{percent}% da meta
				</span>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Progress
					value={Math.min(percent, 100)}
					className={cn("h-2", overBudget && "[&>div]:bg-destructive")}
					aria-label={`${percent}% do orçamento consumido`}
				/>
				<dl className="grid grid-cols-2 gap-3">
					{kpis.map(({ label, value, tone }) => (
						<div
							key={label}
							className="rounded-2xl bg-card/45 p-3 ring-1 ring-border/60 transition-colors hover:bg-card/60"
						>
							<dt className="text-xs font-medium text-muted-foreground">
								{label}
							</dt>
							<dd
								className={cn(
									"mt-1 text-base font-semibold tabular-nums",
									tone,
								)}
							>
								{formatBRL(value)}
							</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}
