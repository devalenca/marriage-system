"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	ListChecks,
	Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TaskDialog } from "@/components/checklist/task-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOpenOnCreateParam } from "@/components/use-create-param";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { monthGrid, monthLabelPT, shiftMonth } from "@/lib/domain/calendar";
import {
	PRIORITY_LABELS,
	TASK_STATUS_LABELS,
	TASK_STATUSES,
	type TaskPriority,
} from "@/lib/domain/categories";
import { isTaskOverdue, monthsBeforeLabel } from "@/lib/domain/checklist";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Task = Doc<"tasks">;
type PendingPayment = FunctionReturnType<
	typeof api.payments.listPending
>[number];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
	alta: "bg-destructive/10 text-destructive",
	media: "bg-warning/15 text-warning",
	baixa: "bg-muted text-muted-foreground",
};

export function ChecklistContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const tasks = useQuery(api.tasks.list, {});
	const pendingPayments = useQuery(api.payments.listPending, {});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
	useOpenOnCreateParam(setDialogOpen);

	function openCreate() {
		setEditingTask(undefined);
		setDialogOpen(true);
	}

	function openEdit(task: Task) {
		setEditingTask(task);
		setDialogOpen(true);
	}

	const doneCount = tasks?.filter((t) => t.status === "concluida").length ?? 0;

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Checklist"
				subtitle={
					tasks ? `${doneCount} de ${tasks.length} concluídas` : undefined
				}
				action={
					<Button onClick={openCreate}>
						<Plus data-icon="inline-start" aria-hidden />
						Nova tarefa
					</Button>
				}
			/>

			{tasks === undefined ? (
				<div className="flex flex-col gap-3" aria-busy>
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</div>
			) : (
				<Tabs defaultValue="lista">
					<TabsList className="mb-4 w-full">
						<TabsTrigger value="lista" className="flex-1">
							Lista
						</TabsTrigger>
						<TabsTrigger value="quadro" className="flex-1">
							Quadro
						</TabsTrigger>
						<TabsTrigger value="calendario" className="flex-1">
							Calendário
						</TabsTrigger>
					</TabsList>
					<TabsContent value="lista">
						<TaskListView tasks={tasks} today={today} onEdit={openEdit} />
					</TabsContent>
					<TabsContent value="quadro">
						<KanbanView tasks={tasks} today={today} onEdit={openEdit} />
					</TabsContent>
					<TabsContent value="calendario">
						<CalendarView
							tasks={tasks}
							payments={pendingPayments ?? []}
							today={today}
							onEdit={openEdit}
						/>
					</TabsContent>
				</Tabs>
			)}

			<TaskDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				task={editingTask}
			/>
		</div>
	);
}

function groupTasksByMonth(tasks: Task[]): Map<string, Task[]> {
	const groups = new Map<string, Task[]>();
	for (const task of tasks) {
		const key = task.dueDate ? task.dueDate.slice(0, 7) : "sem-prazo";
		const group = groups.get(key) ?? [];
		group.push(task);
		groups.set(key, group);
	}
	return groups;
}

function TaskListView({
	tasks,
	today,
	onEdit,
}: {
	tasks: Task[];
	today: string;
	onEdit: (task: Task) => void;
}) {
	if (tasks.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
					<span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
						<ListChecks className="size-6" aria-hidden />
					</span>
					<p className="max-w-sm text-sm text-muted-foreground text-balance">
						Nenhuma tarefa por aqui. Crie a primeira ou gere o checklist nas
						Configurações.
					</p>
				</CardContent>
			</Card>
		);
	}

	const groups = groupTasksByMonth(tasks);

	return (
		<div className="flex flex-col gap-5">
			{[...groups.entries()].map(([month, monthTasks]) => (
				<section key={month}>
					<h2 className="mb-2 text-sm font-semibold text-muted-foreground first-letter:uppercase">
						{month === "sem-prazo" ? "Sem prazo" : monthLabelPT(month)}
					</h2>
					<Card>
						<CardContent className="flex flex-col divide-y py-2">
							{monthTasks.map((task) => (
								<TaskRow
									key={task._id}
									task={task}
									today={today}
									onEdit={onEdit}
								/>
							))}
						</CardContent>
					</Card>
				</section>
			))}
		</div>
	);
}

function KanbanView({
	tasks,
	today,
	onEdit,
}: {
	tasks: Task[];
	today: string;
	onEdit: (task: Task) => void;
}) {
	const [onlyOverdue, setOnlyOverdue] = useState(false);
	const overdueCount = tasks.filter((t) => isTaskOverdue(t, today)).length;
	// Never leave the filter "on" when there is nothing overdue to show.
	const showOverdueOnly = onlyOverdue && overdueCount > 0;
	const visible = showOverdueOnly
		? tasks.filter((t) => isTaskOverdue(t, today))
		: tasks;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<Button
					variant={showOverdueOnly ? "default" : "outline"}
					size="sm"
					disabled={overdueCount === 0}
					aria-pressed={showOverdueOnly}
					onClick={() => setOnlyOverdue((v) => !v)}
				>
					Atrasadas ({overdueCount})
				</Button>
			</div>
			<div className="grid gap-4 md:grid-cols-3">
				{TASK_STATUSES.map((status) => {
					const columnTasks = visible.filter((t) => t.status === status);
					return (
						<section key={status} className="flex flex-col">
							<h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
								<span className="first-letter:uppercase">
									{TASK_STATUS_LABELS[status]}
								</span>
								<span className="tabular-nums">{columnTasks.length}</span>
							</h2>
							<Card className="flex-1">
								<CardContent className="flex min-h-24 flex-col divide-y py-2">
									{columnTasks.length === 0 ? (
										<p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
											Nada por aqui
										</p>
									) : (
										columnTasks.map((task) => (
											<TaskRow
												key={task._id}
												task={task}
												today={today}
												onEdit={onEdit}
											/>
										))
									)}
								</CardContent>
							</Card>
						</section>
					);
				})}
			</div>
		</div>
	);
}

