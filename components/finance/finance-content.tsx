"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Download, Paperclip } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { BudgetCard } from "@/components/finance/budget-card";
import { BudgetOverviewCard } from "@/components/finance/budget-overview-card";
import { PageHeader } from "@/components/page-header";
import { PaymentListCard } from "@/components/payment-list-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { paymentsToCsv } from "@/lib/domain/export";
import { classifyPaymentDue, DUE_SOON_WINDOW_DAYS } from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";

type Overview = FunctionReturnType<typeof api.finance.overview>;

export function FinanceContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const overview = useQuery(api.finance.overview, { today });

	if (overview === undefined) {
		return (
			<div aria-busy>
				<PageHeader title="Financeiro" />
				<div className="grid gap-4 lg:grid-cols-2">
					<Skeleton className="h-72 rounded-[2rem]" />
					<Skeleton className="h-72 rounded-[2rem]" />
					<Skeleton className="h-40 rounded-[2rem] lg:col-span-2" />
				</div>
			</div>
		);
	}

	const groups = Map.groupBy(overview.pending, (payment) =>
		classifyPaymentDue(payment, today),
	);
	const overdue = groups.get("overdue") ?? [];
	const dueSoon = groups.get("dueSoon") ?? [];
	const later = groups.get("later") ?? [];

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Financeiro"
				subtitle={
					overview.pending.length > 0
						? `${overview.pending.length} parcela${overview.pending.length === 1 ? "" : "s"} em aberto`
						: "Nenhuma parcela em aberto"
				}
				action={<ExportButton />}
			/>
			<div className="flex flex-col gap-4">
				<div className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
					<BudgetCard finance={overview.finance} />
					<BudgetOverviewCard
						finance={overview.finance}
						pending={overview.pending}
						today={today}
						showBudget={false}
					/>
				</div>

				<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
					<PaymentMethodCard rows={overview.byMethod} />
					<InstallmentsCard rows={overview.installments} />
				</div>

				<CategoryTable categories={overview.categories} />

				{overview.pending.length > 0 ? (
					<div className="grid items-start gap-4 xl:grid-cols-3">
						{overdue.length > 0 ? (
							<PaymentListCard
								title="Atrasados"
								tone="overdue"
								payments={overdue}
								showTotal
							/>
						) : null}
						{dueSoon.length > 0 ? (
							<PaymentListCard
								title={`Próximos ${DUE_SOON_WINDOW_DAYS} dias`}
								tone="dueSoon"
								payments={dueSoon}
								showTotal
							/>
						) : null}
						{later.length > 0 ? (
							<PaymentListCard
								title="Mais adiante"
								tone="later"
								payments={later}
								showTotal
							/>
						) : null}
					</div>
				) : null}

				<PaidHistoryCard paid={overview.paid} />
			</div>
		</div>
	);
}

