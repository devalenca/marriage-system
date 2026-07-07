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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
	INVITE_SIDE_LABELS,
	INVITE_SIDES,
	type InviteSide,
} from "@/lib/domain/guests";
import { notifyError } from "@/lib/notify";

const NO_SIDE = "nenhum";

interface InviteFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When set, edits this invite instead of creating one. */
	invite?: Doc<"invites">;
}

export function InviteFormDialog({
	open,
	onOpenChange,
	invite,
}: InviteFormDialogProps) {
	const createInvite = useMutation(api.guests.createInvite);
	const updateInvite = useMutation(api.guests.updateInvite);

	const [title, setTitle] = useState("");
	const [group, setGroup] = useState("");
	const [side, setSide] = useState<InviteSide | typeof NO_SIDE>(NO_SIDE);
	const [phone, setPhone] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on open
	useEffect(() => {
		if (!open) return;
		setTitle(invite?.title ?? "");
		setGroup(invite?.group ?? "");
		setSide(invite?.side ?? NO_SIDE);
		setPhone(invite?.phone ?? "");
		setNotes(invite?.notes ?? "");
	}, [open]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (title.trim().length === 0) {
			toast.error("Informe o nome do convite");
			return;
		}

		const payload = {
			title: title.trim(),
			group: group.trim() || undefined,
			side: side === NO_SIDE ? undefined : side,
			phone: phone.trim() || undefined,
			notes: notes.trim() || undefined,
		};

		setSaving(true);
		try {
			if (invite) {
				await updateInvite({ id: invite._id, ...payload });
				toast.success("Convite atualizado");
			} else {
				await createInvite(payload);
				toast.success("Convite criado");
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
			<DialogContent className="max-h-[90dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="font-display">
						{invite ? "Editar convite" : "Novo convite"}
					</DialogTitle>
					<DialogDescription>
						Um convite reúne as pessoas de uma mesma família ou grupo.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="invite-title">Nome do convite *</Label>
						<Input
							id="invite-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ex.: Família Silva"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="invite-group">Grupo</Label>
							<Input
								id="invite-group"
								value={group}
								onChange={(e) => setGroup(e.target.value)}
								placeholder="Ex.: Amigos do trabalho"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="invite-side">Lado</Label>
							<Select
								value={side}
								onValueChange={(value) =>
									setSide(value as InviteSide | typeof NO_SIDE)
								}
							>
								<SelectTrigger id="invite-side" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_SIDE}>—</SelectItem>
									{INVITE_SIDES.map((value) => (
										<SelectItem key={value} value={value}>
											{INVITE_SIDE_LABELS[value]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="invite-phone">Telefone de contato</Label>
						<Input
							id="invite-phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="(11) 99999-9999"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="invite-notes">Observações</Label>
						<Textarea
							id="invite-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Como enviar o convite, parentesco, etc."
							rows={3}
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
