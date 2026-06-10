"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { PaymentMethodField } from "@/components/payment-method-field";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isValidISODate } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";

interface ScheduleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	vendorId: Id<"vendors">;
	/** Pre-fills the total with the contracted value. */
	defaultTotalCents: number | null;
}

export function ScheduleDialog({
	open,
	onOpenChange,
	vendorId,
	defaultTotalCents,
}: ScheduleDialogProps) {
	const createSchedule = useMutation(api.payments.createSchedule);

	const [totalCents, setTotalCents] = useState<number | null>(null);
	const [downCents, setDownCents] = useState<number | null>(null);
	const [count, setCount] = useState("1");
	const [downDate, setDownDate] = useState("");
	const [firstDate, setFirstDate] = useState("");
	const [method, setMethod] = useState("");
	const [saving, setSaving] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on open
	useEffect(() => {
		if (!open) return;
		setTotalCents(defaultTotalCents);
		setDownCents(null);
		setCount("1");
		setDownDate("");
		setFirstDate("");
		setMethod("");
	}, [open]);

	const installments = Number.parseInt(count, 10);
	const installmentPreview =
		totalCents !== null &&
		Number.isFinite(installments) &&
		installments > 0 &&
		totalCents - (downCents ?? 0) > 0
			? Math.floor((totalCents - (downCents ?? 0)) / installments)
			: null;

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (totalCents === null || totalCents <= 0) {
			toast.error("Informe o valor total");
			return;
		}
		const hasDown = (downCents ?? 0) > 0;
		if (hasDown && !isValidISODate(downDate)) {
			toast.error("Informe a data da entrada");
			return;
		}
		const remaining = totalCents - (downCents ?? 0);
		if (remaining > 0) {
			if (!Number.isFinite(installments) || installments < 1) {
				toast.error("Informe o número de parcelas");
				return;
			}
			if (!isValidISODate(firstDate)) {
				toast.error("Informe a data da primeira parcela");
				return;
			}
		}

		setSaving(true);
		try {
			await createSchedule({
				vendorId,
				totalCents,
				downPaymentCents: downCents ?? 0,
				installmentsCount: remaining > 0 ? installments : 0,
				downPaymentDate: hasDown ? downDate : undefined,
				// The domain requires a first installment date even when only a
				// down payment exists; reuse the down payment date then.
				firstInstallmentDate: remaining > 0 ? firstDate : downDate,
				paymentMethod: method.trim() || undefined,
			});
			toast.success("Parcelas geradas");
			onOpenChange(false);
		} catch (error) {
			notifyError(error, "Não foi possível gerar");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="font-display">Gerar parcelas</DialogTitle>
					<DialogDescription>
						Entrada + parcelas mensais. Pagamentos pendentes anteriores serão
						substituídos; os já pagos ficam.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="schedule-total">Valor total *</Label>
						<CurrencyInput
							id="schedule-total"
							value={totalCents}
							onValueChange={setTotalCents}
							placeholder="0,00"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="schedule-down">Entrada</Label>
							<CurrencyInput
								id="schedule-down"
								value={downCents}
								onValueChange={setDownCents}
								placeholder="0,00"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="schedule-down-date">Data da entrada</Label>
							<Input
								id="schedule-down-date"
								type="date"
								value={downDate}
								onChange={(e) => setDownDate(e.target.value)}
								disabled={(downCents ?? 0) <= 0}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="schedule-count">Nº de parcelas</Label>
							<Input
								id="schedule-count"
								type="number"
								min={1}
								max={48}
								inputMode="numeric"
								value={count}
								onChange={(e) => setCount(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="schedule-first-date">1ª parcela em</Label>
							<Input
								id="schedule-first-date"
								type="date"
								value={firstDate}
								onChange={(e) => setFirstDate(e.target.value)}
							/>
						</div>
					</div>
					<PaymentMethodField
						id="schedule-method"
						value={method}
						onChange={setMethod}
					/>
					{installmentPreview !== null ? (
						<p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
							{installments}x de aproximadamente{" "}
							<span className="font-medium text-foreground tabular-nums">
								{formatBRL(installmentPreview)}
							</span>
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={saving}>
							{saving ? "Gerando..." : "Gerar parcelas"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
