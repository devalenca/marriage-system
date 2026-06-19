"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import {
	type PayTarget,
	QuickPayDialog,
} from "@/components/payments/quick-pay-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { monthGrid, monthLabelPT, shiftMonth } from "@/lib/domain/calendar";
import { PRIORITY_LABELS } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Task = Doc<"tasks">;
type PendingPayment = FunctionReturnType<
	typeof api.payments.listPending
>[number];

type AgendaEvent =
	| { kind: "task"; date: string; task: Task }
	| { kind: "invoice" | "overdue"; date: string; payment: PendingPayment };

const WEEK_FULL = [
	{ key: "dom", label: "DOM" },
	{ key: "seg", label: "SEG" },
	{ key: "ter", label: "TER" },
	{ key: "qua", label: "QUA" },
	{ key: "qui", label: "QUI" },
	{ key: "sex", label: "SEX" },
	{ key: "sab", label: "SÁB" },
] as const;

export function AgendaContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const tasks = useQuery(api.tasks.list, {});
	const payments = useQuery(api.payments.listPending, {});

	return (
		<div>
			<PageHeader
				title="Agenda"
				subtitle="Tarefas e faturas do mês num só calendário"
			/>
			{tasks === undefined || payments === undefined ? (
				<div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[1.7fr_1fr]">
					<Skeleton className="h-[520px] rounded-[22px]" />
					<Skeleton className="h-72 rounded-[22px]" />
				</div>
			) : (
				<AgendaCalendar tasks={tasks} payments={payments} today={today} />
			)}
		</div>
	);
}

