"use client";

import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	AtSign,
	CalendarPlus,
	Check,
	ChevronDown,
	ExternalLink,
	MoreVertical,
	Pencil,
	Phone,
	Plus,
	Trash2,
	Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ValueItem } from "@/components/value-item";
import { PaymentDialog } from "@/components/vendors/payment-dialog";
import { ScheduleDialog } from "@/components/vendors/schedule-dialog";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { paymentIsOverdue } from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function VendorDetail({ vendorId }: { vendorId: Id<"vendors"> }) {
	const router = useRouter();
	const vendor = useQuery(api.vendors.get, { id: vendorId });
	const payments = useQuery(api.payments.listByVendor, { vendorId });
	const removeVendor = useMutation(api.vendors.remove);

	const [editOpen, setEditOpen] = useState(false);
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [paymentOpen, setPaymentOpen] = useState(false);
	const [editingPayment, setEditingPayment] = useState<
		Doc<"payments"> | undefined
	>(undefined);
	const [deleteOpen, setDeleteOpen] = useState(false);

	if (vendor === undefined) {
		return (
			<div className="flex flex-col gap-4" aria-busy>
				<Skeleton className="h-24 rounded-2xl" />
				<Skeleton className="h-40 rounded-2xl" />
				<Skeleton className="h-56 rounded-2xl" />
			</div>
		);
	}

	if (vendor === null) {
		return (
			<div className="flex flex-col items-center gap-4 py-16 text-center">
				<p className="text-sm text-muted-foreground">
					Fornecedor não encontrado.
				</p>
				<Button variant="outline" render={<Link href="/fornecedores" />}>
					<ArrowLeft data-icon="inline-start" aria-hidden />
					Voltar
				</Button>
			</div>
		);
	}

	async function handleDelete() {
		try {
			await removeVendor({ id: vendorId });
			toast.success("Fornecedor excluído");
			router.push("/fornecedores");
		} catch (error) {
			notifyError(error, "Não foi possível excluir");
		}
	}

	const { financials } = vendor;
	const progress = Math.round(financials.progress * 100);

	return (
		<div className="flex flex-col gap-4 animate-screen-enter">
			<header>
				<Link
					href="/fornecedores"
					className="-mx-1 mb-3 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Fornecedores
				</Link>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h1 className="font-display text-2xl font-semibold tracking-tight">
							{vendor.name}
						</h1>
						<div className="mt-1 flex flex-wrap items-center gap-2">
							<span className="text-sm text-muted-foreground">
								{CATEGORY_LABELS[vendor.category]}
							</span>
							<StatusBadge status={vendor.status} />
						</div>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="outline" size="icon" aria-label="Mais ações" />
							}
						>
							<MoreVertical aria-hidden />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setEditOpen(true)}>
								<Pencil aria-hidden /> Editar
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setDeleteOpen(true)}
							>
								<Trash2 aria-hidden /> Excluir
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<Card className="animate-card-enter">
				<CardHeader>
					<CardTitle className="font-display text-lg">Valores</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
						<ValueItem label="Orçamento inicial" value={vendor.estimateCents} />
						<ValueItem label="Valor fechado" value={vendor.contractedCents} />
						<ValueItem
							label="Pago"
							value={financials.paidCents}
							tone="text-success"
						/>
						<ValueItem
							label="Pendente"
							value={financials.pendingCents}
							tone={financials.pendingCents > 0 ? "text-warning" : undefined}
						/>
					</dl>
					{vendor.contractedCents ? (
						<div className="flex items-center gap-2">
							<Progress
								value={progress}
								className="h-1.5"
								aria-label={`${progress}% pago`}
							/>
							<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
								{progress}% pago
							</span>
						</div>
					) : null}
					{vendor.closedDate || vendor.paymentMethod ? (
						<p className="text-xs text-muted-foreground">
							{vendor.closedDate
								? `Fechado em ${formatDateBR(vendor.closedDate)}`
								: null}
							{vendor.closedDate && vendor.paymentMethod ? " · " : null}
							{vendor.paymentMethod}
						</p>
					) : null}
				</CardContent>
			</Card>

			<Card className="animate-card-enter" style={{ animationDelay: "60ms" }}>
				<CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle className="font-display text-lg">Pagamentos</CardTitle>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setScheduleOpen(true)}
							className="h-11 flex-1 sm:h-7 sm:flex-none"
						>
							<CalendarPlus data-icon="inline-start" aria-hidden />
							Gerar parcelas
						</Button>
						<Button
							size="sm"
							onClick={() => {
								setEditingPayment(undefined);
								setPaymentOpen(true);
							}}
							className="h-11 flex-1 sm:h-7 sm:flex-none"
						>
							<Plus data-icon="inline-start" aria-hidden />
							Adicionar
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{payments === undefined ? (
						<Skeleton className="h-24 rounded-xl" aria-busy />
					) : payments.length === 0 ? (
						<p className="py-2 text-sm text-muted-foreground">
							Nenhum pagamento cadastrado. Gere as parcelas do contrato ou
							adicione um pagamento avulso.
						</p>
					) : (
						<PaymentList
							payments={payments}
							onEdit={(payment) => {
								setEditingPayment(payment);
								setPaymentOpen(true);
							}}
						/>
					)}
				</CardContent>
			</Card>

			{vendor.contactName ||
			vendor.phone ||
			vendor.instagram ||
			vendor.website ||
			vendor.notes ? (
				<Card
					className="animate-card-enter"
					style={{ animationDelay: "120ms" }}
				>
					<CardHeader>
						<CardTitle className="font-display text-lg">
							Contato e observações
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1 text-sm">
						{vendor.contactName ? (
							<p className="py-1">{vendor.contactName}</p>
						) : null}
						{vendor.phone ? (
							<a
								href={`tel:${vendor.phone.replace(/\D/g, "")}`}
								className="-mx-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-primary transition-colors hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0 sm:py-1"
							>
								<Phone className="size-4 shrink-0" aria-hidden />
								{vendor.phone}
							</a>
						) : null}
						{vendor.instagram ? (
							<a
								href={`https://instagram.com/${vendor.instagram.replace(/^@/, "")}`}
								target="_blank"
								rel="noreferrer"
								className="-mx-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-primary transition-colors hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0 sm:py-1"
							>
								<AtSign className="size-4 shrink-0" aria-hidden />
								{vendor.instagram}
							</a>
						) : null}
						{vendor.website ? (
							<a
								href={vendor.website}
								target="_blank"
								rel="noreferrer"
								className="-mx-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-primary transition-colors hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0 sm:py-1"
							>
								<ExternalLink className="size-4 shrink-0" aria-hidden />
								<span className="truncate">{vendor.website}</span>
							</a>
						) : null}
						{vendor.notes ? (
							<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
								{vendor.notes}
							</p>
						) : null}
					</CardContent>
				</Card>
			) : null}

			<Card className="animate-card-enter" style={{ animationDelay: "180ms" }}>
				<CardHeader>
					<CardTitle className="font-display text-lg">
						Contrato e anexos
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{vendor.links?.map((link) => (
						<a
							key={link.url}
							href={link.url}
							target="_blank"
							rel="noreferrer"
							className="-mx-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm text-primary transition-colors hover:text-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-0 sm:py-1"
						>
							<ExternalLink className="size-4 shrink-0" aria-hidden />
							{link.label}
						</a>
					))}
					<FileUpload
						vendorId={vendorId}
						kind="contrato"
						label="Anexar contrato ou arquivo"
					/>
				</CardContent>
			</Card>

			<VendorFormDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				vendor={vendor}
			/>
			<ScheduleDialog
				open={scheduleOpen}
				onOpenChange={setScheduleOpen}
				vendorId={vendorId}
				defaultTotalCents={vendor.contractedCents ?? null}
			/>
			<PaymentDialog
				open={paymentOpen}
				onOpenChange={setPaymentOpen}
				vendorId={vendorId}
				payment={editingPayment}
			/>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Excluir fornecedor?
						</DialogTitle>
						<DialogDescription>
							{vendor.name} e todos os seus pagamentos serão removidos. Essa
							ação não pode ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteOpen(false)}>
							Cancelar
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Excluir
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/** Lists above this many rows scroll inside the card instead of stretching it. */
const PAYMENT_SCROLL_THRESHOLD = 6;

