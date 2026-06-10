"use client";

import { useMutation } from "convex/react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatDateBR } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

export type PayablePayment = Pick<
	Doc<"payments">,
	"_id" | "vendorId" | "description" | "amountCents" | "dueDate"
> & { vendorName: string };

interface PaymentListCardProps {
	title: string;
	tone: "overdue" | "dueSoon" | "later";
	payments: PayablePayment[];
	/** Shows the group total next to the title. */
	showTotal?: boolean;
}

/** Card listing payable installments with vendor links and a quick pay action. */
export function PaymentListCard({
	title,
	tone,
	payments,
	showTotal = false,
}: PaymentListCardProps) {
	const markPaid = useMutation(api.payments.markPaid);
	const isOverdue = tone === "overdue";
	const Icon = isOverdue ? AlertTriangle : CalendarClock;
	const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

	async function handlePay(id: Id<"payments">) {
		try {
			await markPaid({ id });
			toast.success("Pagamento registrado 🎉");
		} catch (error) {
			notifyError(error, "Não foi possível registrar");
		}
	}

	return (
		<Card className={cn(isOverdue && "border-destructive/40")}>
			<CardHeader className="flex-row items-center gap-2">
				{tone !== "later" ? (
					<Icon
						className={cn(
							"size-4",
							isOverdue ? "text-destructive" : "text-warning",
						)}
						aria-hidden
					/>
				) : null}
				<CardTitle
					className={cn(
						"font-display text-lg",
						isOverdue && "text-destructive",
					)}
				>
					{title}
				</CardTitle>
				{showTotal ? (
					<span className="ml-auto text-sm font-semibold tabular-nums">
						{formatBRL(totalCents)}
					</span>
				) : null}
			</CardHeader>
			<CardContent className="flex flex-col divide-y">
				{payments.map((payment) => (
					<div
						key={payment._id}
						className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
					>
						<Link
							href={`/fornecedores/${payment.vendorId}`}
							className="min-w-0 flex-1"
						>
							<p className="truncate text-sm font-medium">
								{payment.vendorName}
							</p>
							<p className="text-xs text-muted-foreground">
								{payment.description} ·{" "}
								<span
									className={cn(isOverdue && "font-medium text-destructive")}
								>
									{formatDateBR(payment.dueDate)}
								</span>
							</p>
						</Link>
						<span className="text-sm font-semibold tabular-nums">
							{formatBRL(payment.amountCents)}
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handlePay(payment._id)}
						>
							Pagar
						</Button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