function TaskRow({
	task,
	today,
	onEdit,
}: {
	task: Task;
	today: string;
	onEdit: (task: Task) => void;
}) {
	const updateTask = useMutation(api.tasks.update);
	const isDone = task.status === "concluida";
	const isOverdue = isTaskOverdue(task, today);

	async function toggle() {
		try {
			await updateTask({
				id: task._id,
				status: isDone ? "pendente" : "concluida",
			});
			if (!isDone) toast.success("Tarefa concluída ✅");
		} catch (error) {
			notifyError(error, "Não foi possível atualizar");
		}
	}

	return (
		<div className="flex items-center gap-3 py-2.5">
			<button
				type="button"
				onClick={toggle}
				aria-label={
					isDone
						? `Reabrir tarefa: ${task.title}`
						: `Concluir tarefa: ${task.title}`
				}
				className={cn(
					"flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
					isDone
						? "border-success bg-success text-primary-foreground"
						: "border-border text-transparent hover:border-success hover:text-success",
				)}
			>
				<Check className="size-3.5" aria-hidden />
			</button>
			<button
				type="button"
				onClick={() => onEdit(task)}
				className="min-w-0 flex-1 text-left"
			>
				<p
					className={cn(
						"truncate text-sm font-medium",
						isDone && "text-muted-foreground line-through",
					)}
				>
					{task.title}
				</p>
				<p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
					{task.dueDate ? (
						<span className={cn(isOverdue && "font-medium text-destructive")}>
							{formatDateBR(task.dueDate)}
						</span>
					) : null}
					{task.monthsBefore !== undefined ? (
						<span>{monthsBeforeLabel(task.monthsBefore)}</span>
					) : null}
					{task.assignee ? <span>· {task.assignee}</span> : null}
				</p>
			</button>
			<span
				className={cn(
					"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
					PRIORITY_STYLES[task.priority],
				)}
			>
				{PRIORITY_LABELS[task.priority]}
			</span>
		</div>
	);
}

function CalendarView({
	tasks,
	payments,
	today,
	onEdit,
}: {
	tasks: Task[];
	payments: PendingPayment[];
	today: string;
	onEdit: (task: Task) => void;
}) {
	const [month, setMonth] = useState(today.slice(0, 7));
	const [selected, setSelected] = useState(today);

	const tasksByDate = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const task of tasks) {
			if (!task.dueDate) continue;
			map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
		}
		return map;
	}, [tasks]);

	const paymentsByDate = useMemo(() => {
		const map = new Map<string, PendingPayment[]>();
		for (const payment of payments) {
			map.set(payment.dueDate, [...(map.get(payment.dueDate) ?? []), payment]);
		}
		return map;
	}, [payments]);

	const grid = monthGrid(month);
	const selectedTasks = tasksByDate.get(selected) ?? [];
	const selectedPayments = paymentsByDate.get(selected) ?? [];

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardContent className="py-4">
					<div className="mb-3 flex items-center justify-between">
						<Button
							variant="ghost"
							size="icon"
							aria-label="Mês anterior"
							onClick={() => setMonth((m) => shiftMonth(m, -1))}
						>
							<ChevronLeft aria-hidden />
						</Button>
						<span className="text-sm font-semibold first-letter:uppercase">
							{monthLabelPT(month)}
						</span>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Próximo mês"
							onClick={() => setMonth((m) => shiftMonth(m, 1))}
						>
							<ChevronRight aria-hidden />
						</Button>
					</div>
					<div className="grid grid-cols-7 gap-1 text-center">
						{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: static weekday header
								key={`${day}-${index}`}
								className="text-[11px] font-medium text-muted-foreground"
							>
								{day}
							</span>
						))}
						{grid.map(({ date, inMonth }) => {
							const hasTasks = tasksByDate.has(date);
							const hasPayments = paymentsByDate.has(date);
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
										"flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
										!inMonth && "text-muted-foreground/40",
										isToday && "font-bold text-primary",
										isSelected
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted",
									)}
								>
									<span className="tabular-nums">
										{Number(date.slice(8, 10))}
									</span>
									<span className="flex h-1.5 gap-0.5">
										{hasTasks ? (
											<span
												className={cn(
													"size-1.5 rounded-full",
													isSelected ? "bg-primary-foreground" : "bg-primary",
												)}
											/>
										) : null}
										{hasPayments ? (
											<span
												className={cn(
													"size-1.5 rounded-full",
													isSelected ? "bg-primary-foreground" : "bg-gold",
												)}
											/>
										) : null}
									</span>
								</button>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<section aria-label={`Itens de ${formatDateBR(selected)}`}>
				<h2 className="mb-2 text-sm font-semibold text-muted-foreground">
					{formatDateBR(selected)}
				</h2>
				{selectedTasks.length === 0 && selectedPayments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Nada agendado para este dia.
					</p>
				) : (
					<Card>
						<CardContent className="flex flex-col divide-y py-2">
							{selectedTasks.map((task) => (
								<TaskRow
									key={task._id}
									task={task}
									today={today}
									onEdit={onEdit}
								/>
							))}
							{selectedPayments.map((payment) => (
								<div
									key={payment._id}
									className="flex items-center justify-between gap-3 py-2.5"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">
											{payment.vendorName}
										</p>
										<p className="text-xs text-muted-foreground">
											{payment.description}
										</p>
									</div>
									<span className="text-sm font-semibold text-gold tabular-nums">
										{formatBRL(payment.amountCents)}
									</span>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</section>
		</div>
	);
}
