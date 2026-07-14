"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { ListChecks, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { PageHeader } from "@/components/page-header";
import { AccessCard } from "@/components/settings/access-card";
import { ThemeCard } from "@/components/settings/theme-card";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { isValidISODate, isValidISOTime } from "@/lib/domain/dates";
import { resolveTheme } from "@/lib/domain/themes";
import { notifyError } from "@/lib/notify";

export function SettingsContent() {
	const wedding = useQuery(api.weddings.getCurrent, {});

	if (wedding === undefined) {
		return (
			<div className="animate-screen-enter" aria-busy>
				<PageHeader title="Configurações" />
				<div className="flex flex-col gap-3">
					<Skeleton className="h-72 rounded-2xl" />
					<Skeleton className="h-32 rounded-2xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="animate-screen-enter">
			<PageHeader title="Configurações" />
			<div className="flex flex-col gap-3">
				{/* Keyed so the form state re-seeds if the wedding doc changes. */}
				<SettingsForm
					key={wedding?._id ?? "new"}
					initial={wedding ?? undefined}
				/>
				<ChecklistCard hasWedding={wedding !== null} />
				{wedding !== null ? (
					<ThemeCard current={resolveTheme(wedding.theme ?? undefined)} />
				) : null}
				<AccessCard />
				<Card>
					<CardHeader>
						<CardTitle className="font-display text-lg">Sessão</CardTitle>
						<CardDescription>
							Encerra o acesso neste dispositivo. Para voltar, basta entrar com
							e-mail e senha.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<SignOutButton />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="font-display text-lg">Sobre o app</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						<p>
							Uso privado do casal. Os dados ficam no banco local (Convex) desta
							máquina — nada é enviado para a internet.
						</p>
					</CardContent>
				</Card>
				<DangerZoneCard />
			</div>
		</div>
	);
}

/**
 * Lets the wedding admin permanently delete the wedding and every record
 * tied to it (LGPD right to erasure). Only rendered for the admin — members
 * never see it. A typed confirmation guards the irreversible action.
 */
function DangerZoneCard() {
	const members = useQuery(api.access.listMembers, {});
	const deleteWedding = useMutation(api.weddings.deleteOwn);
	const { signOut } = useAuthActions();
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [deleting, setDeleting] = useState(false);

	// Same rule as AccessCard: only the wedding admin gets management powers.
	const isAdmin = Boolean(
		members?.some((member) => member.isSelf && member.role === "admin"),
	);
	if (!isAdmin) return null;

	const confirmed = confirmText.trim() === "EXCLUIR";

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) setConfirmText("");
	}

	async function handleDelete() {
		if (!confirmed) return;
		setDeleting(true);
		try {
			await deleteWedding({});
			await signOut();
			// Hard navigation: the account is gone, so a full teardown avoids the
			// now-invalid wedding queries racing a soft client transition.
			window.location.assign("/");
		} catch (error) {
			notifyError(error, "Não foi possível excluir o casamento");
			setDeleting(false);
		}
	}

	return (
		<Card className="border-destructive/35 bg-destructive/5">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 font-display text-lg text-destructive">
					<TriangleAlert data-icon="inline-start" aria-hidden />
					Zona de perigo
				</CardTitle>
				<CardDescription>
					Excluir o casamento apaga em definitivo todos os dados — fornecedores,
					orçamento, pagamentos e checklist — para você e para todos os acessos.
					Esta ação não pode ser desfeita.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button variant="destructive" onClick={() => setOpen(true)}>
					<TriangleAlert data-icon="inline-start" aria-hidden />
					Excluir casamento
				</Button>
			</CardContent>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Excluir este casamento?
						</DialogTitle>
						<DialogDescription>
							Todos os dados são apagados permanentemente e você será
							desconectado. Para confirmar, digite{" "}
							<span className="font-semibold text-foreground">EXCLUIR</span>{" "}
							abaixo.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="delete-wedding-confirm">
							Digite EXCLUIR para confirmar
						</Label>
						<Input
							id="delete-wedding-confirm"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							autoComplete="off"
							placeholder="EXCLUIR"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => handleOpenChange(false)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={!confirmed || deleting}
						>
							{deleting ? "Excluindo..." : "Excluir para sempre"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

function SettingsForm({ initial }: { initial?: Doc<"weddings"> }) {
	const saveWedding = useMutation(api.weddings.save);
	const [coupleNames, setCoupleNames] = useState(initial?.coupleNames ?? "");
	const [weddingDate, setWeddingDate] = useState(initial?.weddingDate ?? "");
	const [budgetCents, setBudgetCents] = useState<number | null>(
		initial?.budgetGoalCents ?? null,
	);
	const [weddingTime, setWeddingTime] = useState(initial?.weddingTime ?? "");
	const [ceremonyVenue, setCeremonyVenue] = useState(
		initial?.ceremonyVenue ?? "",
	);
	const [receptionVenue, setReceptionVenue] = useState(
		initial?.receptionVenue ?? "",
	);
	const [saving, setSaving] = useState(false);

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		if (coupleNames.trim().length === 0) {
			toast.error("Informe os nomes do casal");
			return;
		}
		if (!isValidISODate(weddingDate)) {
			toast.error("Escolha a data do casamento");
			return;
		}
		if (budgetCents === null || budgetCents <= 0) {
			toast.error("Defina a meta de orçamento");
			return;
		}
		if (weddingTime && !isValidISOTime(weddingTime)) {
			toast.error("Horário inválido");
			return;
		}

		setSaving(true);
		try {
			await saveWedding({
				coupleNames: coupleNames.trim(),
				weddingDate,
				budgetGoalCents: budgetCents,
				ceremonyVenue: ceremonyVenue.trim() || undefined,
				receptionVenue: receptionVenue.trim() || undefined,
				weddingTime: weddingTime || undefined,
			});
			toast.success("Configurações salvas");
		} catch (error) {
			notifyError(error, "Não foi possível salvar");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">O casamento</CardTitle>
				<CardDescription>
					Esses dados alimentam o countdown, o orçamento e o checklist.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSave} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="settings-names">Nomes do casal</Label>
						<Input
							id="settings-names"
							value={coupleNames}
							onChange={(e) => setCoupleNames(e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="settings-date">Data do casamento</Label>
							<Input
								id="settings-date"
								type="date"
								value={weddingDate}
								onChange={(e) => setWeddingDate(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="settings-budget">Meta de orçamento</Label>
							<CurrencyInput
								id="settings-budget"
								value={budgetCents}
								onValueChange={setBudgetCents}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="settings-time">Horário</Label>
						<Input
							id="settings-time"
							type="time"
							value={weddingTime}
							onChange={(e) => setWeddingTime(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="settings-ceremony">Local da cerimônia</Label>
						<Input
							id="settings-ceremony"
							value={ceremonyVenue}
							onChange={(e) => setCeremonyVenue(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="settings-reception">Local da recepção</Label>
						<Input
							id="settings-reception"
							value={receptionVenue}
							onChange={(e) => setReceptionVenue(e.target.value)}
						/>
					</div>
					<Button type="submit" disabled={saving} className="self-end">
						{saving ? "Salvando..." : "Salvar"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function ChecklistCard({ hasWedding }: { hasWedding: boolean }) {
	const generateChecklist = useMutation(api.tasks.generateFromTemplate);
	const [regenOpen, setRegenOpen] = useState(false);

	async function handleRegenerate() {
		try {
			const result = await generateChecklist({ regenerate: true });
			setRegenOpen(false);
			toast.success(`Checklist regenerado: ${result.created} tarefas criadas`);
		} catch (error) {
			notifyError(error, "Não foi possível regenerar");
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Checklist</CardTitle>
				<CardDescription>
					Recria as tarefas do cronograma com base na data do casamento. Tarefas
					concluídas e criadas por você são preservadas.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button
					variant="outline"
					onClick={() => setRegenOpen(true)}
					disabled={!hasWedding}
				>
					<ListChecks data-icon="inline-start" aria-hidden />
					Regenerar checklist
				</Button>
			</CardContent>

			<Dialog open={regenOpen} onOpenChange={setRegenOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Regenerar checklist?
						</DialogTitle>
						<DialogDescription>
							As tarefas geradas que ainda estão pendentes serão substituídas
							pelas novas datas. Concluídas e manuais ficam como estão.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRegenOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleRegenerate}>Regenerar</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
