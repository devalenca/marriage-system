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
			<DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto rounded-3xl p-6">
				<DialogHeader>
					<DialogTitle className="font-display text-2xl leading-none font-semibold">
						{task ? "Editar tarefa" : "Nova tarefa"}
					</DialogTitle>
					<DialogDescription className="text-[13px]">
						{task
							? "Ajuste prazo, prioridade, responsável ou status."
							: "Um passo a mais rumo ao grande dia."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-title" className="text-xs font-semibold">
							Título <span className="text-destructive">*</span>
						</Label>
						<Input
							id="task-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder='Ex.: "Fechar fotógrafo"'
							className="h-11 rounded-xl"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-due-date" className="text-xs font-semibold">
								Prazo
							</Label>
							<Input
								id="task-due-date"
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="h-11 rounded-xl"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-priority" className="text-xs font-semibold">
								Prioridade
							</Label>
							<Select
								value={priority}
								onValueChange={(value) => setPriority(value as TaskPriority)}
							>
								<SelectTrigger
									id="task-priority"
									className="h-11 w-full rounded-xl"
								>
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
							<Label htmlFor="task-assignee" className="text-xs font-semibold">
								Responsável
							</Label>
							<Input
								id="task-assignee"
								value={assignee}
								onChange={(e) => setAssignee(e.target.value)}
								placeholder="Gabriel, Alice, Casal..."
								className="h-11 rounded-xl"
							/>
						</div>
						{task ? (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="task-status" className="text-xs font-semibold">
									Status
								</Label>
								<Select
									value={status}
									onValueChange={(value) => setStatus(value as TaskStatus)}
								>
									<SelectTrigger
										id="task-status"
										className="h-11 w-full rounded-xl"
									>
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
						<Label htmlFor="task-notes" className="text-xs font-semibold">
							Anotações
						</Label>
						<Textarea
							id="task-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="rounded-xl"
						/>
					</div>
					<DialogFooter className="-mx-6 -mb-6 mt-1 gap-2 border-0 bg-transparent px-6 pt-0 pb-6">
						{task ? (
							<Button
								type="button"
								variant="destructive"
								onClick={handleRemove}
								className="h-11 rounded-full px-5 sm:mr-auto"
							>
								<Trash2 data-icon="inline-start" aria-hidden />
								Remover
							</Button>
						) : null}
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="h-11 rounded-full px-6"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={saving}
							className="h-11 rounded-full px-7 font-semibold"
						>
							{saving ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
