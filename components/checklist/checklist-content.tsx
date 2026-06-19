"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TaskDialog } from "@/components/checklist/task-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { monthLabelPT } from "@/lib/domain/calendar";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/domain/categories";
import { monthsBeforeLabel } from "@/lib/domain/checklist";
import { daysBetween, formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Task = Doc<"tasks">;

const PRIORITY_PILL: Record<TaskPriority, string> = {
	alta: "bg-[#f7e9e6] text-[#b5523f]",
	media: "bg-[#f4ecd9] text-[#9a7a3e]",
	baixa: "bg-[#eef0ec] text-[#6e7c6a]",
};

export function ChecklistContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const tasks = useQuery(api.tasks.list, {});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

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
						Nova
					</Button>
				}
			/>

			{tasks === undefined ? (
				<div className="flex flex-col gap-[18px]" aria-busy>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<Skeleton className="h-[72px] rounded-2xl sm:col-span-1" />
						<Skeleton className="h-[72px] rounded-2xl" />
						<Skeleton className="h-[72px] rounded-2xl" />
					</div>
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</div>
			) : (
				<>
					<InsightStrip tasks={tasks} today={today} doneCount={doneCount} />
					<TaskTimeline tasks={tasks} today={today} onEdit={openEdit} />
				</>
			)}

			<TaskDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				task={editingTask}
			/>
		</div>
	);
}

/* --------------------------- insight strip ----------------------------- */

function InsightStrip({
	tasks,
	today,
	doneCount,
}: {
	tasks: Task[];
	today: string;
	doneCount: number;
}) {
	const total = tasks.length;
	const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

	const overdue = tasks.filter(
		(t) =>
			t.status !== "concluida" && t.dueDate !== undefined && t.dueDate < today,
	).length;

	const thisWeek = tasks.filter((t) => {
		if (t.status === "concluida" || t.dueDate === undefined) return false;
		const delta = daysBetween(today, t.dueDate);
		return delta >= 0 && delta <= 7;
	}).length;

	return (
		<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
			<div className="flex flex-col justify-center rounded-2xl border border-border bg-card px-5 py-[18px]">
				<div className="mb-2 flex items-center justify-between text-[13px]">
					<span className="font-semibold text-foreground">Progresso geral</span>
					<span className="text-muted-foreground tabular-nums">
						{pct}% · {doneCount}/{total}
					</span>
				</div>
				<div className="h-2.5 overflow-hidden rounded-full bg-[#eee4d4]">
					<div
						className="grow-x h-full rounded-full bg-primary"
						style={{ width: `${Math.max(pct, total === 0 ? 0 : 2)}%` }}
					/>
				</div>
			</div>

			<InsightCard label="⚠ ATRASADA" count={overdue} danger />
			<InsightCard
				label="ESTA SEMANA"
				count={thisWeek}
				tone="text-foreground"
			/>
		</div>
	);
}

function InsightCard({
	label,
	count,
	tone = "text-foreground",
	danger = false,
}: {
	label: string;
	count: number;
	tone?: string;
	danger?: boolean;
}) {
	const suffix = count === 1 ? "tarefa" : "tarefas";
	return (
		<div
			className={cn(
				"rounded-2xl border px-5 py-4",
				danger ? "border-[#f0d6cf] bg-[#fbeeeb]" : "border-border bg-card",
			)}
		>
			<div
				className={cn(
					"text-[11px] font-extrabold tracking-[0.05em]",
					danger ? "text-[#b5523f]" : "text-[#9a7a3e]",
				)}
			>
				{label}
			</div>
			<div
				className={cn(
					"font-display text-2xl font-semibold tabular-nums",
					danger ? "text-[#b5523f]" : tone,
				)}
			>
				{count} {suffix}
			</div>
		</div>
	);
}

/* ------------------------------ timeline ------------------------------- */

