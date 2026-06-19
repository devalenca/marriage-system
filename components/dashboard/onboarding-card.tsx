"use client";

import { useMutation } from "convex/react";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { isValidISODate } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";

export function OnboardingCard() {
	const saveSettings = useMutation(api.settings.save);
	const generateChecklist = useMutation(api.tasks.generateFromTemplate);

	const [coupleNames, setCoupleNames] = useState("");
	const [weddingDate, setWeddingDate] = useState("");
	const [budgetCents, setBudgetCents] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
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
			await generateChecklist({});
			toast.success("Tudo pronto! Seu checklist foi criado");
		} catch (error) {
			notifyError(error, "Não foi possível salvar");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card className="mx-auto mt-8 grid max-w-4xl animate-screen-enter overflow-hidden p-0 md:grid-cols-[1.05fr_0.95fr]">
			<div className="hero-wash relative flex min-h-[24rem] flex-col items-center justify-center gap-4 overflow-hidden px-6 py-10 text-center text-white">
				<span className="hero-subject relative z-10 flex size-14 items-center justify-center rounded-full bg-black/28 shadow-sm ring-1 ring-white/20 backdrop-blur-md">
					<Heart className="size-7 text-gold" aria-hidden />
				</span>
				<div className="hero-subject relative z-10 rounded-[2rem] bg-black/28 px-6 py-4 shadow-sm ring-1 ring-white/20 backdrop-blur-md">
					<span className="block font-display text-3xl font-semibold">
						Vamos nos casar!
					</span>
					<CardDescription className="mt-2 max-w-sm text-white/76">
						Um cockpit leve para organizar fornecedores, orçamento e checklist
						até o grande dia.
					</CardDescription>
				</div>
			</div>
			<CardContent className="flex items-center py-8">
				<form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="couple-names">Nomes do casal</Label>
						<Input
							id="couple-names"
							placeholder="Ex.: Gabriel & Alice"
							value={coupleNames}
							onChange={(e) => setCoupleNames(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="wedding-date">Data do casamento</Label>
						<Input
							id="wedding-date"
							type="date"
							value={weddingDate}
							onChange={(e) => setWeddingDate(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="budget-goal">Meta de orçamento</Label>
						<CurrencyInput
							id="budget-goal"
							placeholder="55.000,00"
							value={budgetCents}
							onValueChange={setBudgetCents}
						/>
					</div>
					<Button type="submit" size="lg" disabled={saving} className="mt-2">
						{saving ? "Preparando..." : "Começar a planejar"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
