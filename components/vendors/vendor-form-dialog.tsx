"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
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
	CATEGORY_LABELS,
	CONTRACTED_STATUSES,
	STATUS_LABELS,
	VENDOR_CATEGORIES,
	VENDOR_STATUSES,
	type VendorCategory,
	type VendorStatus,
} from "@/lib/domain/categories";
import { notifyError } from "@/lib/notify";

interface VendorFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When set, the dialog edits this vendor instead of creating one. */
	vendor?: Doc<"vendors">;
}

export function VendorFormDialog({
	open,
	onOpenChange,
	vendor,
}: VendorFormDialogProps) {
	const createVendor = useMutation(api.vendors.create);
	const updateVendor = useMutation(api.vendors.update);

	const [name, setName] = useState("");
	const [category, setCategory] = useState<VendorCategory>("espaco");
	const [status, setStatus] = useState<VendorStatus>("pesquisando");
	const [estimateCents, setEstimateCents] = useState<number | null>(null);
	const [contractedCents, setContractedCents] = useState<number | null>(null);
	const [closedDate, setClosedDate] = useState("");
	const [paymentMethod, setPaymentMethod] = useState("");
	const [contactName, setContactName] = useState("");
	const [phone, setPhone] = useState("");
	const [instagram, setInstagram] = useState("");
	const [website, setWebsite] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	// Re-seed the fields whenever the dialog opens.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on open
	useEffect(() => {
		if (!open) return;
		setName(vendor?.name ?? "");
		setCategory(vendor?.category ?? "espaco");
		setStatus(vendor?.status ?? "pesquisando");
		setEstimateCents(vendor?.estimateCents ?? null);
		setContractedCents(vendor?.contractedCents ?? null);
		setClosedDate(vendor?.closedDate ?? "");
		setPaymentMethod(vendor?.paymentMethod ?? "");
		setContactName(vendor?.contactName ?? "");
		setPhone(vendor?.phone ?? "");
		setInstagram(vendor?.instagram ?? "");
		setWebsite(vendor?.website ?? "");
		setNotes(vendor?.notes ?? "");
	}, [open]);

	const isContracted = CONTRACTED_STATUSES.includes(status);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (name.trim().length === 0) {
			toast.error("Informe o nome do fornecedor");
			return;
		}
		if (isContracted && (contractedCents === null || contractedCents <= 0)) {
			toast.error("Informe o valor fechado do contrato");
			return;
		}

		const payload = {
			name: name.trim(),
			category,
			status,
			estimateCents: estimateCents ?? undefined,
			contractedCents: contractedCents ?? undefined,
			closedDate: closedDate || undefined,
			paymentMethod: paymentMethod.trim() || undefined,
			contactName: contactName.trim() || undefined,
			phone: phone.trim() || undefined,
			instagram: instagram.trim() || undefined,
			website: website.trim() || undefined,
			notes: notes.trim() || undefined,
		};

		setSaving(true);
		try {
			if (vendor) {
				await updateVendor({ id: vendor._id, ...payload });
				toast.success("Fornecedor atualizado");
			} else {
				await createVendor(payload);
				toast.success("Fornecedor cadastrado");
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
						{vendor ? "Editar fornecedor" : "Novo fornecedor"}
					</DialogTitle>
					<DialogDescription>
						{vendor
							? "Atualize os dados e o contrato deste fornecedor."
							: "Cadastre quem vai fazer parte do grande dia."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="vendor-name">Nome *</Label>
						<Input
							id="vendor-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ex.: Espaço Jardim das Flores"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="vendor-category">Categoria</Label>
							<Select
								value={category}
								onValueChange={(value) => setCategory(value as VendorCategory)}
								items={CATEGORY_LABELS}
							>
								<SelectTrigger id="vendor-category" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VENDOR_CATEGORIES.map((value) => (
										<SelectItem key={value} value={value}>
											{CATEGORY_LABELS[value]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="vendor-status">Status</Label>
							<Select
								value={status}
								onValueChange={(value) => setStatus(value as VendorStatus)}
								items={STATUS_LABELS}
							>
								<SelectTrigger id="vendor-status" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VENDOR_STATUSES.map((value) => (
										<SelectItem key={value} value={value}>
											{STATUS_LABELS[value]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="vendor-estimate">Orçamento inicial</Label>
						<CurrencyInput
							id="vendor-estimate"
							value={estimateCents}
							onValueChange={setEstimateCents}
							placeholder="0,00"
						/>
					</div>

					{isContracted ? (
						<fieldset className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3">
							<legend className="px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Contrato
							</legend>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="vendor-contracted">Valor fechado *</Label>
								<CurrencyInput
									id="vendor-contracted"
									value={contractedCents}
									onValueChange={setContractedCents}
									placeholder="0,00"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="vendor-closed-date">Fechado em</Label>
									<Input
										id="vendor-closed-date"
										type="date"
										value={closedDate}
										onChange={(e) => setClosedDate(e.target.value)}
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="vendor-payment-method">
										Forma de pagamento
									</Label>
									<Input
										id="vendor-payment-method"
										value={paymentMethod}
										onChange={(e) => setPaymentMethod(e.target.value)}
										placeholder="PIX, entrada + 6x..."
									/>
								</div>
							</div>
						</fieldset>
					) : null}

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="vendor-contact">Contato</Label>
							<Input
								id="vendor-contact"
								value={contactName}
								onChange={(e) => setContactName(e.target.value)}
								placeholder="Nome"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="vendor-phone">Telefone</Label>
							<Input
								id="vendor-phone"
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="(11) 99999-9999"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="vendor-instagram">Instagram</Label>
							<Input
								id="vendor-instagram"
								value={instagram}
								onChange={(e) => setInstagram(e.target.value)}
								placeholder="@perfil"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="vendor-website">Site</Label>
							<Input
								id="vendor-website"
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
								placeholder="https://..."
							/>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="vendor-notes">Observações</Label>
						<Textarea
							id="vendor-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Anotações da negociação, o que está incluso..."
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
