// Pure CSV export of payments. Semicolon-separated for pt-BR Excel, money in
// pt-BR format, dates dd/MM/yyyy. No I/O — the UI turns the string into a Blob.

import {
	CATEGORY_LABELS,
	PAYMENT_METHOD_FALLBACK,
	type PaymentStatus,
	type VendorCategory,
} from "./categories";
import { formatDateBR } from "./dates";

export interface PaymentExportRow {
	vendorName: string;
	category: VendorCategory;
	description: string;
	method?: string;
	status: PaymentStatus;
	dueDate: string;
	paidDate?: string;
	amountCents: number;
}

const SEP = ";";

const HEADERS = [
	"Fornecedor",
	"Categoria",
	"Descrição",
	"Forma de pagamento",
	"Status",
	"Vencimento",
	"Pago em",
	"Valor",
];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

/** Wraps a field in quotes when it contains the separator, quotes or newlines. */
function escapeField(value: string): string {
	if (/[";\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function paymentsToCsv(rows: PaymentExportRow[]): string {
	const lines = [HEADERS.join(SEP)];

	for (const row of rows) {
		const fields = [
			row.vendorName,
			CATEGORY_LABELS[row.category],
			row.description,
			row.method?.trim() || PAYMENT_METHOD_FALLBACK,
			row.status === "pago" ? "Pago" : "Pendente",
			formatDateBR(row.dueDate),
			row.paidDate ? formatDateBR(row.paidDate) : "",
			moneyFormatter.format(row.amountCents / 100),
		];
		lines.push(fields.map((f) => escapeField(f)).join(SEP));
	}

	return `${lines.join("\n")}\n`;
}
