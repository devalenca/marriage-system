"use client";

import { useMutation, useQuery } from "convex/react";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { PageHeader } from "@/components/page-header";
import { AccessCard } from "@/components/settings/access-card";
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
import { notifyError } from "@/lib/notify";

export function SettingsContent() {
	const settings = useQuery(api.settings.get, {});

	if (settings === undefined) {
		return (
			<div aria-busy>
				<PageHeader title="Configurações" />
				<Skeleton className="h-64 rounded-2xl" />
			</div>
		);
	}

	return (
		<div>
			<PageHeader title="Configurações" />
			<div className="flex flex-col gap-4">
				{/* Keyed so the form state re-seeds if the settings row changes. */}
				<SettingsForm
					key={settings?._id ?? "new"}
					initial={settings ?? undefined}
				/>
				<ChecklistCard hasSettings={settings !== null} />
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
			</div>
		</div>
	);
}

function SettingsForm({ initial }: { initial?: Doc<"settings"> }) {
	const saveSettings = useMutation(api.settings.save);
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
			await saveSettings({
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

function ChecklistCard({ hasSettings }: { hasSettings: boolean }) {
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
					disabled={!hasSettings}
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
