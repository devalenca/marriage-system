import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { setupWeddingScopedTest } from "./helpers";

type Setup = Awaited<ReturnType<typeof setupWeddingScopedTest>>;

// Vendors are seeded directly (stamped with the wedding) so this suite does
// not depend on the vendors module's public API.
async function createClosedVendor(t: Setup["t"], weddingId: Id<"weddings">) {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("vendors", {
			name: "Buffet Sabor & Festa",
			category: "buffet",
			status: "fechado",
			contractedCents: 1000000,
			weddingId,
		});
	});
}

async function getVendor(t: Setup["t"], vendorId: Id<"vendors">) {
	return await t.run(async (ctx) => await ctx.db.get(vendorId));
}

describe("payments.create", () => {
	it("creates a pending payment", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);

		const id = await asCoupleA.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
			isDownPayment: true,
		});

		const payments = await asCoupleA.query(api.payments.listByVendor, {
			vendorId,
		});
		expect(payments).toHaveLength(1);
		expect(payments[0]).toMatchObject({
			_id: id,
			description: "Entrada",
			amountCents: 300000,
			status: "pendente",
		});
	});

	it("rejects non-positive amounts and invalid dates", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);

		await expect(
			asCoupleA.mutation(api.payments.create, {
				vendorId,
				description: "Parcela",
				amountCents: 0,
				dueDate: "2026-07-01",
			}),
		).rejects.toThrow();

		await expect(
			asCoupleA.mutation(api.payments.create, {
				vendorId,
				description: "Parcela",
				amountCents: 1000,
				dueDate: "01/07/2026",
			}),
		).rejects.toThrow();
	});

	it("rejects a vendor of another wedding exactly like a missing one", async () => {
		const { t, weddingB, asCoupleA } = await setupWeddingScopedTest();
		const foreignVendorId = await createClosedVendor(t, weddingB);

		await expect(
			asCoupleA.mutation(api.payments.create, {
				vendorId: foreignVendorId,
				description: "Entrada",
				amountCents: 300000,
				dueDate: "2026-07-01",
			}),
		).rejects.toThrow("Fornecedor não encontrado");
	});
});

describe("payments.createSchedule", () => {
	it("creates entrada + parcelas from the plan and replaces pending ones on re-run", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);

		await asCoupleA.mutation(api.payments.createSchedule, {
			vendorId,
			totalCents: 1000000,
			downPaymentCents: 400000,
			installmentsCount: 2,
			downPaymentDate: "2026-06-10",
			firstInstallmentDate: "2026-07-10",
		});

		let payments = await asCoupleA.query(api.payments.listByVendor, {
			vendorId,
		});
		expect(payments.map((p) => p.description)).toEqual([
			"Entrada",
			"Parcela 1/2",
			"Parcela 2/2",
		]);

		// Re-running replaces the pending schedule instead of duplicating it.
		await asCoupleA.mutation(api.payments.createSchedule, {
			vendorId,
			totalCents: 1000000,
			downPaymentCents: 0,
			installmentsCount: 4,
			firstInstallmentDate: "2026-07-15",
		});

		payments = await asCoupleA.query(api.payments.listByVendor, { vendorId });
		expect(payments).toHaveLength(4);
		expect(payments.every((p) => p.status === "pendente")).toBe(true);
	});

	it("keeps already-paid payments when regenerating", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);

		const paidId = await asCoupleA.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 400000,
			dueDate: "2026-06-01",
		});
		await asCoupleA.mutation(api.payments.markPaid, {
			id: paidId,
			paidDate: "2026-06-01",
		});

		await asCoupleA.mutation(api.payments.createSchedule, {
			vendorId,
			totalCents: 600000,
			downPaymentCents: 0,
			installmentsCount: 2,
			firstInstallmentDate: "2026-07-10",
		});

		const payments = await asCoupleA.query(api.payments.listByVendor, {
			vendorId,
		});
		expect(payments).toHaveLength(3);
		expect(payments.filter((p) => p.status === "pago")).toHaveLength(1);
	});

	it("rejects a vendor of another wedding exactly like a missing one", async () => {
		const { t, weddingB, asCoupleA } = await setupWeddingScopedTest();
		const foreignVendorId = await createClosedVendor(t, weddingB);

		await expect(
			asCoupleA.mutation(api.payments.createSchedule, {
				vendorId: foreignVendorId,
				totalCents: 1000000,
				downPaymentCents: 0,
				installmentsCount: 2,
				firstInstallmentDate: "2026-07-10",
			}),
		).rejects.toThrow("Fornecedor não encontrado");
	});
});

