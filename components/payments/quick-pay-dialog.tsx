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
import type { Id } from "@/convex/_generated/dataModel";
import { PAYMENT_METHOD_SUGGESTIONS } from "@/lib/domain/categories";
import { isValidISODate, todayInSaoPaulo } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";

const DEFAULT_METHOD = "PIX";

export type PayTarget = {
	_id: Id<"payments">;
	amountCents: number;
	description: string;
	vendorName?: string;
};

/**
 * One-step "Registrar pagamento" modal: confirm a pending installment as paid
 * with a date and method, no extra navigation.
 */
export function QuickPayDialog({
	target,
	onOpenChange,
}: {
	target: PayTarget | null;
	onOpenChange: (open: boolean) => void;
}) {
	const markPaid = useMutation(api.payments.markPaid);

	const [paidDate, setPaidDate] = useState(() => todayInSaoPaulo());
	const [method, setMethod] = useState(DEFAULT_METHOD);
	const [saving, setSaving] = useState(false);

	// Reset the fields each time a new payment becomes the target.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when target changes
	useEffect(() => {
		if (!target) return;
		setPaidDate(todayInSaoPaulo());
		setMethod(DEFAULT_METHOD);
		setSaving(false);
	}, [target?._id]);

	async function handleConfirm() {
		if (!target) return;
		if (!isValidISODate(paidDate)) {
			toast.error("Informe a data do pagamento");
			return;
		}
		setSaving(true);
		try {
			await markPaid({
				id: target._id,
				paidDate,
				paymentMethod: method,
			});
			toast.success("Pagamento registrado 🎉");
			onOpenChange(false);
		} catch (error) {
			notifyError(error, "Não foi possível registrar");
		} finally {
			setSaving(false);
		}
	}

	const subtitle = target
		? target.vendorName
			? `${target.description} · ${target.vendorName}`
			: target.description
		: "";

	return (
		<Dialog open={target !== null} onOpenChange={onOpenChange}>
			<DialogContent className="gap-5 rounded-3xl p-6">
				<DialogHeader>
					<DialogTitle className="font-display text-2xl leading-none font-semibold">
						Registrar pagamento
					</DialogTitle>
					{subtitle ? (
						<DialogDescription className="text-[12.5px]">
							{subtitle}
						</DialogDescription>
					) : null}
				</DialogHeader>

				<div className="rounded-2xl bg-[#f3f6f1] px-4 py-3.5 text-center">
					<div className="text-[11px] font-bold tracking-[0.05em] text-[#7a6e62]">
						VALOR
					</div>
					<div className="font-display text-[30px] font-semibold text-foreground tabular-nums">
						{target ? formatBRL(target.amountCents) : ""}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="quick-pay-date" className="text-xs font-semibold">
							Data do pagamento
						</Label>
						<Input
							id="quick-pay-date"
							type="date"
							value={paidDate}
							onChange={(e) => setPaidDate(e.target.value)}
							className="h-11 rounded-xl"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="quick-pay-method" className="text-xs font-semibold">
							Forma
						</Label>
						<Select
							value={method}
							onValueChange={(value) => setMethod(value ?? DEFAULT_METHOD)}
						>
							<SelectTrigger
								id="quick-pay-method"
								className="h-11 w-full rounded-xl"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAYMENT_METHOD_SUGGESTIONS.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter className="-mx-6 -mb-6 mt-1 border-0 bg-transparent px-6 pt-0 pb-6">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="h-11 rounded-xl px-6"
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={saving}
						className="h-11 flex-1 rounded-xl font-semibold"
					>
						{saving ? "Registrando..." : "Confirmar pagamento"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
