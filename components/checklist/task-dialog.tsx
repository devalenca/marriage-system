"use client";

import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
	PRIORITY_LABELS,
	TASK_PRIORITIES,
	TASK_STATUS_LABELS,
	TASK_STATUSES,
	type TaskPriority,
	type TaskStatus,
} from "@/lib/domain/categories";
import { isValidISODate } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";

interface TaskDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When set, edits this task instead of creating one. */
	task?: Doc<"tasks">;
}

export function TaskDialog({ open, onOpenChange, task }: TaskDialogProps) {
	const createTask = useMutation(api.tasks.create);
	const updateTask = useMutation(api.tasks.update);
	const removeTask = useMutation(api.tasks.remove);

	const [title, setTitle] = useState("");
	const [notes, setNotes] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [priority, setPriority] = useState<TaskPriority>("media");
	const [status, setStatus] = useState<TaskStatus>("pendente");
	const [assignee, setAssignee] = useState("");
	const [saving, setSaving] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on open
	useEffect(() => {
		if (!open) return;
		setTitle(task?.title ?? "");
		setNotes(task?.notes ?? "");
		setDueDate(task?.dueDate ?? "");
		setPriority(task?.priority ?? "media");
		setStatus(task?.status ?? "pendente");
		setAssignee(task?.assignee ?? "");
	}, [open]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (title.trim().length === 0) {
			toast.error("Informe o título da tarefa");
			return;
		}
		if (dueDate && !isValidISODate(dueDate)) {
			toast.error("Prazo inválido");
			return;
		}

		setSaving(true);
		try {
			if (task) {
				await updateTask({
					id: task._id,
					title: title.trim(),
					notes: notes.trim() || undefined,
					dueDate: dueDate || undefined,
					priority,
					status,
					assignee: assignee.trim() || undefined,
				});
				toast.success("Tarefa atualizada");
			} else {
				await createTask({
					title: title.trim(),
					notes: notes.trim() || undefined,
					dueDate: dueDate || undefined,
					priority,
					assignee: assignee.trim() || undefined,
				});
				toast.success("Tarefa criada");
			}
			onOpenChange(false);
		} catch (error) {
			notifyError(error, "Não foi possível salvar");
		} finally {
			setSaving(false);
		}
	}

	async function handleRemove() {
		if (!task) return;
		try {
			await removeTask({ id: task._id });
			toast.success("Tarefa removida");
			onOpenChange(false);
		} catch (error) {
			notifyError(error, "Não foi possível remover");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-display">
						{task ? "Editar tarefa" : "Nova tarefa"}
					</DialogTitle>
					<DialogDescription>
						{task
							? "Ajuste prazo, prioridade, responsável ou status."
							: "Um passo a mais rumo ao grande dia."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-title">Título *</Label>
						<Input
							id="task-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder='Ex.: "Fechar fotógrafo"'
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-due-date">Prazo</Label>
							<Input
								id="task-due-date"
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-priority">Prioridade</Label>
							<Select
								value={priority}
								onValueChange={(value) => setPriority(value as TaskPriority)}
								items={PRIORITY_LABELS}
							>
								<SelectTrigger id="task-priority" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TASK_PRIORITIES.map((value) => (
										<SelectItem key={value} value={value}>
											{PRIORITY_LABELS[value]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-assignee">Responsável</Label>
							<Input
								id="task-assignee"
								value={assignee}
								onChange={(e) => setAssignee(e.target.value)}
								placeholder="Gabriel, Alice, Casal..."
							/>
						</div>
						{task ? (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="task-status">Status</Label>
								<Select
									value={status}
									onValueChange={(value) => setStatus(value as TaskStatus)}
									items={TASK_STATUS_LABELS}
								>
									<SelectTrigger id="task-status" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TASK_STATUSES.map((value) => (
											<SelectItem key={value} value={value}>
												{TASK_STATUS_LABELS[value]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : null}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-notes">Anotações</Label>
						<Textarea
							id="task-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
						/>
					</div>
					<DialogFooter className="gap-2">
						{task ? (
							<Button
								type="button"
								variant="destructive"
								onClick={handleRemove}
								className="sm:mr-auto"
							>
								<Trash2 data-icon="inline-start" aria-hidden />
								Remover
							</Button>
						) : null}
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={saving}>
							{saving ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