function PaymentList({
	payments,
	onEdit,
}: {
	payments: Doc<"payments">[];
	onEdit: (payment: Doc<"payments">) => void;
}) {
	const markPaid = useMutation(api.payments.markPaid);
	const markPending = useMutation(api.payments.markPending);
	const removePayment = useMutation(api.payments.remove);
	const today = todayInSaoPaulo();
	const [showPaid, setShowPaid] = useState(false);

	async function run(action: () => Promise<unknown>, success: string) {
		try {
			await action();
			toast.success(success);
		} catch (error) {
			notifyError(error, "Algo deu errado");
		}
	}

	// Open installments first (earliest due — overdue float to the top); paid
	// ones are tucked away so a long parcelamento doesn't dominate the page.
	const open = payments
		.filter((p) => p.status !== "pago")
		.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
	const paid = payments
		.filter((p) => p.status === "pago")
		.sort((a, b) =>
			(b.paidDate ?? b.dueDate).localeCompare(a.paidDate ?? a.dueDate),
		);

	function row(payment: Doc<"payments">) {
		const isPaid = payment.status === "pago";
		const isOverdue = paymentIsOverdue(payment, today);
		return (
			<li
				key={payment._id}
				className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
			>
				<button
					type="button"
					aria-label={
						isPaid
							? `Marcar ${payment.description} como pendente`
							: `Marcar ${payment.description} como pago`
					}
					onClick={() =>
						isPaid
							? run(
									() => markPending({ id: payment._id }),
									"Pagamento reaberto",
								)
							: run(
									() => markPaid({ id: payment._id }),
									"Pagamento registrado 🎉",
								)
					}
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 before:absolute before:-inset-2.5 before:content-[''] relative sm:before:hidden",
						isPaid
							? "border-success bg-success text-primary-foreground"
							: isOverdue
								? "border-destructive text-transparent hover:text-destructive"
								: "border-border text-transparent hover:border-success hover:text-success",
					)}
				>
					<Check className="size-3.5" aria-hidden />
				</button>
				<div className="min-w-0 flex-1">
					<p
						className={cn(
							"truncate text-sm font-medium",
							isPaid && "text-muted-foreground line-through",
						)}
					>
						{payment.description}
					</p>
					<p
						className={cn(
							"text-xs",
							isOverdue
								? "font-medium text-destructive"
								: "text-muted-foreground",
						)}
					>
						{isPaid && payment.paidDate
							? `pago em ${formatDateBR(payment.paidDate)}`
							: `vence em ${formatDateBR(payment.dueDate)}`}
						{isOverdue ? " · atrasado" : ""}
						{payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}
					</p>
				</div>
				<span
					className={cn(
						"text-sm font-semibold tabular-nums",
						isPaid && "text-success",
					)}
				>
					{formatBRL(payment.amountCents)}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={`Ações de ${payment.description}`}
							/>
						}
					>
						<MoreVertical aria-hidden />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEdit(payment)}>
							<Pencil aria-hidden /> Editar
						</DropdownMenuItem>
						{isPaid ? (
							<DropdownMenuItem
								onClick={() =>
									run(
										() => markPending({ id: payment._id }),
										"Pagamento reaberto",
									)
								}
							>
								<Undo2 aria-hidden /> Reabrir
							</DropdownMenuItem>
						) : null}
						<DropdownMenuItem
							variant="destructive"
							onClick={() =>
								run(
									() => removePayment({ id: payment._id }),
									"Pagamento removido",
								)
							}
						>
							<Trash2 aria-hidden /> Remover
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</li>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{open.length > 0 ? (
				<div>
					<p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
						Em aberto · {open.length}
					</p>
					<ul
						className={cn(
							"flex flex-col divide-y",
							open.length > PAYMENT_SCROLL_THRESHOLD &&
								"max-h-[22rem] overflow-y-auto pr-1",
						)}
					>
						{open.map(row)}
					</ul>
				</div>
			) : (
				<p className="py-1 text-sm text-success">
					Tudo pago — nenhuma parcela em aberto. 🌿
				</p>
			)}

			{paid.length > 0 ? (
				<div className={cn(open.length > 0 && "border-t border-border pt-3")}>
					<button
						type="button"
						onClick={() => setShowPaid((v) => !v)}
						aria-expanded={showPaid}
						className="flex w-full items-center justify-between rounded-lg text-[11px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
					>
						<span>Pagas · {paid.length}</span>
						<ChevronDown
							className={cn(
								"size-4 transition-transform",
								showPaid && "rotate-180",
							)}
							aria-hidden
						/>
					</button>
					{showPaid ? (
						<ul
							className={cn(
								"mt-1 flex flex-col divide-y",
								paid.length > PAYMENT_SCROLL_THRESHOLD &&
									"max-h-[22rem] overflow-y-auto pr-1",
							)}
						>
							{paid.map(row)}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	);
}