describe("payments.listByVendor", () => {
	it("returns [] for a vendor of another wedding, exactly like a missing one", async () => {
		const { t, weddingB, asCoupleA, asCoupleB } =
			await setupWeddingScopedTest();
		const foreignVendorId = await createClosedVendor(t, weddingB);
		await asCoupleB.mutation(api.payments.create, {
			vendorId: foreignVendorId,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});

		const payments = await asCoupleA.query(api.payments.listByVendor, {
			vendorId: foreignVendorId,
		});
		expect(payments).toEqual([]);

		// A missing vendor behaves identically.
		const goneVendorId = await createClosedVendor(t, weddingB);
		await t.run(async (ctx) => await ctx.db.delete(goneVendorId));
		const forMissing = await asCoupleB.query(api.payments.listByVendor, {
			vendorId: goneVendorId,
		});
		expect(forMissing).toEqual([]);
	});
});

describe("payments.markPaid / markPending", () => {
	it("marks a payment as paid and auto-updates the vendor status", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);
		const id = await asCoupleA.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});

		await asCoupleA.mutation(api.payments.markPaid, {
			id,
			paidDate: "2026-06-09",
		});

		const payment = (
			await asCoupleA.query(api.payments.listByVendor, { vendorId })
		)[0];
		expect(payment?.status).toBe("pago");
		expect(payment?.paidDate).toBe("2026-06-09");

		const vendor = await getVendor(t, vendorId);
		expect(vendor?.status).toBe("parcialmente_pago");
	});

	it("moves the vendor to pago when fully paid, and back when reverted", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);
		const id = await asCoupleA.mutation(api.payments.create, {
			vendorId,
			description: "Parcela única",
			amountCents: 1000000,
			dueDate: "2026-07-01",
		});

		await asCoupleA.mutation(api.payments.markPaid, {
			id,
			paidDate: "2026-06-09",
		});
		let vendor = await getVendor(t, vendorId);
		expect(vendor?.status).toBe("pago");

		await asCoupleA.mutation(api.payments.markPending, { id });
		vendor = await getVendor(t, vendorId);
		expect(vendor?.status).toBe("fechado");

		const payment = (
			await asCoupleA.query(api.payments.listByVendor, { vendorId })
		)[0];
		expect(payment?.status).toBe("pendente");
		expect(payment?.paidDate).toBeUndefined();
	});

	it("rejects payments of another wedding exactly like missing ones", async () => {
		const { t, weddingB, asCoupleA, asCoupleB } =
			await setupWeddingScopedTest();
		const foreignVendorId = await createClosedVendor(t, weddingB);
		const foreignPaymentId = await asCoupleB.mutation(api.payments.create, {
			vendorId: foreignVendorId,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});

		await expect(
			asCoupleA.mutation(api.payments.markPaid, { id: foreignPaymentId }),
		).rejects.toThrow("Pagamento não encontrado");
		await expect(
			asCoupleA.mutation(api.payments.markPending, { id: foreignPaymentId }),
		).rejects.toThrow("Pagamento não encontrado");
	});
});

describe("payments.update", () => {
	it("updates payment fields", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);
		const id = await asCoupleA.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});

		await asCoupleA.mutation(api.payments.update, {
			id,
			description: "Sinal",
			amountCents: 250000,
		});

		const payment = (
			await asCoupleA.query(api.payments.listByVendor, { vendorId })
		)[0];
		expect(payment).toMatchObject({
			description: "Sinal",
			amountCents: 250000,
		});
	});

	it("rejects a payment of another wedding exactly like a missing one", async () => {
		const { t, weddingB, asCoupleA, asCoupleB } =
			await setupWeddingScopedTest();
		const foreignVendorId = await createClosedVendor(t, weddingB);
		const foreignPaymentId = await asCoupleB.mutation(api.payments.create, {
			vendorId: foreignVendorId,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});

		await expect(
			asCoupleA.mutation(api.payments.update, {
				id: foreignPaymentId,
				description: "Hackeado",
			}),
		).rejects.toThrow("Pagamento não encontrado");
	});
});

describe("payments.remove", () => {
	it("removes a payment and recomputes the vendor status", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await createClosedVendor(t, weddingA);
		const id = await asCoupleA.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		await asCoupleA.mutation(api.payments.markPaid, {
			id,
			paidDate: "2026-06-09",
		});

		await asCoupleA.mutation(api.payments.remove, { id });

		const payments = await asCoupleA.query(api.payments.listByVendor, {
			vendorId,
		});
		expect(payments).toHaveLength(0);
		const vendor = await getVendor(t, vendorId);
		expect(vendor?.status).toBe("fechado");
	});

	it("rejects a payment of another wedding exactly like a missing one", async () => {
		const { t, weddingB, asCoupleA, asCoupleB } =
			await setupWeddingScopedTest();
		const foreignVendorId = await createClosedVendor(t, weddingB);
		const foreignPaymentId = await asCoupleB.mutation(api.payments.create, {
			vendorId: foreignVendorId,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});

		await expect(
			asCoupleA.mutation(api.payments.remove, { id: foreignPaymentId }),
		).rejects.toThrow("Pagamento não encontrado");

		// The foreign payment is untouched.
		const stillThere = await asCoupleB.query(api.payments.listByVendor, {
			vendorId: foreignVendorId,
		});
		expect(stillThere).toHaveLength(1);
	});
});
