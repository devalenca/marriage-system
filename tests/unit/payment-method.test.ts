import { describe, expect, it } from "vitest";
import { paymentMethodBreakdown } from "@/lib/domain/finance";

describe("paymentMethodBreakdown", () => {
	it("aggregates paid and pending by payment method, skipping cancelled vendors", () => {
		const rows = paymentMethodBreakdown([
			{
				vendor: { status: "parcialmente_pago", category: "espaco" },
				payments: [
					{
						status: "pago",
						dueDate: "2026-05-01",
						amountCents: 400000,
						paymentMethod: "PIX",
					},
					{
						status: "pendente",
						dueDate: "2026-07-01",
						amountCents: 300000,
						paymentMethod: "PIX",
					},
					{
						status: "pendente",
						dueDate: "2026-08-01",
						amountCents: 300000,
						paymentMethod: "Cartão de crédito",
					},
				],
			},
			{
				vendor: { status: "cancelado", category: "buffet" },
				payments: [
					{
						status: "pendente",
						dueDate: "2026-07-01",
						amountCents: 999999,
						paymentMethod: "boleto",
					},
				],
			},
		]);

		// sorted by total desc → PIX (700000) then Cartão de crédito (300000)
		expect(rows).toEqual([
			{
				method: "PIX",
				paidCents: 400000,
				pendingCents: 300000,
				totalCents: 700000,
				count: 2,
			},
			{
				method: "Cartão de crédito",
				paidCents: 0,
				pendingCents: 300000,
				totalCents: 300000,
				count: 1,
			},
		]);
	});

	it("buckets payments without a method as 'Outro'", () => {
		const rows = paymentMethodBreakdown([
			{
				vendor: { status: "fechado", category: "dj_banda" },
				payments: [
					{ status: "pendente", dueDate: "2026-07-01", amountCents: 50000 },
				],
			},
		]);
		expect(rows).toEqual([
			{
				method: "Outro",
				paidCents: 0,
				pendingCents: 50000,
				totalCents: 50000,
				count: 1,
			},
		]);
	});

	it("returns an empty array when there are no payments", () => {
		expect(paymentMethodBreakdown([])).toEqual([]);
	});
});