function ExportButton() {
	const exportRows = useQuery(api.finance.exportRows, {});

	function handleExport() {
		if (!exportRows || exportRows.length === 0) {
			toast.error("Nada para exportar ainda");
			return;
		}
		const csv = paymentsToCsv(exportRows);
		// BOM so Excel pt-BR opens UTF-8 correctly.
		const blob = new Blob([`﻿${csv}`], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "casamento-pagamentos.csv";
		link.click();
		URL.revokeObjectURL(url);
		toast.success("Planilha exportada");
	}

	return (
		<Button variant="outline" size="sm" onClick={handleExport}>
			<Download data-icon="inline-start" aria-hidden />
			Exportar CSV
		</Button>
	);
}

function PaymentMethodCard({ rows }: { rows: Overview["byMethod"] }) {
	if (rows.length === 0) return null;
	const max = Math.max(...rows.map((r) => r.totalCents), 1);

	return (
		<Card className="animate-card-enter">
			<CardHeader>
				<CardTitle className="font-display text-lg">
					Por forma de pagamento
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{rows.map((row) => {
					const paidPct = Math.round((row.paidCents / max) * 100);
					const pendingPct = Math.round((row.pendingCents / max) * 100);
					return (
						<div key={row.method}>
							<div className="flex items-baseline justify-between gap-2">
								<span className="text-sm font-medium">
									{row.method}
									<span className="ml-1.5 text-xs text-muted-foreground">
										{row.count}x
									</span>
								</span>
								<span className="text-sm font-semibold tabular-nums">
									{formatBRL(row.totalCents)}
								</span>
							</div>
							<div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full bg-success transition-all duration-700"
									style={{ width: `${paidPct}%` }}
								/>
								<div
									className="h-full bg-gradient-to-r from-primary to-gold transition-all duration-700"
									style={{ width: `${pendingPct}%` }}
								/>
							</div>
							<div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
								<span>Pago {formatBRL(row.paidCents)}</span>
								<span>A pagar {formatBRL(row.pendingCents)}</span>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

function InstallmentsCard({ rows }: { rows: Overview["installments"] }) {
	if (rows.length === 0) return null;

	return (
		<Card className="animate-card-enter">
			<CardHeader>
				<CardTitle className="font-display text-lg">
					Parcelamentos por fornecedor
				</CardTitle>
			</CardHeader>
			<CardContent className="flex max-h-[22rem] flex-col gap-3 overflow-y-auto pr-1">
				{rows.map((row) => {
					const progress = Math.round(row.progress * 100);
					return (
						<Link
							key={row.vendorId}
							href={`/fornecedores/${row.vendorId}`}
							className="rounded-2xl bg-card/50 p-3 ring-1 ring-border/60 transition-colors hover:ring-primary/40"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="truncate font-medium">{row.vendorName}</p>
									<p className="text-xs text-muted-foreground">
										{row.totalInstallments - row.remainingInstallments} de{" "}
										{row.totalInstallments} parcelas pagas
										{row.paymentMethod ? ` · ${row.paymentMethod}` : ""}
									</p>
								</div>
								<span className="shrink-0 text-sm font-semibold tabular-nums">
									{formatBRL(row.pendingCents)}
									<span className="block text-right text-[11px] font-normal text-muted-foreground">
										a pagar
									</span>
								</span>
							</div>
							<div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-700"
									style={{ width: `${progress}%` }}
								/>
							</div>
							{row.nextDueDate ? (
								<p className="mt-1.5 text-[11px] text-muted-foreground">
									Próximo vencimento em {formatDateBR(row.nextDueDate)}
								</p>
							) : (
								<p className="mt-1.5 text-[11px] text-success">Tudo pago</p>
							)}
						</Link>
					);
				})}
			</CardContent>
		</Card>
	);
}

function PaidHistoryCard({ paid }: { paid: Overview["paid"] }) {
	return (
		<Card className="animate-card-enter">
			<CardHeader>
				<CardTitle className="font-display text-lg">
					Pagamentos realizados
				</CardTitle>
			</CardHeader>
			<CardContent>
				{paid.length === 0 ? (
					<p className="py-2 text-sm text-muted-foreground">
						Nenhum pagamento registrado ainda. Ao marcar uma parcela como paga,
						ela aparece aqui — anexe o comprovante para manter tudo guardado.
					</p>
				) : (
					<ul className="flex max-h-[22rem] flex-col divide-y overflow-y-auto pr-1">
						{paid.map((payment) => (
							<li
								key={payment._id}
								className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
							>
								<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
									<Check className="size-4" aria-hidden />
								</span>
								<Link
									href={`/fornecedores/${payment.vendorId}`}
									className="min-w-0 flex-1"
								>
									<p className="truncate text-sm font-medium">
										{payment.vendorName}
									</p>
									<p className="text-xs text-muted-foreground">
										{payment.description}
										{payment.paidDate
											? ` · ${formatDateBR(payment.paidDate)}`
											: ""}
										{payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}
									</p>
								</Link>
								{payment.hasReceipt ? (
									<span className="text-success" title="Comprovante anexado">
										<Paperclip
											className="size-4"
											aria-label="Comprovante anexado"
										/>
									</span>
								) : null}
								<span className="text-sm font-semibold text-success tabular-nums">
									{formatBRL(payment.amountCents)}
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type Categories = Overview["categories"];

function CategoryTable({ categories }: { categories: Categories }) {
	if (categories.length === 0) return null;
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Por categoria</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{categories.map((row) => (
						<CategoryRow key={row.category} row={row} />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function CategoryRow({ row }: { row: Categories[number] }) {
	const progress =
		row.plannedCents > 0
			? Math.min(
					Math.round((row.contractedCents / row.plannedCents) * 100),
					100,
				)
			: 0;

	return (
		<div className="rounded-2xl bg-card/50 p-3 ring-1 ring-border/60">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-medium">{CATEGORY_LABELS[row.category]}</p>
					<p className="text-xs text-muted-foreground">
						{row.vendorCount} fornecedor{row.vendorCount === 1 ? "" : "es"}
					</p>
				</div>
				<span className="text-sm font-semibold text-success tabular-nums">
					{formatBRL(row.paidCents)}
				</span>
			</div>
			<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-700"
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div className="mt-2 flex justify-between gap-3 text-[11px] text-muted-foreground">
				<span>Previsto {formatBRL(row.plannedCents)}</span>
				<span>Fechado {formatBRL(row.contractedCents)}</span>
			</div>
		</div>
	);
}
