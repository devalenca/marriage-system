"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/state-view";
import { filterVendors } from "@/components/vendors/filter-vendors";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { api } from "@/convex/_generated/api";
import {
	CATEGORY_LABELS,
	CONTRACTED_STATUSES,
	STATUS_LABELS,
	VENDOR_CATEGORIES,
	VENDOR_STATUSES,
	type VendorCategory,
	type VendorStatus,
} from "@/lib/domain/categories";
import { todayInSaoPaulo } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

type Vendor = FunctionReturnType<typeof api.vendors.list>[number];
type PendingPayment = FunctionReturnType<
	typeof api.payments.listPending
>[number];
type SortKey = "valor" | "nome" | "status";

const STATUS_PILL: Record<VendorStatus, string> = {
	pesquisando: "bg-[#efe9df] text-[#7a6e62]",
	cotado: "bg-[#e6e9ee] text-[#5a6b80]",
	negociando: "bg-[#f4e7cc] text-[#9a7a3e]",
	fechado: "border border-[#4b6b4f] bg-card text-[#3c5741]",
	parcialmente_pago: "bg-[#dfe9df] text-[#3c5741]",
	pago: "bg-primary text-primary-foreground",
	cancelado: "bg-[#f0e6e3] text-[#a0584a]",
};

const STATUS_SHORT: Record<VendorStatus, string> = {
	...STATUS_LABELS,
	parcialmente_pago: "Parc. pago",
};

export function VendorsContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const vendors = useQuery(api.vendors.list, {});
	const pending = useQuery(api.payments.listPending, {});
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<VendorCategory | "todas">("todas");
	const [status, setStatus] = useState<VendorStatus | "todos">("todos");
	const [sort, setSort] = useState<SortKey>("valor");
	const [createOpen, setCreateOpen] = useState(false);

	const pendingByVendor = useMemo(() => {
		const map = new Map<string, PendingPayment[]>();
		for (const p of pending ?? [])
			map.set(p.vendorId, [...(map.get(p.vendorId) ?? []), p]);
		return map;
	}, [pending]);

	const stats = useMemo(
		() => (vendors ? summarize(vendors, pending ?? [], today) : null),
		[vendors, pending, today],
	);

	const filtered = useMemo(() => {
		if (!vendors) return [];
		const list = filterVendors(vendors, { search, category, status });
		return [...list].sort((a, b) => {
			if (sort === "nome") return a.name.localeCompare(b.name);
			if (sort === "status")
				return (
					VENDOR_STATUSES.indexOf(a.status) - VENDOR_STATUSES.indexOf(b.status)
				);
			return (vendorValue(b) ?? 0) - (vendorValue(a) ?? 0);
		});
	}, [vendors, search, category, status, sort]);

	const presentCategories = useMemo(
		() =>
			VENDOR_CATEGORIES.filter((c) => vendors?.some((v) => v.category === c)),
		[vendors],
	);
	const presentStatuses = useMemo(
		() => VENDOR_STATUSES.filter((s) => vendors?.some((v) => v.status === s)),
		[vendors],
	);

	const closedCount =
		vendors?.filter((v) => CONTRACTED_STATUSES.includes(v.status)).length ?? 0;

	return (
		<div>
			<PageHeader
				title="Fornecedores"
				subtitle={
					vendors
						? `${vendors.length} cadastrado${vendors.length === 1 ? "" : "s"} · ${closedCount} com contrato fechado`
						: undefined
				}
				action={
					<Button onClick={() => setCreateOpen(true)}>
						<Plus data-icon="inline-start" aria-hidden />
						Novo fornecedor
					</Button>
				}
			/>

			{/* insight strip */}
			{stats ? (
				<div className="mb-[18px] grid grid-cols-2 gap-3 sm:grid-cols-4">
					<StatCard label="PREVISTO" value={stats.planned} />
					<StatCard
						label="FECHADO"
						value={stats.contracted}
						tone="text-[#3c5741]"
					/>
					<StatCard label="PAGO" value={stats.paid} tone="text-[#b8924f]" />
					<StatCard
						label="⚠ ATRASADO"
						value={stats.overdue}
						tone="text-[#b5523f]"
						danger
					/>
				</div>
			) : null}

			{/* search + sort */}
			<div className="mb-[18px] flex flex-col gap-2 sm:flex-row">
				<div className="relative flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						aria-label="Buscar fornecedor"
						placeholder="Buscar por nome ou categoria…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
					<SelectTrigger aria-label="Ordenar" className="sm:w-48">
						<span className="text-muted-foreground">Ordenar: </span>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="valor">Maior valor</SelectItem>
						<SelectItem value="nome">Nome</SelectItem>
						<SelectItem value="status">Status</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* filter chips */}
			{vendors && vendors.length > 0 ? (
				<div className="mb-[18px] flex flex-col gap-2.5">
					<ChipRow label="CATEGORIA">
						<Chip
							active={category === "todas"}
							onClick={() => setCategory("todas")}
						>
							Todas
						</Chip>
						{presentCategories.map((c) => (
							<Chip
								key={c}
								active={category === c}
								onClick={() => setCategory(c)}
							>
								{CATEGORY_LABELS[c]}
							</Chip>
						))}
					</ChipRow>
					<ChipRow label="STATUS">
						<Chip
							active={status === "todos"}
							onClick={() => setStatus("todos")}
						>
							Todos
						</Chip>
						{presentStatuses.map((s) => (
							<Chip key={s} active={status === s} onClick={() => setStatus(s)}>
								{STATUS_SHORT[s]}
							</Chip>
						))}
					</ChipRow>
				</div>
			) : null}

			{vendors === undefined ? (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
					<Skeleton className="h-40 rounded-[18px]" />
					<Skeleton className="h-40 rounded-[18px]" />
					<Skeleton className="h-40 rounded-[18px]" />
				</div>
			) : vendors.length === 0 ? (
				<EmptyState
					title="Nenhum fornecedor ainda"
					description="Comece adicionando quem vai fazer parte do grande dia — espaço, buffet, fotografia…"
					action={
						<Button onClick={() => setCreateOpen(true)}>
							<Plus data-icon="inline-start" aria-hidden />
							Cadastrar o primeiro
						</Button>
					}
				/>
			) : filtered.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<p className="text-sm text-muted-foreground">
							Nenhum fornecedor encontrado com esses filtros.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{filtered.map((vendor) => (
						<VendorCard
							key={vendor._id}
							vendor={vendor}
							pending={pendingByVendor.get(vendor._id) ?? []}
							today={today}
						/>
					))}
				</div>
			)}

			<VendorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}

