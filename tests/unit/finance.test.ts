import { describe, expect, it } from "vitest";
import {
	categoryBreakdown,
	classifyPaymentDue,
	financialSummary,
	generateInstallments,
	paymentIsDueSoon,
	paymentIsOverdue,
	suggestVendorStatus,
	vendorFinancials,
} from "@/lib/domain/finance";

const TODAY = "2026-06-09";

describe("generateInstallments", () => {
	it("generates down payment plus monthly installments", () => {
		const plan = generateInstallments({
			totalCents: 1000000, // R$ 10.000,00
			downPaymentCents: 400000, // R$ 4.000,00
			installmentsCount: 3,
			downPaymentDate: "2026-06-10",
			firstInstallmentDate: "2026-07-10",
		});

		expect(plan).toEqual([
			{
				description: "Entrada",
				amountCents: 400000,
				dueDate: "2026-06-10",
				isDownPayment: true,
			},
			{
				description: "Parcela 1/3",
				amountCents: 200000,
				dueDate: "2026-07-10",
				isDownPayment: false,
			},
			{
				description: "Parcela 2/3",
				amountCents: 200000,
				dueDate: "2026-08-10",
				isDownPayment: false,
			},
			{
				description: "Parcela 3/3",
				amountCents: 200000,
				dueDate: "2026-09-10",
				isDownPayment: false,
			},
		]);
	});

	it("distributes rounding remainder on the first installments, sum stays exact", () => {
		const plan = generateInstallments({
			totalCents: 100000, // R$ 1.000,00 in 3 → 33334 + 33333 + 33333
			downPaymentCents: 0,
			installmentsCount: 3,
			firstInstallmentDate: "2026-07-01",
		});

		expect(plan.map((p) => p.amountCents)).toEqual([33334, 33333, 33333]);
		expect(plan.reduce((sum, p) => sum + p.amountCents, 0)).toBe(100000);
	});

	it("supports a single payment with no down payment", () => {
		const plan = generateInstallments({
			totalCents: 500000,
			downPaymentCents: 0,
			installmentsCount: 1,
			firstInstallmentDate: "2026-08-15",
		});

		expect(plan).toEqual([
			{
				description: "Parcela única",
				amountCents: 500000,
				dueDate: "2026-08-15",
				isDownPayment: false,
			},
		]);
	});

	it("supports down payment only (zero installments, no first installment date)", () => {
		const plan = generateInstallments({
			totalCents: 300000,
			downPaymentCents: 300000,
			installmentsCount: 0,
			downPaymentDate: "2026-06-20",
		});

		expect(plan).toEqual([
			{
				description: "Entrada",
				amountCents: 300000,
				dueDate: "2026-06-20",
				isDownPayment: true,
			},
		]);
	});

	it("rejects a down payment larger than the total", () => {
		expect(() =>
			generateInstallments({
				totalCents: 100000,
				downPaymentCents: 200000,
				installmentsCount: 2,
				firstInstallmentDate: "2026-07-01",
			}),
		).toThrow();
	});
});

describe("payment flags", () => {
	const pending = (dueDate: string) => ({
		status: "pendente" as const,
		dueDate,
	});

	it("pending payment past due is overdue", () => {
		expect(paymentIsOverdue(pending("2026-06-08"), TODAY)).toBe(true);
	});

	it("pending payment due today is not overdue", () => {
		expect(paymentIsOverdue(pending("2026-06-09"), TODAY)).toBe(false);
	});

	it("paid payment is never overdue", () => {
		expect(
			paymentIsOverdue({ status: "pago", dueDate: "2026-01-01" }, TODAY),
		).toBe(false);
	});

	it("pending payment within the next 14 days is due soon", () => {
		expect(paymentIsDueSoon(pending("2026-06-09"), TODAY)).toBe(true);
		expect(paymentIsDueSoon(pending("2026-06-23"), TODAY)).toBe(true);
	});

	it("payment beyond the window or already overdue is not due soon", () => {
		expect(paymentIsDueSoon(pending("2026-06-24"), TODAY)).toBe(false);
		expect(paymentIsDueSoon(pending("2026-06-08"), TODAY)).toBe(false);
	});

	it("classifyPaymentDue buckets into overdue, dueSoon and later", () => {
		expect(classifyPaymentDue({ dueDate: "2026-06-08" }, TODAY)).toBe(
			"overdue",
		);
		expect(classifyPaymentDue({ dueDate: "2026-06-09" }, TODAY)).toBe(
			"dueSoon",
		);
		expect(classifyPaymentDue({ dueDate: "2026-06-23" }, TODAY)).toBe(
			"dueSoon",
		);
		expect(classifyPaymentDue({ dueDate: "2026-06-24" }, TODAY)).toBe("later");
	});
});

