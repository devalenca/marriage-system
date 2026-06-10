import { describe, expect, it } from "vitest";
import { paymentsToCsv } from "@/lib/domain/export";

describe("paymentsToCsv", () => {
	const rows = [
		{
			vendorName: "Espaço Jardim",
			category: "espaco" as const,
			description: "Entrada",
			method: "PIX",
			status: "pago" as const,
			dueDate: "2026-05-01",
			paidDate: "2026-05-01",
			amountCents: 600000,
		},
		{
			vendorName: "Buffet; Sabor",
			category: "buffet" as const,
			description: 'Parcela "1/2"',
			method: undefined,
			status: "pendente" as const,
			dueDate: "2026-07-10",
			paidDate: undefined,
			amountCents: 123456,
		},
	];

	it("emits a semicolon-separated header and one line per payment", () => {
		const csv = paymentsToCsv(rows);
		const lines = csv.trim().split("\n");
		expect(lines).toHaveLength(3);
		expect(lines[0]).toBe(
			"Fornecedor;Categoria;Descrição;Forma de pagamento;Status;Vencimento;Pago em;Valor",
		);
	});

	it("formats money pt-BR and dates dd/MM/yyyy", () => {
		const csv = paymentsToCsv(rows);
		const lines = csv.trim().split("\n");
		expect(lines[1]).toContain("Espaço");
		expect(lines[1]).toContain("PIX");
		expect(lines[1]).toContain("01/05/2026");
		expect(lines[1]).toContain("6.000,00");
	});

	it("escapes separators and quotes by wrapping the field in quotes", () => {
		const csv = paymentsToCsv(rows);
		const lines = csv.trim().split("\n");
		// "Buffet; Sabor" contains the separator → must be quoted
		expect(lines[2]).toContain('"Buffet; Sabor"');
		// embedded quotes are doubled
		expect(lines[2]).toContain('"Parcela ""1/2"""');
		expect(lines[2]).toContain("Outro");
		expect(lines[2]).toContain("1.234,56");
	});
});
