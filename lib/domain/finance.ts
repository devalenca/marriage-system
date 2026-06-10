// Pure financial domain logic. No Convex imports — everything here is
// unit-testable and shared by backend functions and UI.

import type { PaymentStatus, VendorCategory, VendorStatus } from "./categories";
import { CONTRACTED_STATUSES, PAYMENT_METHOD_FALLBACK } from "./categories";
import { addMonthsISO, daysBetween } from "./dates";

export const DUE_SOON_WINDOW_DAYS = 14;

export interface PaymentSnapshot {
	status: PaymentStatus;
	dueDate: string;
	amountCents: number;
	/** Free-text payment method (e.g. "PIX", "Cartão 3x"). */
	paymentMethod?: string;
}

export interface VendorSnapshot {
	status: VendorStatus;
	category?: VendorCategory;
	estimateCents?: number;
	contractedCents?: number;
}

export interface VendorWithPayments {
	vendor: VendorSnapshot;
	payments: PaymentSnapshot[];
}

type PaymentFlagInput = Pick<PaymentSnapshot, "status" | "dueDate">;

export function sumPaidCents(
	payments: Pick<PaymentSnapshot, "status" | "amountCents">[],
): number {
	return payments
		.filter((p) => p.status === "pago")
		.reduce((sum, p) => sum + p.amountCents, 0);
}

export type PaymentDueClass = "overdue" | "dueSoon" | "later";

/** Buckets a pending payment relative to today (overdue / due soon / later). */
export function classifyPaymentDue(
	payment: Pick<PaymentSnapshot, "dueDate">,
	todayISO: string,
	windowDays: number = DUE_SOON_WINDOW_DAYS,
): PaymentDueClass {
	const days = daysBetween(todayISO, payment.dueDate);
	if (days < 0) return "overdue";
	if (days <= windowDays) return "dueSoon";
	return "later";
}

export function paymentIsOverdue(
	payment: PaymentFlagInput,
	todayISO: string,
): boolean {
	return (
		payment.status === "pendente" && daysBetween(todayISO, payment.dueDate) < 0
	);
}

export function paymentIsDueSoon(
	payment: PaymentFlagInput,
	todayISO: string,
	windowDays: number = DUE_SOON_WINDOW_DAYS,
): boolean {
	if (payment.status !== "pendente") return false;
	const days = daysBetween(todayISO, payment.dueDate);
	return days >= 0 && days <= windowDays;
}

function isContracted(vendor: VendorSnapshot): boolean {
	return CONTRACTED_STATUSES.includes(vendor.status);
}

function isActive(vendor: VendorSnapshot): boolean {
	return vendor.status !== "cancelado";
}

/** The value a vendor is expected to cost: contracted when known, else estimate. */
function plannedCentsOf(vendor: VendorSnapshot): number {
	return vendor.contractedCents ?? vendor.estimateCents ?? 0;
}

export interface VendorFinancials {
	paidCents: number;
	pendingCents: number;
	scheduledCents: number;
	remainingInstallments: number;
	/** Paid over contracted, 0..1 (0 when nothing contracted). */
	progress: number;
}

export function vendorFinancials(
	vendor: Pick<VendorSnapshot, "status" | "contractedCents">,
	payments: PaymentSnapshot[],
): VendorFinancials {
	const paidCents = sumPaidCents(payments);
	const scheduledCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
	const pendingScheduledCents = scheduledCents - paidCents;

	const pendingCents =
		vendor.contractedCents !== undefined
			? Math.max(vendor.contractedCents - paidCents, 0)
			: pendingScheduledCents;

	return {
		paidCents,
		pendingCents,
		scheduledCents,
		remainingInstallments: payments.filter((p) => p.status === "pendente")
			.length,
		progress:
			vendor.contractedCents && vendor.contractedCents > 0
				? Math.min(paidCents / vendor.contractedCents, 1)
				: 0,
	};
}

export interface FinancialSummary {
	goalCents: number;
	/** Previsto: contracted value when known, else estimate, across active vendors. */
	plannedCents: number;
	/** Fechado: sum of contracted values of contracted vendors. */
	contractedCents: number;
	/** Pago: sum of paid payments of active vendors. */
	paidCents: number;
	/** Pendente: contracted − paid. */
	pendingCents: number;
	/** Saldo restante: goal − contracted. */
	remainingCents: number;
	/** Fechado ÷ meta, 0 when there is no goal. */
	percentConsumed: number;
	remainingInstallments: number;
	overdueCount: number;
	dueSoonCount: number;
}

export function financialSummary(
	goalCents: number,
	items: VendorWithPayments[],
	todayISO: string,
): FinancialSummary {
	const active = items.filter(({ vendor }) => isActive(vendor));

	let plannedCents = 0;
	let contractedCents = 0;
	let paidCents = 0;
	let remainingInstallments = 0;
	let overdueCount = 0;
	let dueSoonCount = 0;

	for (const { vendor, payments } of active) {
		plannedCents += plannedCentsOf(vendor);
		if (isContracted(vendor)) {
			contractedCents += vendor.contractedCents ?? 0;
		}
		for (const payment of payments) {
			if (payment.status === "pago") paidCents += payment.amountCents;
			if (payment.status === "pendente") remainingInstallments += 1;
			if (paymentIsOverdue(payment, todayISO)) overdueCount += 1;
			if (paymentIsDueSoon(payment, todayISO)) dueSoonCount += 1;
		}
	}

	return {
		goalCents,
		plannedCents,
		contractedCents,
		paidCents,
		pendingCents: Math.max(contractedCents - paidCents, 0),
		remainingCents: goalCents - contractedCents,
		percentConsumed: goalCents > 0 ? contractedCents / goalCents : 0,
		remainingInstallments,
		overdueCount,
		dueSoonCount,
	};
}

