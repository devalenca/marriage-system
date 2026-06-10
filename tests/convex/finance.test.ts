import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

const TODAY = "2026-06-09";

async function seed(t: ReturnType<typeof setupTest>) {
	await t.mutation(api.settings.save, {
		coupleNames: "Gabriel & Alice",
		weddingDate: "2027-06-12",
		budgetGoalCents: 5500000,
	});

	const espacoId = await t.mutation(api.vendors.create, {
		name: "Espaço Jardim",
		category: "espaco",
		status: "fechado",
		contractedCents: 1800000,
		paymentMethod: "PIX",
	});
	const entradaId = await t.mutation(api.payments.create, {
		vendorId: espacoId,
		description: "Entrada",
		amountCents: 600000,
		dueDate: "2026-05-01",
		paymentMethod: "PIX",
	});
	await t.mutation(api.payments.markPaid, {
		id: entradaId,
		paidDate: "2026-05-01",
	});
	await t.mutation(api.payments.create, {
		vendorId: espacoId,
		description: "Parcela 1/2",
		amountCents: 600000,
		dueDate: "2026-07-10",
		paymentMethod: "Cartão de crédito",
	});

	// attach a receipt to the paid entrada
	const storageId = await t.run(async (ctx) =>
		ctx.storage.store(new Blob(["ok"], { type: "image/png" })),
	);
	await t.mutation(api.attachments.create, {
		storageId,
		name: "comprovante.png",
		kind: "comprovante",
		paymentId: entradaId,
	});

	return { espacoId };
}

describe("finance.overview", () => {
	it("aggregates totals, methods, paid ledger, pending and installments", async () => {
		const t = setupTest();
		await seed(t);

		const o = await t.query(api.finance.overview, { today: TODAY });

		expect(o.finance.goalCents).toBe(5500000);
		expect(o.finance.paidCents).toBe(600000);

		// by method: PIX (600k paid) + Cartão de crédito (600k pending)
		const pix = o.byMethod.find((m) => m.method === "PIX");
		expect(pix?.paidCents).toBe(600000);
		const cartao = o.byMethod.find((m) => m.method === "Cartão de crédito");
		expect(cartao?.pendingCents).toBe(600000);

		// paid ledger with receipt flag
		expect(o.paid).toHaveLength(1);
		expect(o.paid[0]).toMatchObject({
			description: "Entrada",
			vendorName: "Espaço Jardim",
			hasReceipt: true,
		});

		// pending sorted
		expect(o.pending).toHaveLength(1);
		expect(o.pending[0]?.description).toBe("Parcela 1/2");

		// installments summary for the contracted vendor
		expect(o.installments).toHaveLength(1);
		expect(o.installments[0]).toMatchObject({
			vendorName: "Espaço Jardim",
			contractedCents: 1800000,
			paidCents: 600000,
			remainingInstallments: 1,
			nextDueDate: "2026-07-10",
		});
	});

	it("returns empty structures with no data", async () => {
		const t = setupTest();
		const o = await t.query(api.finance.overview, { today: TODAY });
		expect(o.paid).toHaveLength(0);
		expect(o.byMethod).toHaveLength(0);
		expect(o.installments).toHaveLength(0);
	});
});

describe("finance.exportRows", () => {
	it("returns one row per payment with vendor and method", async () => {
		const t = setupTest();
		await seed(t);
		const rows = await t.query(api.finance.exportRows, {});
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			vendorName: "Espaço Jardim",
			category: "espaco",
		});
		expect(rows.some((r) => r.method === "Cartão de crédito")).toBe(true);
	});
});
