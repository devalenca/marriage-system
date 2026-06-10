import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

async function createClosedVendor(t: ReturnType<typeof setupTest>) {
	return await t.mutation(api.vendors.create, {
		name: "Buffet Sabor & Festa",
		category: "buffet",
		status: "fechado",
		contractedCents: 1000000,
	});
}

describe("payments.create", () => {
	it("creates a pending payment", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);

		const id = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
			isDownPayment: true,
		});

		const payments = await t.query(api.payments.listByVendor, { vendorId });
		expect(payments).toHaveLength(1);
		expect(payments[0]).toMatchObject({
			_id: id,
			description: "Entrada",
			amountCents: 300000,
			status: "pendente",
		});
	});

	it("rejects non-positive amounts and invalid dates", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);

		await expect(
			t.mutation(api.payments.create, {
				vendorId,
				description: "Parcela",
				amountCents: 0,
				dueDate: "2026-07-01",
			}),
		).rejects.toThrow();

		await expect(
			t.mutation(api.payments.create, {
				vendorId,
				description: "Parcela",
				amountCents: 1000,
				dueDate: "01/07/2026",
			}),
		).rejects.toThrow();
	});
});

describe("payments.createSchedule", () => {
	it("creates entrada + parcelas from the plan and replaces pending ones on re-run", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);

		await t.mutation(api.payments.createSchedule, {
			vendorId,
			totalCents: 1000000,
			downPaymentCents: 400000,
			installmentsCount: 2,
			downPaymentDate: "2026-06-10",
			firstInstallmentDate: "2026-07-10",
		});

		let payments = await t.query(api.payments.listByVendor, { vendorId });
		expect(payments.map((p) => p.description)).toEqual([
			"Entrada",
			"Parcela 1/2",
			"Parcela 2/2",
		]);

		// Re-running replaces the pending schedule instead of duplicating it.
		await t.mutation(api.payments.createSchedule, {
			vendorId,
			totalCents: 1000000,
			downPaymentCents: 0,
			installmentsCount: 4,
			firstInstallmentDate: "2026-07-15",
		});

		payments = await t.query(api.payments.listByVendor, { vendorId });
		expect(payments).toHaveLength(4);
		expect(payments.every((p) => p.status === "pendente")).toBe(true);
	});

	it("keeps already-paid payments when regenerating", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);

		const paidId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 400000,
			dueDate: "2026-06-01",
		});
		await t.mutation(api.payments.markPaid, {
			id: paidId,
			paidDate: "2026-06-01",
		});

		await t.mutation(api.payments.createSchedule, {
			vendorId,
			totalCents: 600000,
			downPaymentCents: 0,
			installmentsCount: 2,
			firstInstallmentDate: "2026-07-10",
		});

		const payments = await t.query(api.payments.listByVendor, { vendorId });
		expect(payments).toHaveLength(3);
		expect(payments.filter((p) => p.status === "pago")).toHaveLength(1);
	});
});

describe("payments.markPaid / markPending", () => {
	it("marks a payment as paid and auto-updates the vendor status", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);
		const id = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});

		await t.mutation(api.payments.markPaid, { id, paidDate: "2026-06-09" });

		const payment = (await t.query(api.payments.listByVendor, { vendorId }))[0];
		expect(payment?.status).toBe("pago");
		expect(payment?.paidDate).toBe("2026-06-09");

		const vendor = await t.query(api.vendors.get, { id: vendorId });
		expect(vendor?.status).toBe("parcialmente_pago");
	});

	it("moves the vendor to pago when fully paid, and back when reverted", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);
		const id = await t.mutation(api.payments.create, {
			vendorId,
			description: "Parcela única",
			amountCents: 1000000,
			dueDate: "2026-07-01",
		});

		await t.mutation(api.payments.markPaid, { id, paidDate: "2026-06-09" });
		let vendor = await t.query(api.vendors.get, { id: vendorId });
		expect(vendor?.status).toBe("pago");

		await t.mutation(api.payments.markPending, { id });
		vendor = await t.query(api.vendors.get, { id: vendorId });
		expect(vendor?.status).toBe("fechado");

		const payment = (await t.query(api.payments.listByVendor, { vendorId }))[0];
		expect(payment?.status).toBe("pendente");
		expect(payment?.paidDate).toBeUndefined();
	});
});

describe("payments.remove", () => {
	it("removes a payment and recomputes the vendor status", async () => {
		const t = setupTest();
		const vendorId = await createClosedVendor(t);
		const id = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		await t.mutation(api.payments.markPaid, { id, paidDate: "2026-06-09" });

		await t.mutation(api.payments.remove, { id });

		const payments = await t.query(api.payments.listByVendor, { vendorId });
		expect(payments).toHaveLength(0);
		const vendor = await t.query(api.vendors.get, { id: vendorId });
		expect(vendor?.status).toBe("fechado");
	});
});