export interface CategoryBreakdownRow {
	category: VendorCategory;
	plannedCents: number;
	contractedCents: number;
	paidCents: number;
	vendorCount: number;
}

export function categoryBreakdown(
	items: VendorWithPayments[],
): CategoryBreakdownRow[] {
	const byCategory = new Map<VendorCategory, CategoryBreakdownRow>();

	for (const { vendor, payments } of items) {
		if (!isActive(vendor) || !vendor.category) continue;
		const row = byCategory.get(vendor.category) ?? {
			category: vendor.category,
			plannedCents: 0,
			contractedCents: 0,
			paidCents: 0,
			vendorCount: 0,
		};

		row.plannedCents += plannedCentsOf(vendor);
		if (isContracted(vendor))
			row.contractedCents += vendor.contractedCents ?? 0;
		row.paidCents += sumPaidCents(payments);
		row.vendorCount += 1;

		byCategory.set(vendor.category, row);
	}

	return [...byCategory.values()].sort(
		(a, b) => b.plannedCents - a.plannedCents,
	);
}

export interface PaymentMethodBreakdownRow {
	method: string;
	paidCents: number;
	pendingCents: number;
	totalCents: number;
	count: number;
}

/** Aggregates payments by their (free-text) payment method, active vendors only. */
export function paymentMethodBreakdown(
	items: VendorWithPayments[],
): PaymentMethodBreakdownRow[] {
	const byMethod = new Map<string, PaymentMethodBreakdownRow>();

	for (const { vendor, payments } of items) {
		if (!isActive(vendor)) continue;
		for (const payment of payments) {
			const method = payment.paymentMethod?.trim() || PAYMENT_METHOD_FALLBACK;
			const row = byMethod.get(method) ?? {
				method,
				paidCents: 0,
				pendingCents: 0,
				totalCents: 0,
				count: 0,
			};
			if (payment.status === "pago") row.paidCents += payment.amountCents;
			else row.pendingCents += payment.amountCents;
			row.totalCents += payment.amountCents;
			row.count += 1;
			byMethod.set(method, row);
		}
	}

	return [...byMethod.values()].sort((a, b) => b.totalCents - a.totalCents);
}

/**
 * Suggests the vendor status after payments change. Only contracted vendors
 * move automatically (fechado ⇄ parcialmente_pago ⇄ pago); everything else
 * is the user's call.
 */
export function suggestVendorStatus(
	current: VendorStatus,
	paidCents: number,
	contractedCents: number,
): VendorStatus {
	if (!CONTRACTED_STATUSES.includes(current)) return current;
	if (contractedCents > 0 && paidCents >= contractedCents) return "pago";
	if (paidCents > 0) return "parcialmente_pago";
	return "fechado";
}

export interface InstallmentPlanInput {
	totalCents: number;
	downPaymentCents: number;
	installmentsCount: number;
	/** Required when downPaymentCents > 0. */
	downPaymentDate?: string;
	/** Required when there is a remainder to split into installments. */
	firstInstallmentDate?: string;
}

export interface PlannedPayment {
	description: string;
	amountCents: number;
	dueDate: string;
	isDownPayment: boolean;
}

/**
 * Generates the payment schedule for a contract: optional down payment plus
 * N monthly installments. Centavo remainders go to the first installments so
 * the sum always matches the total exactly.
 */
export function generateInstallments(
	input: InstallmentPlanInput,
): PlannedPayment[] {
	const {
		totalCents,
		downPaymentCents,
		installmentsCount,
		downPaymentDate,
		firstInstallmentDate,
	} = input;

	if (totalCents <= 0) throw new Error("Total must be positive");
	if (downPaymentCents < 0) throw new Error("Down payment cannot be negative");
	if (downPaymentCents > totalCents)
		throw new Error("Down payment cannot exceed the total");
	if (installmentsCount < 0)
		throw new Error("Installments count cannot be negative");

	const remainderCents = totalCents - downPaymentCents;
	if (remainderCents > 0 && installmentsCount === 0)
		throw new Error("Remaining value needs at least one installment");

	const plan: PlannedPayment[] = [];

	if (downPaymentCents > 0) {
		if (!downPaymentDate)
			throw new Error("Down payment date is required when there is one");
		plan.push({
			description: "Entrada",
			amountCents: downPaymentCents,
			dueDate: downPaymentDate,
			isDownPayment: true,
		});
	}

	if (remainderCents > 0) {
		if (!firstInstallmentDate)
			throw new Error("First installment date is required");
		const base = Math.floor(remainderCents / installmentsCount);
		const extra = remainderCents % installmentsCount;

		for (let i = 0; i < installmentsCount; i++) {
			plan.push({
				description:
					installmentsCount === 1
						? "Parcela única"
						: `Parcela ${i + 1}/${installmentsCount}`,
				amountCents: base + (i < extra ? 1 : 0),
				dueDate: addMonthsISO(firstInstallmentDate, i),
				isDownPayment: false,
			});
		}
	}

	return plan;
}
