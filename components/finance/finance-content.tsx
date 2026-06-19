"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Download, Paperclip } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BudgetForecastCard } from "@/components/finance/budget-forecast-card";
import { PageHeader } from "@/components/page-header";
import {
	type PayTarget,
	QuickPayDialog,
} from "@/components/payments/quick-pay-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AllClearState } from "@/components/ui/state-view";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { paymentsToCsv } from "@/lib/domain/export";
import { classifyPaymentDue, DUE_SOON_WINDOW_DAYS } from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";

type Overview = FunctionReturnType<typeof api.finance.overview>;
type PendingPayment = Overview["pending"][number];

export function FinanceContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const overview = useQuery(api.finance.overview, { today });
	const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

	if (overview === undefined) return <FinanceSkeleton />;

	const groups = Map.groupBy(overview.pending, (payment) =>
		classifyPaymentDue(payment, today),
	);
	const overdue = groups.get("overdue") ?? [];
	const dueSoon = groups.get("dueSoon") ?? [];
	const later = groups.get("later") ?? [];

	const onPay = (payment: PendingPayment) =>
		setPayTarget({
			_id: payment._id,
			amountCents: payment.amountCents,
			description: payment.description,
			vendorName: payment.vendorName,
		});

	return (
		<div className="animate-screen-enter flex flex-col gap-[18px]">
			<PageHeader
				title="Financeiro"
				subtitle={
					overview.pending.length > 0
						? `${overview.pending.length} parcela${overview.pending.length === 1 ? "" : "s"} em aberto · ${formatBRL(overview.finance.pendingCents)}`
						: "Nenhuma parcela em aberto"
				}
				action={<ExportButton />}
			/>

			<InsightStrip
				finance={overview.finance}
				categories={overview.categories}
			/>

			<div className="grid items-start gap-[18px] lg:grid-cols-[1.5fr_1fr]">
				<BudgetPanel finance={overview.finance} />
				<BudgetForecastCard pendingPayments={overview.pending} today={today} />
			</div>

			<div className="grid items-start gap-[18px] lg:grid-cols-[1.25fr_1fr]">
				{overview.pending.length === 0 ? (
					<Panel className="[animation-delay:.1s]">
						<AllClearState
							title="Tudo em dia"
							description="Nenhuma parcela em aberto neste período. Pode respirar — está tudo certo."
						/>
					</Panel>
				) : (
					<PaymentAgenda
						overdue={overdue}
						dueSoon={dueSoon}
						later={later}
						onPay={onPay}
					/>
				)}
				<div className="flex flex-col gap-[18px]">
					<PaymentMethodCard rows={overview.byMethod} />
					<CategoryBreakdownCard categories={overview.categories} />
				</div>
			</div>

			<InstallmentsCard rows={overview.installments} />

			<PaidHistoryCard paid={overview.paid} />

			<QuickPayDialog
				target={payTarget}
				onOpenChange={(open) => {
					if (!open) setPayTarget(null);
				}}
			/>
		</div>
	);
}

/* ----------------------------- Card shell ------------------------------ */

function Panel({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={`animate-fadeup rounded-[22px] border border-border bg-card px-[26px] py-6 ${className}`}
		>
			{children}
		</section>
	);
}

/* ------------------------------ Export --------------------------------- */

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

/* --------------------------- Insight strip ----------------------------- */

