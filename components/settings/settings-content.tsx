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
import { isValidISODate } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";

export function SettingsContent() {
	const settings = useQuery(api.settings.get, {});

	if (settings === undefined) {
		return (
			<div aria-busy>
				<PageHeader
					title="Ajustes"
					subtitle="dados do casal, meta de orçamento e acessos"
				/>
				<div className="flex flex-col gap-[18px]">
					<Skeleton className="h-56 rounded-[22px]" />
					<div className="grid gap-[18px] md:grid-cols-2">
						<Skeleton className="h-40 rounded-[22px]" />
						<Skeleton className="h-40 rounded-[22px]" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Ajustes"
				subtitle="dados do casal, meta de orçamento e acessos"
			/>
			<div className="flex flex-col gap-[18px]">
				{/* Keyed so the form state re-seeds if the settings row changes. */}
				<SettingsForm
					key={settings?._id ?? "new"}
					initial={settings ?? undefined}
				/>

				<div className="grid gap-[18px] md:grid-cols-2">
					<ChecklistCard hasSettings={settings !== null} />
					<SessionCard />
				</div>

				<AccessCard />

				<p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
					Uso privado do casal · os dados ficam no banco local desta máquina —
					nada é enviado para a internet.
				</p>
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

		setSaving(true);
		try {
			await saveSettings({
				coupleNames: coupleNames.trim(),
				weddingDate,
				budgetGoalCents: budgetCents,
			});
			toast.success("Configurações salvas");
		} catch (error) {
			notifyError(error, "Não foi possível salvar");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card className="animate-fadeup px-[26px] py-6">
			<CardHeader className="px-0">
				<CardTitle className="font-display text-[22px] font-semibold text-foreground">
					O casamento
				</CardTitle>
				<CardDescription>
					Esses dados alimentam o countdown, o orçamento e o checklist.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<form onSubmit={handleSave} className="flex flex-col gap-4">
					<div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="settings-names">Nomes do casal</Label>
							<Input
								id="settings-names"
								value={coupleNames}
								onChange={(e) => setCoupleNames(e.target.value)}
								placeholder="Alice & Gabriel"
							/>
						</div>
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
					<Button
						type="submit"
						disabled={saving}
						className="self-end rounded-full px-6"
					>
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
		<Card className="animate-fadeup px-[26px] py-6 [animation-delay:.05s]">
			<CardHeader className="px-0">
				<CardTitle className="font-display text-xl font-semibold text-foreground">
					Checklist
				</CardTitle>
				<CardDescription className="leading-relaxed">
					Recria as tarefas do cronograma com base na data. Tarefas concluídas e
					criadas por você são preservadas.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<Button
					variant="outline"
					onClick={() => setRegenOpen(true)}
					disabled={!hasSettings}
					className="rounded-full border-[#cdbfa8] text-[#3c5741]"
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

function SessionCard() {
	return (
		<Card className="animate-fadeup px-[26px] py-6 [animation-delay:.1s]">
			<CardHeader className="px-0">
				<CardTitle className="font-display text-xl font-semibold text-foreground">
					Sessão
				</CardTitle>
				<CardDescription className="leading-relaxed">
					Encerra o acesso neste dispositivo. Para voltar, basta entrar com
					e-mail e senha.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<SignOutButton />
			</CardContent>
		</Card>
	);
}