function StatCard({
	label,
	value,
	tone = "text-foreground",
	danger = false,
}: {
	label: string;
	value: number;
	tone?: string;
	danger?: boolean;
}) {
	return (
		<div
			className={cn(
				"rounded-2xl border px-4 py-3.5 sm:px-5",
				danger ? "border-[#f0d6cf] bg-[#fbeeeb]" : "border-border bg-card",
			)}
		>
			<div
				className={cn(
					"text-[10px] font-bold tracking-[0.05em] sm:text-[11px]",
					danger ? "text-[#b5523f]" : "text-muted-foreground",
				)}
			>
				{label}
			</div>
			<div
				className={cn("font-display text-2xl font-semibold tabular-nums", tone)}
			>
				{formatBRL(value)}
			</div>
		</div>
	);
}

function ChipRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="mr-1 text-[11px] font-bold tracking-[0.05em] text-muted-foreground">
				{label}
			</span>
			{children}
		</div>
	);
}

function Chip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={cn(
				"rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
				active
					? "bg-primary text-primary-foreground"
					: "border border-[#e3d8c6] bg-card text-[#6b5f54] hover:border-primary/40",
			)}
		>
			{children}
		</button>
	);
}

function VendorCard({
	vendor,
	pending,
	today,
}: {
	vendor: Vendor;
	pending: PendingPayment[];
	today: string;
}) {
	const value = vendorValue(vendor);
	const isCancelled = vendor.status === "cancelado";
	const hasContract = vendor.contractedCents != null;
	const pct = Math.round(vendor.financials.progress * 100);
	const health = deriveHealth(vendor, pending, today);

	return (
		<Link href={`/fornecedores/${vendor._id}`}>
			<Card
				className={cn(
					"flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary/40",
					isCancelled && "opacity-70",
				)}
			>
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p
							className={cn(
								"truncate font-display text-[19px] font-semibold leading-tight text-foreground",
								isCancelled && "text-[#6b5f54] line-through",
							)}
						>
							{vendor.name}
						</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{CATEGORY_LABELS[vendor.category]}
						</p>
					</div>
					<span
						className={cn(
							"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
							STATUS_PILL[vendor.status],
						)}
					>
						{STATUS_SHORT[vendor.status]}
					</span>
				</div>

				<div>
					<div
						className={cn(
							"font-display text-[23px] font-semibold tabular-nums",
							hasContract && !isCancelled
								? "text-foreground"
								: "text-[#6b5f54]",
							isCancelled && "text-[#9a8f80] line-through",
						)}
					>
						{value != null ? formatBRL(value) : "—"}
					</div>
					{isCancelled ? (
						<p className="mt-1 text-[11.5px] text-muted-foreground">
							não entra no orçamento
						</p>
					) : hasContract ? (
						<>
							<div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#eee4d4]">
								<div
									className="grow-x h-full bg-primary"
									style={{ width: `${Math.max(pct, 2)}%` }}
								/>
							</div>
							<p
								className={cn(
									"mt-1.5 text-[11.5px]",
									pct >= 100
										? "font-semibold text-[#3c5741]"
										: "text-muted-foreground",
								)}
							>
								{pct >= 100
									? "100% pago · quitado"
									: `${pct}% pago · ${formatBRL(vendor.financials.paidCents)}`}
							</p>
						</>
					) : (
						<p className="mt-2 text-[11.5px] text-muted-foreground">
							estimado · sem valor fechado
						</p>
					)}
				</div>

				<div className="mt-auto flex items-center gap-1.5 border-t border-[#f0e8d9] pt-2.5">
					{!isCancelled ? (
						<span
							className="size-[7px] shrink-0 rounded-full"
							style={{ backgroundColor: health.color }}
						/>
					) : null}
					<span
						className={cn(
							"truncate text-xs",
							health.danger
								? "font-semibold text-[#b5523f]"
								: "text-muted-foreground",
						)}
					>
						{health.text}
					</span>
				</div>
			</Card>
		</Link>
	);
}