describe("vendorFinancials", () => {
	it("computes paid, pending and remaining installments for a contracted vendor", () => {
		const result = vendorFinancials(
			{ status: "parcialmente_pago", contractedCents: 1000000 },
			[
				{ status: "pago", dueDate: "2026-05-10", amountCents: 400000 },
				{ status: "pendente", dueDate: "2026-07-10", amountCents: 300000 },
				{ status: "pendente", dueDate: "2026-08-10", amountCents: 300000 },
			],
		);

		expect(result).toEqual({
			paidCents: 400000,
			pendingCents: 600000,
			scheduledCents: 1000000,
			remainingInstallments: 2,
			progress: 0.4,
		});
	});

	it("falls back to scheduled payments when there is no contracted value", () => {
		const result = vendorFinancials({ status: "negociando" }, [
			{ status: "pendente", dueDate: "2026-07-01", amountCents: 50000 },
		]);

		expect(result.pendingCents).toBe(50000);
		expect(result.paidCents).toBe(0);
		expect(result.progress).toBe(0);
	});
});

describe("financialSummary", () => {
	const vendors = [
		{
			vendor: {
				status: "fechado" as const,
				category: "espaco" as const,
				estimateCents: 2000000,
				contractedCents: 1800000,
			},
			payments: [
				{
					status: "pago" as const,
					dueDate: "2026-05-01",
					amountCents: 600000,
				},
				{
					status: "pendente" as const,
					dueDate: "2026-06-15",
					amountCents: 600000,
				},
				{
					status: "pendente" as const,
					dueDate: "2026-06-01",
					amountCents: 600000,
				},
			],
		},
		{
			vendor: {
				status: "cotado" as const,
				category: "fotografia" as const,
				estimateCents: 800000,
			},
			payments: [],
		},
		{
			vendor: {
				status: "cancelado" as const,
				category: "buffet" as const,
				estimateCents: 3000000,
				contractedCents: 3000000,
			},
			payments: [],
		},
	];

	it("computes the six dashboard figures, excluding cancelled vendors", () => {
		const summary = financialSummary(5500000, vendors, TODAY);

		expect(summary.goalCents).toBe(5500000);
		// previsto: contracted 1.800.000 (espaço) + estimate 800.000 (foto)
		expect(summary.plannedCents).toBe(2600000);
		expect(summary.contractedCents).toBe(1800000);
		expect(summary.paidCents).toBe(600000);
		expect(summary.pendingCents).toBe(1200000);
		expect(summary.remainingCents).toBe(3700000);
	});

	it("computes budget consumption and remaining installments", () => {
		const summary = financialSummary(5500000, vendors, TODAY);

		expect(summary.percentConsumed).toBeCloseTo(1800000 / 5500000);
		expect(summary.remainingInstallments).toBe(2);
		expect(summary.overdueCount).toBe(1);
		expect(summary.dueSoonCount).toBe(1);
	});

	it("handles zero goal without dividing by zero", () => {
		const summary = financialSummary(0, [], TODAY);
		expect(summary.percentConsumed).toBe(0);
	});
});

describe("categoryBreakdown", () => {
	it("aggregates previsto/fechado/pago per category", () => {
		const rows = categoryBreakdown([
			{
				vendor: {
					status: "fechado" as const,
					category: "espaco" as const,
					contractedCents: 1800000,
				},
				payments: [
					{
						status: "pago" as const,
						dueDate: "2026-05-01",
						amountCents: 600000,
					},
				],
			},
			{
				vendor: {
					status: "pesquisando" as const,
					category: "espaco" as const,
					estimateCents: 500000,
				},
				payments: [],
			},
			{
				vendor: {
					status: "cancelado" as const,
					category: "buffet" as const,
					contractedCents: 9900000,
				},
				payments: [],
			},
		]);

		expect(rows).toEqual([
			{
				category: "espaco",
				plannedCents: 2300000,
				contractedCents: 1800000,
				paidCents: 600000,
				vendorCount: 2,
			},
		]);
	});
});

describe("suggestVendorStatus", () => {
	it("keeps pre-contract statuses untouched", () => {
		expect(suggestVendorStatus("negociando", 0, 1000000)).toBe("negociando");
		expect(suggestVendorStatus("cancelado", 500000, 1000000)).toBe("cancelado");
	});

	it("moves a closed vendor to parcialmente_pago after the first payment", () => {
		expect(suggestVendorStatus("fechado", 100000, 1000000)).toBe(
			"parcialmente_pago",
		);
	});

	it("moves to pago when fully paid", () => {
		expect(suggestVendorStatus("parcialmente_pago", 1000000, 1000000)).toBe(
			"pago",
		);
	});

	it("returns to fechado when payments are reverted", () => {
		expect(suggestVendorStatus("pago", 0, 1000000)).toBe("fechado");
	});
});
