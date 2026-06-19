"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { FileUpload } from "@/components/file-upload";
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
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { isValidISODate } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";

interface PaymentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	vendorId: Id<"vendors">;
	/** When set, edits this payment instead of creating one. */
	payment?: Doc<"payments">;
}

export function PaymentDialog({
	open,
	onOpenChange,
	vendorId,
	payment,
}: PaymentDialogProps) {
	const createPayment = useMutation(api.payments.create);
	const updatePayment = useMutation(api.payments.update);

	const [description, setDescription] = useState("");
	const [amountCents, setAmountCents] = useState<number | null>(null);
	const [dueDate, setDueDate] = useState("");
	const [method, setMethod] = useState("");
	const [saving, setSaving] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on open
	useEffect(() => {
		if (!open) return;
		setDescription(payment?.description ?? "");
		setAmountCents(payment?.amountCents ?? null);
		setDueDate(payment?.dueDate ?? "");
		setMethod(payment?.paymentMethod ?? "");
	}, [open]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (description.trim().length === 0) {
			toast.error("Informe a descrição");
			return;
		}
		if (amountCents === null || amountCents <= 0) {
			toast.error("Informe o valor");
			return;
		}
		if (!isValidISODate(dueDate)) {
			toast.error("Informe o vencimento");
			return;
		}

		const paymentMethod = method.trim() || undefined;
		setSaving(true);
		try {
			if (payment) {
				await updatePayment({
					id: payment._id,
					description: description.trim(),
					amountCents,
					dueDate,
					paymentMethod,
				});
				toast.success("Pagamento atualizado");
			} else {
				await createPayment({
					vendorId,
					description: description.trim(),
					amountCents,
					dueDate,
					paymentMethod,
				});
				toast.success("Pagamento adicionado");
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
						{payment ? "Editar pagamento" : "Adicionar pagamento"}
					</DialogTitle>
					<DialogDescription>
						Uma entrada, parcela ou pagamento avulso deste fornecedor.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="payment-description">Descrição *</Label>
						<Input
							id="payment-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder='Ex.: "Entrada", "Parcela 2/6"'
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="payment-amount">Valor *</Label>
							<CurrencyInput
								id="payment-amount"
								value={amountCents}
								onValueChange={setAmountCents}
								placeholder="0,00"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="payment-due-date">Vencimento *</Label>
							<Input
								id="payment-due-date"
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
							/>
						</div>
					</div>
					<PaymentMethodField value={method} onChange={setMethod} />

					{payment ? (
						<div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
							<Label>Comprovante</Label>
							<FileUpload
								paymentId={payment._id}
								kind="comprovante"
								label="Anexar comprovante"
							/>
						</div>
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
							{saving ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
