"use client";

import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	AtSign,
	CalendarPlus,
	Check,
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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import {
	type PayTarget,
	QuickPayDialog,
} from "@/components/payments/quick-pay-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentDialog } from "@/components/vendors/payment-dialog";
import { ScheduleDialog } from "@/components/vendors/schedule-dialog";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS, type VendorStatus } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { paymentIsOverdue } from "@/lib/domain/finance";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

// Matches the pill palette used on the vendors list (vendors-content.tsx).
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
	pesquisando: "Pesquisando",
	cotado: "Cotado",
	negociando: "Negociando",
	fechado: "Fechado",
	parcialmente_pago: "Parcialmente pago",
	pago: "Pago",
	cancelado: "Cancelado",
};

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
	const [deleting, setDeleting] = useState(false);
	const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

	const today = useMemo(() => todayInSaoPaulo(), []);

	const overdue = useMemo(() => {
		if (!payments) return undefined;
		return payments
			.filter((p) => paymentIsOverdue(p, today))
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
	}, [payments, today]);

	if (vendor === undefined) {
		return (
			<div className="flex flex-col gap-4" aria-busy>
				<Skeleton className="h-24 rounded-[22px]" />
				<div className="grid items-start gap-[22px] lg:grid-cols-[1.55fr_1fr]">
					<div className="flex flex-col gap-[22px]">
						<Skeleton className="h-40 rounded-[22px]" />
						<Skeleton className="h-56 rounded-[22px]" />
					</div>
					<div className="flex flex-col gap-[22px]">
						<Skeleton className="h-48 rounded-[22px]" />
						<Skeleton className="h-32 rounded-[22px]" />
					</div>
				</div>
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
		setDeleting(true);
		try {
			await removeVendor({ id: vendorId });
			toast.success("Fornecedor excluído");
			router.push("/fornecedores");
		} catch (error) {
			notifyError(error, "Não foi possível excluir");
			setDeleting(false);
		}
	}

	const { financials } = vendor;
	const progress = Math.round(financials.progress * 100);
	const hasContract = vendor.contractedCents != null;
	const hasContact =
		!!vendor.contactName ||
		!!vendor.phone ||
		!!vendor.instagram ||
		!!vendor.website ||
		!!vendor.notes;

	return (
		<div className="animate-screen-enter flex flex-col gap-[22px]">
			{/* breadcrumb */}
			<Link
				href="/fornecedores"
				className="inline-flex items-center gap-1.5 self-start text-[13px] text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden />
				Fornecedores
			</Link>

			{/* header */}
			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<h1 className="font-display text-[28px] leading-none font-semibold tracking-tight text-foreground sm:text-[34px]">
						{vendor.name}
					</h1>
					<div className="mt-2 flex flex-wrap items-center gap-2.5">
						<span className="text-[13px] text-[#8a7d6f]">
							{CATEGORY_LABELS[vendor.category]}
						</span>
						<span
							className={cn(
								"rounded-full px-2.5 py-1 text-[11px] font-semibold",
								STATUS_PILL[vendor.status],
							)}
						>
							{STATUS_SHORT[vendor.status]}
						</span>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Button variant="outline" onClick={() => setEditOpen(true)}>
						<Pencil data-icon="inline-start" aria-hidden />
						<span className="hidden sm:inline">Editar</span>
					</Button>
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

			{/* overdue alert */}
			{overdue ? (
				<div className="flex flex-col gap-3 rounded-[14px] border border-[#f0d6cf] bg-[#fbeeeb] px-[18px] py-3.5 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2.5">
						<span className="size-[9px] shrink-0 rounded-full bg-destructive" />
						<div className="text-[13.5px] leading-snug">
							<span className="font-bold text-destructive">
								{overdue.description} atrasada
							</span>
							<span className="text-[#a0584a]">
								{" "}
								· venceu {formatDateBR(overdue.dueDate)} ·{" "}
								{formatBRL(overdue.amountCents)}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							setPayTarget({
								_id: overdue._id,
								amountCents: overdue.amountCents,
								description: overdue.description,
								vendorName: vendor.name,
							})
						}
						className="shrink-0 cursor-pointer rounded-full bg-destructive px-5 py-2 text-[13px] font-bold text-white transition-colors hover:brightness-95"
					>
						Marcar como pago
					</button>
				</div>
			) : null}

			<div className="grid items-start gap-[22px] lg:grid-cols-[1.55fr_1fr]">
				{/* LEFT column */}
				<div className="flex flex-col gap-[22px]">
					{/* Valores */}
					<section className="rounded-[22px] border border-border bg-card px-[26px] py-6">
						<h2 className="mb-[18px] font-display text-[22px] font-semibold text-foreground">
							Valores
						</h2>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
							<ValueCell
								label="ORÇ. INICIAL"
								value={vendor.estimateCents}
								tone="text-[#6b5f54]"
							/>
							<ValueCell label="FECHADO" value={vendor.contractedCents} />
							<ValueCell
								label="PAGO"
								value={financials.paidCents}
								tone="text-[#b8924f]"
							/>
							<ValueCell
								label="PENDENTE"
								value={financials.pendingCents}
								tone="text-[#3c5741]"
							/>
						</dl>
						{hasContract ? (
							<>
								<div className="mt-[18px] mb-2 h-2.5 overflow-hidden rounded-full bg-[#eee4d4]">
									<div
										className="grow-x h-full bg-primary"
										style={{ width: `${Math.max(progress, 2)}%` }}
									/>
								</div>
								<div className="flex flex-wrap justify-between gap-x-3 text-[12.5px] text-[#7a6e62]">
									<span>{progress}% pago</span>
									{vendor.closedDate || vendor.paymentMethod ? (
										<span>
											{vendor.closedDate
												? `Fechado em ${formatDateBR(vendor.closedDate)}`
												: null}
											{vendor.closedDate && vendor.paymentMethod ? " · " : null}
											{vendor.paymentMethod}
										</span>
									) : null}
								</div>
							</>
						) : (
							<p className="mt-3 text-[12.5px] text-muted-foreground">
								Sem valor fechado — estimativa em aberto.
							</p>
						)}
					</section>

					{/* Pagamentos */}
					<section className="rounded-[22px] border border-border bg-card px-[26px] py-6">
						<div className="mb-4 flex items-center justify-between gap-3">
							<h2 className="font-display text-[22px] font-semibold text-foreground">
								Pagamentos
							</h2>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setScheduleOpen(true)}
								>
									<CalendarPlus data-icon="inline-start" aria-hidden />
									<span className="hidden sm:inline">Gerar parcelas</span>
									<span className="sm:hidden">Parcelas</span>
								</Button>
								<Button
									size="sm"
									onClick={() => {
										setEditingPayment(undefined);
										setPaymentOpen(true);
									}}
								>
									<Plus data-icon="inline-start" aria-hidden />
									Adicionar
								</Button>
							</div>
						</div>

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
								today={today}
								onEdit={(payment) => {
									setEditingPayment(payment);
									setPaymentOpen(true);
								}}
								onPay={(payment) =>
									setPayTarget({
										_id: payment._id,
										amountCents: payment.amountCents,
										description: payment.description,
										vendorName: vendor.name,
									})
								}
							/>
						)}

						{payments && financials.remainingInstallments > 0 ? (
							<p className="mt-3.5 text-center text-xs text-muted-foreground">
								{financials.remainingInstallments} parcela
								{financials.remainingInstallments === 1 ? "" : "s"} restante
								{financials.remainingInstallments === 1 ? "" : "s"}
								{financials.pendingCents > 0
									? ` · ${formatBRL(financials.pendingCents)}`
									: ""}
							</p>
						) : null}
					</section>
				</div>

				{/* RIGHT column */}
				<div className="flex flex-col gap-[22px]">
					{hasContact ? (
						<section className="rounded-[22px] border border-border bg-card px-[26px] py-6">
							<h2 className="mb-4 font-display text-[22px] font-semibold text-foreground">
								Contato
							</h2>
							{vendor.contactName ? (
								<p className="text-[15px] font-semibold text-foreground">
									{vendor.contactName}
								</p>
							) : null}

							{vendor.phone || vendor.instagram || vendor.website ? (
								<div className="mt-3.5 flex flex-col gap-2.5">
									{vendor.phone ? (
										<ContactLink
											href={`tel:${vendor.phone.replace(/\D/g, "")}`}
											icon={<Phone className="size-4" aria-hidden />}
										>
											{vendor.phone}
										</ContactLink>
									) : null}
									{vendor.instagram ? (
										<ContactLink
											href={`https://instagram.com/${vendor.instagram.replace(/^@/, "")}`}
											external
											icon={<AtSign className="size-4" aria-hidden />}
										>
											{vendor.instagram}
										</ContactLink>
									) : null}
									{vendor.website ? (
										<ContactLink
											href={vendor.website}
											external
											icon={<ExternalLink className="size-4" aria-hidden />}
										>
											{vendor.website.replace(/^https?:\/\//, "")}
										</ContactLink>
									) : null}
								</div>
							) : null}

							{vendor.notes ? (
								<div className="mt-[18px] border-t border-[#eee4d4] pt-4">
									<div className="mb-1.5 text-[11px] font-bold tracking-[0.04em] text-muted-foreground">
										OBSERVAÇÕES
									</div>
									<p className="text-[13.5px] leading-relaxed whitespace-pre-wrap text-[#5f5448]">
										{vendor.notes}
									</p>
								</div>
							) : null}
						</section>
					) : null}

					{/* Contrato e anexos */}
					<section className="rounded-[22px] border border-border bg-card px-[26px] py-6">
						<h2 className="mb-3.5 font-display text-[22px] font-semibold text-foreground">
							Contrato e anexos
						</h2>
						<div className="flex flex-col gap-3">
							{vendor.links?.map((link) => (
								<a
									key={link.url}
									href={link.url}
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-2 text-sm text-primary hover:underline"
								>
									<ExternalLink className="size-4" aria-hidden />
									{link.label}
								</a>
							))}
							<FileUpload
								vendorId={vendorId}
								kind="contrato"
								label="Anexar contrato ou arquivo"
							/>
						</div>
					</section>
				</div>
			</div>

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

			<QuickPayDialog
				target={payTarget}
				onOpenChange={(open) => {
					if (!open) setPayTarget(null);
				}}
			/>

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Remover fornecedor?"
				description={`${vendor.name} e todos os seus pagamentos serão removidos. Essa ação não pode ser desfeita.`}
				confirmLabel="Sim, remover"
				onConfirm={handleDelete}
				busy={deleting}
			/>
		</div>
	);
}