/* ----------------------------- helpers --------------------------------- */

function vendorValue(vendor: Vendor): number | null {
	return vendor.contractedCents ?? vendor.estimateCents ?? null;
}

function summarize(
	vendors: Vendor[],
	pending: PendingPayment[],
	today: string,
) {
	let planned = 0;
	let contracted = 0;
	let paid = 0;
	for (const v of vendors) {
		if (v.status === "cancelado") continue;
		planned += v.contractedCents ?? v.estimateCents ?? 0;
		if (CONTRACTED_STATUSES.includes(v.status))
			contracted += v.contractedCents ?? 0;
		paid += v.financials.paidCents;
	}
	const overdue = pending
		.filter((p) => p.dueDate < today)
		.reduce((sum, p) => sum + p.amountCents, 0);
	return { planned, contracted, paid, overdue };
}

function deriveHealth(
	vendor: Vendor,
	pending: PendingPayment[],
	today: string,
): { color: string; text: string; danger?: boolean } {
	if (vendor.status === "cancelado")
		return { color: "#9a8f80", text: "Buscar outro fornecedor →" };

	const sorted = [...pending].sort((a, b) =>
		a.dueDate.localeCompare(b.dueDate),
	);
	const overdue = sorted.find((p) => p.dueDate < today);
	if (overdue)
		return {
			color: "#b5523f",
			text: `Parcela atrasada · venceu ${shortDate(overdue.dueDate)}`,
			danger: true,
		};
	const next = sorted.find((p) => p.dueDate >= today);
	if (next)
		return {
			color: "#9a7a3e",
			text: `Próx. vencimento · ${shortDate(next.dueDate)}`,
		};

	if (
		vendor.contractedCents &&
		vendor.financials.paidCents >= vendor.contractedCents
	)
		return { color: "#4b6b4f", text: "Tudo certo ✓" };
	if (vendor.status === "negociando")
		return { color: "#9a7a3e", text: "Aguardando proposta" };
	if (vendor.status === "cotado")
		return { color: "#5a6b80", text: "Comparar cotações" };
	if (vendor.status === "pesquisando")
		return { color: "#b0a594", text: "Ainda sem cotação" };
	return { color: "#4b6b4f", text: "Tudo certo ✓" };
}

/** "2026-06-15" → "15/06". */
function shortDate(iso: string): string {
	return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
