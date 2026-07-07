"use client";

import { useMutation } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { notifyError } from "@/lib/notify";

interface GuestFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	inviteId: Id<"invites">;
	/** When set, edits this guest instead of adding a new one. */
	guest?: Doc<"guests">;
}

export function GuestFormDialog({
	open,
	onOpenChange,
	inviteId,
	guest,
}: GuestFormDialogProps) {
	const addGuest = useMutation(api.guests.addGuest);
	const updateGuest = useMutation(api.guests.updateGuest);

	const [name, setName] = useState("");
	const [ageGroup, setAgeGroup] = useState<"adulto" | "crianca">("adulto");
	const [mealNotes, setMealNotes] = useState("");
	const [saving, setSaving] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on open
	useEffect(() => {
		if (!open) return;
		setName(guest?.name ?? "");
		setAgeGroup(guest?.isChild ? "crianca" : "adulto");
		setMealNotes(guest?.mealNotes ?? "");
	}, [open]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (name.trim().length === 0) {
			toast.error("Informe o nome do convidado");
			return;
		}

		const payload = {
			name: name.trim(),
			isChild: ageGroup === "crianca",
			mealNotes: mealNotes.trim() || undefined,
		};

		setSaving(true);
		try {
			if (guest) {
				await updateGuest({ id: guest._id, ...payload });
				toast.success("Convidado atualizado");
			} else {
				await addGuest({ inviteId, ...payload });
				toast.success("Convidado adicionado");
			}
			onOpenChange(false);
		} catch (error) {
			notifyError(error, "Não foi possível salvar");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-display">
						{guest ? "Editar convidado" : "Adicionar convidado"}
					</DialogTitle>
					<DialogDescription>
						A confirmação de presença começa como pendente.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="guest-name">Nome *</Label>
						<Input
							id="guest-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex.: Maria Silva"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="guest-age">Faixa etária</Label>
						<Select
							value={ageGroup}
							onValueChange={(value) =>
								setAgeGroup(value as "adulto" | "crianca")
							}
						>
							<SelectTrigger id="guest-age" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="adulto">Adulto</SelectItem>
								<SelectItem value="crianca">Criança</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="guest-meal">Restrição alimentar</Label>
						<Input
							id="guest-meal"
							value={mealNotes}
							onChange={(e) => setMealNotes(e.target.value)}
							placeholder="Vegetariano, sem glúten..."
						/>
					</div>

					<DialogFooter>
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