function groupTasksByMonth(tasks: Task[]): { key: string; tasks: Task[] }[] {
	const order: string[] = [];
	const groups = new Map<string, Task[]>();
	for (const task of tasks) {
		const key = task.dueDate ? task.dueDate.slice(0, 7) : "sem-prazo";
		const group = groups.get(key);
		if (group) {
			group.push(task);
		} else {
			groups.set(key, [task]);
			order.push(key);
		}
	}
	return order.map((key) => ({ key, tasks: groups.get(key) ?? [] }));
}

function TaskTimeline({
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
				<CardContent className="py-10 text-center text-sm text-muted-foreground">
					Nenhuma tarefa por aqui. Crie a primeira ou gere o checklist nas
					Configurações.
				</CardContent>
			</Card>
		);
	}

	const groups = groupTasksByMonth(tasks);

	return (
		<div className="relative pl-[26px]">
			{/* vertical timeline rail */}
			<div className="absolute top-2 bottom-2 left-[5px] w-0.5 bg-[#e7ddcd]" />

			{groups.map(({ key, tasks: monthTasks }) => {
				const allDone = monthTasks.every((t) => t.status === "concluida");
				const undated = key === "sem-prazo";
				return (
					<section key={key} className="mb-7 last:mb-0">
						<div className="relative mb-2">
							<span
								className={cn(
									"-left-[26px] absolute top-[5px] size-3 rounded-full border-[3px] border-[#e7e5df]",
									undated
										? "bg-[#e0d6c4]"
										: allDone
											? "bg-primary"
											: "bg-[#cdbfa8]",
								)}
								aria-hidden
							/>
							<h2
								className={cn(
									"font-display text-xl font-semibold first-letter:uppercase",
									undated ? "text-muted-foreground" : "text-foreground",
								)}
							>
								{undated ? "sem prazo" : monthLabelPT(key)}
							</h2>
						</div>
						<div className="flex flex-col gap-2">
							{monthTasks.map((task) => (
								<TaskRow
									key={task._id}
									task={task}
									today={today}
									onEdit={onEdit}
								/>
							))}
						</div>
					</section>
				);
			})}
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
	const isOverdue =
		!isDone && task.dueDate !== undefined && task.dueDate < today;

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
		<div
			className={cn(
				"flex items-center gap-3.5 rounded-2xl border px-4 py-3 transition-colors",
				isOverdue ? "border-[#f0d6cf] bg-[#fbeeeb]" : "border-border bg-card",
			)}
		>
			<button
				type="button"
				onClick={toggle}
				aria-label={
					isDone
						? `Reabrir tarefa: ${task.title}`
						: `Concluir tarefa: ${task.title}`
				}
				className={cn(
					"flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors",
					isDone
						? "border-primary bg-primary text-white"
						: isOverdue
							? "border-[#d99a8c] text-transparent hover:text-[#b5523f]"
							: "border-[#cdbfa8] text-transparent hover:border-primary hover:text-primary",
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
						"truncate text-[14.5px]",
						isDone
							? "font-medium text-muted-foreground line-through"
							: isOverdue
								? "font-semibold text-foreground"
								: "font-medium text-foreground",
					)}
				>
					{task.title}
				</p>
				<p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
					{task.dueDate ? (
						<span
							className={cn(
								isOverdue
									? "font-semibold text-[#b5523f]"
									: "text-muted-foreground",
							)}
						>
							{isOverdue
								? `venceu ${formatDateBR(task.dueDate)} · atrasada`
								: formatDateBR(task.dueDate)}
						</span>
					) : (
						<span className="text-muted-foreground">sem data definida</span>
					)}
					{task.monthsBefore !== undefined ? (
						<span className="text-muted-foreground">
							· {monthsBeforeLabel(task.monthsBefore)}
						</span>
					) : null}
					{task.assignee ? (
						<span className="text-muted-foreground">· {task.assignee}</span>
					) : null}
				</p>
			</button>

			<span
				className={cn(
					"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
					PRIORITY_PILL[task.priority],
				)}
			>
				{PRIORITY_LABELS[task.priority]}
			</span>
		</div>
	);
}