function AgendaCalendar({
	tasks,
	payments,
	today,
}: {
	tasks: Task[];
	payments: PendingPayment[];
	today: string;
}) {
	const [month, setMonth] = useState(today.slice(0, 7));
	const [selected, setSelected] = useState(today);
	const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

	const eventsByDate = useMemo(() => {
		const map = new Map<string, AgendaEvent[]>();
		const add = (date: string, ev: AgendaEvent) =>
			map.set(date, [...(map.get(date) ?? []), ev]);
		for (const task of tasks) {
			if (task.dueDate && task.status !== "concluida")
				add(task.dueDate, { kind: "task", date: task.dueDate, task });
		}
		for (const payment of payments) {
			add(payment.dueDate, {
				kind: payment.dueDate < today ? "overdue" : "invoice",
				date: payment.dueDate,
				payment,
			});
		}
		return map;
	}, [tasks, payments, today]);

	const grid = monthGrid(month);
	const selectedEvents = eventsByDate.get(selected) ?? [];

	return (
		<div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-start">
			<Card>
				<CardContent className="p-0">
					<div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
						<div className="flex items-center gap-3">
							<h2 className="font-display text-[26px] font-semibold first-letter:uppercase sm:text-[32px]">
								{monthLabelPT(month)}
							</h2>
							<div className="flex gap-1.5">
								<MonthNav
									label="Mês anterior"
									onClick={() => setMonth((m) => shiftMonth(m, -1))}
								>
									<ChevronLeft className="size-4" aria-hidden />
								</MonthNav>
								<MonthNav
									label="Próximo mês"
									onClick={() => setMonth((m) => shiftMonth(m, 1))}
								>
									<ChevronRight className="size-4" aria-hidden />
								</MonthNav>
							</div>
						</div>
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<LegendItem color="#4b6b4f" label="Tarefa" />
							<LegendItem color="#b8924f" label="Fatura" />
							<LegendItem color="#b5523f" label="Atrasado" />
						</div>
					</div>

					<div className="mt-4 grid grid-cols-7 border-t border-border bg-[#faf7f0]">
						{WEEK_FULL.map((w) => (
							<div
								key={w.key}
								className="py-2.5 text-center text-[11px] font-bold tracking-[0.06em] text-muted-foreground"
							>
								{w.label}
							</div>
						))}
					</div>
					<div className="grid grid-cols-7">
						{grid.map(({ date, inMonth }) => {
							const events = eventsByDate.get(date) ?? [];
							const isSelected = date === selected;
							const isToday = date === today;
							return (
								<button
									key={date}
									type="button"
									onClick={() => setSelected(date)}
									aria-label={`Dia ${formatDateBR(date)}`}
									aria-pressed={isSelected}
									className={cn(
										"flex min-h-[92px] flex-col gap-1 border-r border-b border-border p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0",
										!inMonth && "bg-[#faf7f0]/60",
										isSelected ? "bg-secondary" : "hover:bg-muted/60",
									)}
								>
									<span
										className={cn(
											"flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
											isToday
												? "bg-primary font-bold text-primary-foreground"
												: inMonth
													? "text-foreground"
													: "text-muted-foreground/50",
										)}
									>
										{Number(date.slice(8, 10))}
									</span>
									<span className="flex flex-col gap-0.5">
										{events.slice(0, 2).map((ev) => (
											<CalendarChip key={chipKey(ev)} event={ev} />
										))}
										{events.length > 2 ? (
											<span className="px-0.5 text-[9.5px] font-semibold text-muted-foreground">
												+{events.length - 2}
											</span>
										) : null}
									</span>
								</button>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<Card className="lg:sticky lg:top-5">
				<CardContent className="py-5">
					<h2 className="font-display text-2xl font-semibold leading-none first-letter:uppercase">
						{dayPanelLabel(selected, today)}
					</h2>
					<p className="mt-1 text-[12.5px] text-muted-foreground">
						{selectedEvents.length === 0
							? "Nada agendado"
							: `${selectedEvents.length} ${selectedEvents.length === 1 ? "item" : "itens"}`}
					</p>

					{selectedEvents.length === 0 ? (
						<div className="py-10 text-center text-muted-foreground">
							<div className="text-3xl opacity-50">○</div>
							<p className="mt-2 text-[13.5px]">
								Nada agendado neste dia.
								<br />
								Respira — está tudo em dia.
							</p>
						</div>
					) : (
						<div className="mt-4 flex flex-col gap-2.5">
							{selectedEvents.map((ev) =>
								ev.kind === "task" ? (
									<TaskAgendaItem key={chipKey(ev)} task={ev.task} />
								) : (
									<PaymentAgendaItem
										key={chipKey(ev)}
										payment={ev.payment}
										overdue={ev.kind === "overdue"}
										onPay={setPayTarget}
									/>
								),
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<QuickPayDialog
				target={payTarget}
				onOpenChange={(open) => {
					if (!open) setPayTarget(null);
				}}
			/>
		</div>
	);
}

function MonthNav({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
		>
			{children}
		</button>
	);
}

function LegendItem({ color, label }: { color: string; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span
				className="size-2.5 rounded-full"
				style={{ backgroundColor: color }}
			/>
			{label}
		</span>
	);
}

function chipKey(ev: AgendaEvent): string {
	return ev.kind === "task" ? `t-${ev.task._id}` : `p-${ev.payment._id}`;
}

const CHIP_STYLES = {
	task: "bg-[#eef3ec] text-[#3c5741]",
	invoice: "bg-[#f4ecd9] text-[#9a7a3e]",
	overdue: "bg-[#fbeeeb] text-[#b5523f]",
} as const;

function CalendarChip({ event }: { event: AgendaEvent }) {
	const title =
		event.kind === "task" ? event.task.title : event.payment.vendorName;
	return (
		<span
			className={cn(
				"truncate rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
				CHIP_STYLES[event.kind],
			)}
			title={title}
		>
			{title}
		</span>
	);
}

function TaskAgendaItem({ task }: { task: Task }) {
	const updateTask = useMutation(api.tasks.update);

	async function complete() {
		try {
			await updateTask({ id: task._id, status: "concluida" });
			toast.success("Tarefa concluída ✅");
		} catch (error) {
			notifyError(error, "Não foi possível concluir");
		}
	}

	return (
		<div className="rounded-[14px] border border-border bg-muted/40 p-3.5">
			<span className="text-[11px] font-bold tracking-[0.06em] text-[#3c5741] uppercase">
				Tarefa
			</span>
			<p className="mt-1 text-[15px] font-semibold text-foreground">
				{task.title}
			</p>
			<p className="text-[12.5px] text-muted-foreground">
				{PRIORITY_LABELS[task.priority]}
				{task.assignee ? ` · ${task.assignee}` : ""}
			</p>
			<div className="mt-2 flex justify-end">
				<button
					type="button"
					onClick={complete}
					className="rounded-full border border-[#cdbfa8] px-4 py-1.5 text-[13px] font-semibold text-[#3c5741] transition-colors hover:bg-secondary"
				>
					Concluir
				</button>
			</div>
		</div>
	);
}

function PaymentAgendaItem({
	payment,
	overdue,
	onPay,
}: {
	payment: PendingPayment;
	overdue: boolean;
	onPay: (target: PayTarget) => void;
}) {
	return (
		<div
			className={cn(
				"rounded-[14px] border p-3.5",
				overdue ? "border-[#f0d6cf] bg-[#fbeeeb]" : "border-border bg-muted/40",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span
					className={cn(
						"text-[11px] font-bold tracking-[0.06em] uppercase",
						overdue ? "text-[#b5523f]" : "text-[#9a7a3e]",
					)}
				>
					{overdue ? "Atrasado" : "Fatura"}
				</span>
				<span className="font-display text-lg font-semibold tabular-nums">
					{formatBRL(payment.amountCents)}
				</span>
			</div>
			<p className="mt-1 text-[15px] font-semibold text-foreground">
				{payment.vendorName}
			</p>
			<p className="text-[12.5px] text-muted-foreground">
				{payment.description}
			</p>
			<div className="mt-2 flex justify-end">
				<button
					type="button"
					onClick={() =>
						onPay({
							_id: payment._id,
							amountCents: payment.amountCents,
							description: payment.description,
							vendorName: payment.vendorName,
						})
					}
					className={cn(
						"rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
						overdue
							? "bg-destructive text-white hover:brightness-95"
							: "border border-[#cdbfa8] text-[#3c5741] hover:bg-secondary",
					)}
				>
					Marcar pago
				</button>
			</div>
		</div>
	);
}

function dayPanelLabel(date: string, today: string): string {
	if (date === today) return "Hoje";
	return formatDateBR(date);
}
