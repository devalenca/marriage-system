"use client";

import { useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpenOnCreateParam } from "@/components/use-create-param";
import { filterVendors } from "@/components/vendors/filter-vendors";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { api } from "@/convex/_generated/api";
import {
	CATEGORY_LABELS,
	STATUS_LABELS,
	VENDOR_CATEGORIES,
	VENDOR_STATUSES,
	type VendorCategory,
	type VendorStatus,
} from "@/lib/domain/categories";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

const CATEGORY_FILTER_ITEMS: Record<string, React.ReactNode> = {
	todas: "Todas as categorias",
	...CATEGORY_LABELS,
};
const STATUS_FILTER_ITEMS: Record<string, React.ReactNode> = {
	todos: "Todos os status",
	...STATUS_LABELS,
};

export function VendorsContent() {
	const vendors = useQuery(api.vendors.list, {});
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<VendorCategory | "todas">("todas");
	const [status, setStatus] = useState<VendorStatus | "todos">("todos");
	const [createOpen, setCreateOpen] = useState(false);
	useOpenOnCreateParam(setCreateOpen);

	const filtered = vendors
		? filterVendors(vendors, { search, category, status })
		: [];

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Fornecedores"
				subtitle={
					vendors
						? `${vendors.length} cadastrado${vendors.length === 1 ? "" : "s"}`
						: undefined
				}
				action={
					<Button
						onClick={() => setCreateOpen(true)}
						className="h-11 px-3.5 sm:h-8 sm:px-2.5"
					>
						<Plus data-icon="inline-start" aria-hidden />
						Novo
					</Button>
				}
			/>

			{/* Stacked on a phone, one line from sm up. */}
			<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
				<div className="relative sm:flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						aria-label="Buscar fornecedor"
						placeholder="Buscar por nome..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-11 pl-9 sm:h-9"
					/>
				</div>
				<div className="flex gap-2 sm:shrink-0">
					<Select
						value={category}
						onValueChange={(v) => setCategory(v as VendorCategory | "todas")}
						items={CATEGORY_FILTER_ITEMS}
					>
						<SelectTrigger
							aria-label="Filtrar por categoria"
							className="min-h-11 flex-1 sm:min-h-9 sm:w-44 sm:flex-none"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todas">Todas as categorias</SelectItem>
							{VENDOR_CATEGORIES.map((value) => (
								<SelectItem key={value} value={value}>
									{CATEGORY_LABELS[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={status}
						onValueChange={(v) => setStatus(v as VendorStatus | "todos")}
						items={STATUS_FILTER_ITEMS}
					>
						<SelectTrigger
							aria-label="Filtrar por status"
							className="min-h-11 flex-1 sm:min-h-9 sm:w-44 sm:flex-none"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todos">Todos os status</SelectItem>
							{VENDOR_STATUSES.map((value) => (
								<SelectItem key={value} value={value}>
									{STATUS_LABELS[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{vendors === undefined ? (
				<div className="flex flex-col gap-3" aria-busy>
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
				</div>
			) : filtered.length === 0 ? (
				<Card className="animate-card-enter">
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<p className="text-pretty text-sm text-muted-foreground">
							{vendors.length === 0
								? "Nenhum fornecedor ainda. Cadastre o primeiro e comece a dar vida ao casamento."
								: "Nenhum fornecedor com esses filtros. Ajuste a busca para ver mais."}
						</p>
						{vendors.length === 0 ? (
							<Button
								onClick={() => setCreateOpen(true)}
								className="h-11 px-3.5 sm:h-8 sm:px-2.5"
							>
								<Plus data-icon="inline-start" aria-hidden />
								Cadastrar fornecedor
							</Button>
						) : (
							<Button
								variant="outline"
								onClick={() => {
									setSearch("");
									setCategory("todas");
									setStatus("todos");
								}}
								className="h-11 px-3.5 sm:h-8 sm:px-2.5"
							>
								Limpar filtros
							</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<ul className="flex flex-col gap-3">
					{filtered.map((vendor, index) => {
						const mainValue =
							vendor.contractedCents ?? vendor.estimateCents ?? null;
						const progress = vendor.contractedCents
							? Math.round(vendor.financials.progress * 100)
							: null;
						return (
							<li
								key={vendor._id}
								className="animate-card-enter"
								style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
							>
								<Link
									href={`/fornecedores/${vendor._id}`}
									className="block rounded-[var(--radius-lg)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<Card className="transition-colors hover:border-primary/40">
										<CardContent className="flex flex-col gap-2.5 py-4">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<p className="truncate font-medium">{vendor.name}</p>
													<p className="text-xs text-muted-foreground">
														{CATEGORY_LABELS[vendor.category]}
													</p>
												</div>
												<div className="flex shrink-0 flex-col items-end gap-1">
													<StatusBadge status={vendor.status} />
													{mainValue !== null ? (
														<span className="font-display text-sm font-semibold tabular-nums">
															{formatBRL(mainValue)}
														</span>
													) : null}
												</div>
											</div>
											{progress !== null ? (
												<PaymentProgress
													percent={progress}
													pendingCents={vendor.financials.pendingCents}
												/>
											) : null}
										</CardContent>
									</Card>
								</Link>
							</li>
						);
					})}
				</ul>
			)}

			<VendorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}

/**
 * How far a contracted vendor is from being settled. The percentage carries
 * the emphasis and the amount still owed sits beside it — that is the number
 * the couple actually acts on.
 */
function PaymentProgress({
	percent,
	pendingCents,
}: {
	percent: number;
	pendingCents: number;
}) {
	const settled = pendingCents <= 0;
	return (
		<div className="flex flex-col gap-1.5">
			<Progress
				value={percent}
				aria-label={`${percent}% pago`}
				className="[&_[data-slot=progress-track]]:h-2"
			/>
			<div className="flex items-baseline justify-between gap-2 text-xs">
				<span
					className={cn(
						"font-semibold tabular-nums",
						settled ? "text-success" : "text-foreground",
					)}
				>
					{settled ? "Tudo pago" : `${percent}% pago`}
				</span>
				{settled ? null : (
					<span className="text-muted-foreground tabular-nums">
						faltam{" "}
						<span className="font-medium text-foreground">
							{formatBRL(pendingCents)}
						</span>
					</span>
				)}
			</div>
		</div>
	);
}