function ValueCell({
	label,
	value,
	tone = "text-foreground",
}: {
	label: string;
	value: number | undefined;
	tone?: string;
}) {
	return (
		<div>
			<dt className="text-[11px] font-bold tracking-[0.04em] text-[#9a8f80]">
				{label}
			</dt>
			<dd
				className={cn(
					"mt-0.5 font-display text-[22px] font-semibold tabular-nums",
					tone,
				)}
			>
				{value != null ? formatBRL(value) : "—"}
			</dd>
		</div>
	);
}

function ContactLink({
	href,
	icon,
	external = false,
	children,
}: {
	href: string;
	icon: React.ReactNode;
	external?: boolean;
	children: React.ReactNode;
}) {
	return (
		<a
			href={href}
			{...(external ? { target: "_blank", rel: "noreferrer" } : {})}
			className="flex items-center gap-2.5 text-[14px] text-[#3c5741] transition-opacity hover:opacity-80"
		>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#eef2ec] text-primary">
				{icon}
			</span>
			<span className="truncate">{children}</span>
		</a>
	);
}

function PaymentList({
	payments,
	today,
	onEdit,
	onPay,
}: {
	payments: Doc<"payments">[];
	today: string;
	onEdit: (payment: Doc<"payments">) => void;
	onPay: (payment: Doc<"payments">) => void;
}) {
	const markPending = useMutation(api.payments.markPending);
	const removePayment = useMutation(api.payments.remove);

	async function run(action: () => Promise<unknown>, success: string) {
		try {
			await action();
			toast.success(success);
		} catch (error) {
			notifyError(error, "Algo deu errado");
		}
	}

	return (
		<ul className="flex flex-col">
			{payments.map((payment, index) => {
				const isPaid = payment.status === "pago";
				const isOverdue = paymentIsOverdue(payment, today);
				const last = index === payments.length - 1;
				return (
					<li
						key={payment._id}
						className={cn(
							"flex items-center gap-3.5 py-3.5 first:pt-0",
							!last && "border-b border-[#f0e8d9]",
							isOverdue && "-mx-2.5 rounded-lg bg-[#fdf4f2] px-2.5",
						)}
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
									: onPay(payment)
							}
							className={cn(
								"flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
								isPaid
									? "border-primary bg-primary text-white"
									: isOverdue
										? "border-destructive text-transparent hover:text-destructive"
										: "border-[#cdbfa8] text-transparent hover:border-primary hover:text-primary",
							)}
						>
							<Check className="size-3.5" aria-hidden />
						</button>

						<div className="min-w-0 flex-1">
							<p
								className={cn(
									"truncate text-[14.5px] font-semibold text-foreground",
									isPaid && "text-muted-foreground line-through",
								)}
							>
								{payment.description}
							</p>
							<p
								className={cn(
									"text-xs",
									isOverdue
										? "font-semibold text-destructive"
										: "text-[#9a8f80]",
								)}
							>
								{isPaid && payment.paidDate
									? `pago em ${formatDateBR(payment.paidDate)}`
									: `vence ${formatDateBR(payment.dueDate)}`}
								{isOverdue ? " · atrasado" : ""}
								{payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}
							</p>
						</div>

						<div className="flex shrink-0 items-center gap-3">
							<span
								className={cn(
									"text-[14.5px] font-bold tabular-nums",
									isPaid ? "text-foreground" : "text-[#6b5f54]",
								)}
							>
								{formatBRL(payment.amountCents)}
							</span>
							{!isPaid && isOverdue ? (
								<button
									type="button"
									onClick={() => onPay(payment)}
									className="cursor-pointer rounded-full bg-destructive px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95"
								>
									Pagar
								</button>
							) : null}
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
						</div>
					</li>
				);
			})}
		</ul>
	);
}