function InsightStrip({
	finance,
	categories,
}: {
	finance: Overview["finance"];
	categories: Overview["categories"];
}) {
	// Folga = quanto ainda cabe na meta depois do previsto (contratado + estimado).
	const slack = finance.goalCents - finance.plannedCents;
	const onTrack = slack >= 0;
	const open = categories
		.filter((row) => row.contractedCents === 0 && row.plannedCents > 0)
		.map((row) => CATEGORY_LABELS[row.category]);
	const openCents = categories
		.filter((row) => row.contractedCents === 0)
		.reduce((sum, row) => sum + row.plannedCents, 0);

	return (
		<div className="grid gap-3.5 sm:grid-cols-[1.5fr_1fr]">
			<div
				className={`flex items-center gap-3.5 rounded-2xl border px-5 py-4 ${
					onTrack
						? "border-[#d4e1cf] bg-[#eef3ec]"
						: "border-[#f0d6cf] bg-[#fbeeeb]"
				}`}
			>
				<span
					className={`flex size-[38px] shrink-0 items-center justify-center rounded-full text-[17px] text-white ${
						onTrack ? "bg-[#4b6b4f]" : "bg-destructive"
					}`}
					aria-hidden
				>
					{onTrack ? "✓" : "!"}
				</span>
				<div>
					<div
						className={`text-sm font-bold ${onTrack ? "text-[#3c5741]" : "text-destructive"}`}
					>
						{onTrack
							? "No ritmo atual, você fecha dentro da meta"
							: "Atenção: o previsto já passou da meta"}
					</div>
					<div className="mt-0.5 text-[13px] text-[#5f6b58]">
						Previsto {formatBRL(finance.plannedCents)} de{" "}
						{formatBRL(finance.goalCents)} —{" "}
						<b>
							{onTrack ? "folga" : "excesso"} de {formatBRL(Math.abs(slack))}
						</b>
						.
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-[#ecdcbf] bg-[#fbf4e6] px-5 py-4">
				<div className="text-[11px] font-extrabold tracking-[0.05em] text-[#9a7a3e]">
					FALTA FECHAR{openCents > 0 ? ` · ${formatBRL(openCents)}` : ""}
				</div>
				<div className="mt-1 text-[13px] leading-snug text-[#5f5448]">
					{open.length > 0
						? `${open.slice(0, 3).join(", ")}${open.length > 3 ? " e outros" : ""} ainda sem contrato.`
						: "Tudo já está com contrato fechado. 🌿"}
				</div>
			</div>
		</div>
	);
}

/* ---------------------------- Budget panel ----------------------------- */

function BudgetPanel({ finance }: { finance: Overview["finance"] }) {
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
	const percent = Math.round(finance.percentConsumed * 100);
	const overBudget = finance.remainingCents < 0;

	const kpis = [
		{ label: "META", value: finance.goalCents, tone: "text-foreground" },
		{ label: "PREVISTO", value: finance.plannedCents, tone: "text-foreground" },
		{
			label: "FECHADO",
			value: finance.contractedCents,
			tone: "text-[#3c5741]",
		},
		{ label: "PAGO", value: finance.paidCents, tone: "text-[#b8924f]" },
		{ label: "PENDENTE", value: finance.pendingCents, tone: "text-foreground" },
		{
			label: "SALDO RESTANTE",
			value: finance.remainingCents,
			tone: overBudget ? "text-destructive" : "text-[#3c5741]",
			accentLabel: true,
		},
	];

	return (
		<Panel className="relative overflow-hidden [animation-delay:.05s]">
			<div className="flex items-baseline justify-between">
				<h2 className="font-display text-[22px] font-semibold text-foreground">
					Orçamento
				</h2>
				<div
					className={`text-[13px] font-bold ${overBudget ? "text-destructive" : "text-[#9a7a3e]"}`}
				>
					{percent}% da meta
				</div>
			</div>

			<div className="mt-4 mb-2.5 flex h-3.5 overflow-hidden rounded-full bg-[#eee4d4]">
				<div
					className="grow-x bg-[#b8924f] [animation-delay:.2s]"
					style={{ width: `${paidPct}%` }}
				/>
				<div
					className="grow-x bg-[#7a9078] [animation-delay:.35s]"
					style={{ width: `${contractedPct}%` }}
				/>
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
				{kpis.map((kpi) => (
					<div key={kpi.label}>
						<dt
							className={`text-[11px] font-bold tracking-[0.04em] ${kpi.accentLabel ? "text-[#3c5741]" : "text-[#9a8f80]"}`}
						>
							{kpi.label}
						</dt>
						<dd
							className={`font-display text-[22px] font-semibold tabular-nums ${kpi.tone}`}
						>
							{formatBRL(kpi.value)}
						</dd>
					</div>
				))}
			</dl>
		</Panel>
	);
}

/* -------------------------- Payment agenda ----------------------------- */

function PaymentAgenda({
	overdue,
	dueSoon,
	later,
	onPay,
}: {
	overdue: PendingPayment[];
	dueSoon: PendingPayment[];
	later: PendingPayment[];
	onPay: (payment: PendingPayment) => void;
}) {
	const hasNothing =
		overdue.length === 0 && dueSoon.length === 0 && later.length === 0;
	const sum = (rows: PendingPayment[]) =>
		rows.reduce((total, p) => total + p.amountCents, 0);

	return (
		<Panel className="[animation-delay:.1s]">
			<h2 className="mb-1 font-display text-[22px] font-semibold text-foreground">
				Agenda de pagamentos
			</h2>

			{hasNothing && (
				<p className="mt-3 text-sm text-muted-foreground">
					Nenhuma cobrança pendente por aqui. Respira — está tudo em dia. 🌿
				</p>
			)}

			{overdue.length > 0 && (
				<>
					<GroupHeader
						color="#b5523f"
						label="Atrasados"
						total={formatBRL(sum(overdue))}
						className="mt-4"
					/>
					<div className="flex flex-col gap-2">
						{overdue.map((p) => (
							<PayRow key={p._id} payment={p} overdue onPay={onPay} />
						))}
					</div>
				</>
			)}

			{dueSoon.length > 0 && (
				<>
					<GroupHeader
						color="#9a7a3e"
						label={`Próximos ${DUE_SOON_WINDOW_DAYS} dias`}
						total={formatBRL(sum(dueSoon))}
						className="mt-5"
					/>
					<div className="flex flex-col gap-2">
						{dueSoon.map((p) => (
							<PayRow key={p._id} payment={p} onPay={onPay} />
						))}
					</div>
				</>
			)}

			{later.length > 0 && (
				<>
					<GroupHeader
						color="#7a6e62"
						dotColor="#b0a594"
						label="Mais adiante"
						total={formatBRL(sum(later))}
						className="mt-5"
					/>
					<div className="flex flex-col gap-1.5">
						{later.map((p) => (
							<Link
								key={p._id}
								href={`/fornecedores/${p.vendorId}`}
								className="flex items-center justify-between gap-3 rounded-[12px] px-4 py-2.5 transition-colors hover:bg-muted"
							>
								<div className="min-w-0 text-[13.5px] text-foreground">
									<span className="truncate">{p.vendorName}</span>{" "}
									<span className="text-[#9a8f80]">
										· {p.description} · {p.dueDate.slice(8, 10)}/
										{p.dueDate.slice(5, 7)}
									</span>
								</div>
								<div className="shrink-0 text-[13.5px] font-semibold text-[#6b5f54] tabular-nums">
									{formatBRL(p.amountCents)}
								</div>
							</Link>
						))}
					</div>
				</>
			)}
		</Panel>
	);
}

function GroupHeader({
	color,
	dotColor,
	label,
	total,
	className = "",
}: {
	color: string;
	dotColor?: string;
	label: string;
	total: string;
	className?: string;
}) {
	return (
		<div
			className={`mb-2 flex items-center justify-between ${className}`}
			style={{ color }}
		>
			<div className="flex items-center gap-2">
				<span
					className="size-2 rounded-full"
					style={{ backgroundColor: dotColor ?? color }}
				/>
				<span className="text-xs font-extrabold tracking-[0.06em] uppercase">
					{label}
				</span>
			</div>
			<span className="text-[13px] font-bold tabular-nums">{total}</span>
		</div>
	);
}

function PayRow({
	payment,
	overdue = false,
	onPay,
}: {
	payment: PendingPayment;
	overdue?: boolean;
	onPay: (payment: PendingPayment) => void;
}) {
	return (
		<div
			className={`flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 ${
				overdue ? "border-[#f0d6cf] bg-[#fbeeeb]" : "border-border"
			}`}
		>
			<Link href={`/fornecedores/${payment.vendorId}`} className="min-w-0">
				<div className="truncate text-[14.5px] font-semibold text-foreground">
					{payment.vendorName}
				</div>
				<div
					className={`mt-0.5 text-[12px] ${overdue ? "text-[#a0584a]" : "text-muted-foreground"}`}
				>
					{payment.description}
					{overdue ? " · venceu " : " · "}
					{formatDateBR(payment.dueDate)}
				</div>
			</Link>
			<div className="flex shrink-0 items-center gap-3">
				<div className="text-[14.5px] font-bold tabular-nums text-foreground">
					{formatBRL(payment.amountCents)}
				</div>
				<button
					type="button"
					onClick={() => onPay(payment)}
					className={`cursor-pointer rounded-full px-[18px] py-2 text-[13px] font-semibold transition-colors ${
						overdue
							? "bg-destructive text-white hover:brightness-95"
							: "border border-[#cdbfa8] text-[#3c5741] hover:bg-secondary"
					}`}
				>
					Pagar
				</button>
			</div>
		</div>
	);
}

/* ------------------------ By payment method ---------------------------- */

function PaymentMethodCard({ rows }: { rows: Overview["byMethod"] }) {
	if (rows.length === 0) return null;

	return (
		<Panel className="px-6 py-[22px] [animation-delay:.12s]">
			<h2 className="mb-3.5 font-display text-xl font-semibold text-foreground">
				Por forma de pagamento
			</h2>
			<div className="flex flex-col gap-3.5">
				{rows.map((row) => {
					const total = Math.max(row.totalCents, 1);
					const paidPct = (row.paidCents / total) * 100;
					const pendingPct = (row.pendingCents / total) * 100;
					return (
						<div key={row.method}>
							<div className="flex items-baseline justify-between text-[13.5px]">
								<span className="font-semibold text-foreground">
									{row.method}
									<span className="ml-1 font-normal text-[#9a8f80]">
										· {row.count}x
									</span>
								</span>
								<span className="text-[#7a6e62] tabular-nums">
									{formatBRL(row.totalCents)}
								</span>
							</div>
							<div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[#eee4d4]">
								<div
									className="bg-[#b8924f] transition-all duration-700"
									style={{ width: `${paidPct}%` }}
								/>
								<div
									className="bg-[#7a9078] transition-all duration-700"
									style={{ width: `${pendingPct}%` }}
								/>
							</div>
							<div className="mt-1 text-[11.5px] text-[#9a8f80]">
								Pago {formatBRL(row.paidCents)} · A pagar{" "}
								{formatBRL(row.pendingCents)}
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}

/* -------------------------- By category -------------------------------- */

function CategoryBreakdownCard({
	categories,
}: {
	categories: Overview["categories"];
}) {
	if (categories.length === 0) return null;
	const rows = categories.slice(0, 6);

	return (
		<Panel className="px-6 py-[22px] [animation-delay:.14s]">
			<h2 className="mb-3.5 font-display text-xl font-semibold text-foreground">
				Por categoria
			</h2>
			<div className="flex flex-col gap-[11px]">
				{rows.map((row) => {
					const planned = Math.max(row.plannedCents, 1);
					const pct = Math.min(
						Math.round((row.paidCents / planned) * 100),
						100,
					);
					return (
						<div key={row.category}>
							<div className="mb-1 flex justify-between text-[12.5px]">
								<span className="font-medium text-foreground">
									{CATEGORY_LABELS[row.category]}
								</span>
								<span className="text-[#7a6e62] tabular-nums">
									{compactReais(row.paidCents)} /{" "}
									{compactReais(row.plannedCents)}
								</span>
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-[#eee4d4]">
								<div
									className="grow-x h-full bg-[#4b6b4f]"
									style={{ width: `${Math.max(pct, 2)}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}

/* ---------------------- Installments per vendor ------------------------ */

function InstallmentsCard({ rows }: { rows: Overview["installments"] }) {
	if (rows.length === 0) return null;

	return (
		<Panel className="[animation-delay:.16s]">
			<h2 className="mb-4 font-display text-[22px] font-semibold text-foreground">
				Parcelamentos por fornecedor
			</h2>
			<div className="grid gap-3 md:grid-cols-2">
				{rows.map((row) => {
					const fullyPaid = row.remainingInstallments === 0;
					const paidCount = row.totalInstallments - row.remainingInstallments;
					return (
						<Link
							key={row.vendorId}
							href={`/fornecedores/${row.vendorId}`}
							className={`flex items-center justify-between gap-3 rounded-[14px] border border-border px-[18px] py-3.5 transition-colors hover:border-primary/40 ${
								fullyPaid ? "bg-[#f6f8f4]" : "bg-card"
							}`}
						>
							<div className="min-w-0">
								<div className="truncate text-[14.5px] font-semibold text-foreground">
									{row.vendorName}
								</div>
								<div className="mt-0.5 text-[12px] text-[#9a8f80]">
									{paidCount} de {row.totalInstallments} pagas
									{row.paymentMethod ? ` · ${row.paymentMethod}` : ""}
									{row.nextDueDate
										? ` · próx. ${row.nextDueDate.slice(8, 10)}/${row.nextDueDate.slice(5, 7)}`
										: ""}
								</div>
							</div>
							<div className="shrink-0 text-right">
								{fullyPaid ? (
									<div className="text-[14.5px] font-bold text-[#3c5741]">
										Tudo pago ✓
									</div>
								) : (
									<>
										<div className="text-[14.5px] font-bold text-foreground tabular-nums">
											{formatBRL(row.pendingCents)}
										</div>
										<div className="text-[11px] text-[#9a8f80]">a pagar</div>
									</>
								)}
							</div>
						</Link>
					);
				})}
			</div>
		</Panel>
	);
}

/* --------------------------- Paid history ------------------------------ */

function PaidHistoryCard({ paid }: { paid: Overview["paid"] }) {
	return (
		<Panel className="[animation-delay:.18s]">
			<h2 className="mb-3 font-display text-[22px] font-semibold text-foreground">
				Pagamentos realizados
			</h2>
			{paid.length === 0 ? (
				<p className="py-2 text-sm text-muted-foreground">
					Nenhum pagamento registrado ainda. Ao marcar uma parcela como paga,
					ela aparece aqui — anexe o comprovante para manter tudo guardado.
				</p>
			) : (
				<ul className="flex flex-col divide-y divide-[#f0e8d9]">
					{paid.map((payment) => (
						<li
							key={payment._id}
							className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
						>
							<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef3ec] text-[#4b6b4f]">
								<Check className="size-4" aria-hidden />
							</span>
							<Link
								href={`/fornecedores/${payment.vendorId}`}
								className="min-w-0 flex-1"
							>
								<p className="truncate text-sm font-medium text-foreground">
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
								<span className="text-[#4b6b4f]" title="Comprovante anexado">
									<Paperclip
										className="size-4"
										aria-label="Comprovante anexado"
									/>
								</span>
							) : null}
							<span className="text-sm font-semibold text-[#3c5741] tabular-nums">
								{formatBRL(payment.amountCents)}
							</span>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

/* ----------------------------- Helpers --------------------------------- */

/** Compact reais for tight category rows: "7,2k", "850". */
function compactReais(cents: number): string {
	const reais = Math.round(cents / 100);
	if (reais < 1000) return reais.toLocaleString("pt-BR");
	const k = reais / 1000;
	return `${k.toLocaleString("pt-BR", {
		maximumFractionDigits: k < 100 && !Number.isInteger(k) ? 1 : 0,
	})}k`;
}

function FinanceSkeleton() {
	return (
		<div className="flex flex-col gap-[18px]" aria-busy>
			<PageHeader title="Financeiro" />
			<div className="grid gap-3.5 sm:grid-cols-[1.5fr_1fr]">
				<Skeleton className="h-20 rounded-2xl" />
				<Skeleton className="h-20 rounded-2xl" />
			</div>
			<div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
				<Skeleton className="h-72 rounded-[22px]" />
				<Skeleton className="h-72 rounded-[22px]" />
			</div>
			<div className="grid gap-[18px] lg:grid-cols-[1.25fr_1fr]">
				<Skeleton className="h-80 rounded-[22px]" />
				<Skeleton className="h-80 rounded-[22px]" />
			</div>
			<Skeleton className="h-40 rounded-[22px]" />
		</div>
	);
}
