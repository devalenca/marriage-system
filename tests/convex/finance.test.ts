import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupWeddingScopedTest } from "./helpers";

const TODAY = "2026-06-09";

type Setup = Awaited<ReturnType<typeof setupWeddingScopedTest>>;

/**
 * Finance is read-only (no public mutations of its own), so rows are seeded
 * straight into the database with the weddingId stamped — the same shape the
 * vendors/payments/attachments mutations produce.
 */
async function seedWeddingA({ t, weddingA }: Setup) {
	return await t.run(async (ctx) => {
		const vendorId = await ctx.db.insert("vendors", {
			weddingId: weddingA,
			name: "Espaço Jardim",
			category: "espaco",
			status: "fechado",
			contractedCents: 1_800_000,
			paymentMethod: "PIX",
		});
		const entradaId = await ctx.db.insert("payments", {
			weddingId: weddingA,
			vendorId,
			description: "Entrada",
			amountCents: 600_000,
			dueDate: "2026-05-01",
			status: "pago",
			paidDate: "2026-05-01",
			paymentMethod: "PIX",
		});
		await ctx.db.insert("payments", {
			weddingId: weddingA,
			vendorId,
			description: "Parcela 1/2",
			amountCents: 600_000,
			dueDate: "2026-07-10",
			status: "pendente",
			paymentMethod: "Cartão de crédito",
		});
		// attach a receipt to the paid entrada
		const storageId = await ctx.storage.store(
			new Blob(["ok"], { type: "image/png" }),
		);
		await ctx.db.insert("attachments", {
			weddingId: weddingA,
			paymentId: entradaId,
			storageId,
			name: "comprovante.png",
			kind: "comprovante",
			uploadedAt: Date.now(),
		});
		return { vendorId };
	});
}

async function seedWeddingB({ t, weddingB }: Setup) {
	await t.run(async (ctx) => {
		const vendorId = await ctx.db.insert("vendors", {
			weddingId: weddingB,
			name: "Buffet Central",
			category: "buffet",
			status: "fechado",
			contractedCents: 2_000_000,
			paymentMethod: "Boleto",
		});
		await ctx.db.insert("payments", {
			weddingId: weddingB,
			vendorId,
			description: "Sinal buffet",
			amountCents: 1_000_000,
			dueDate: "2026-04-01",
			status: "pago",
			paidDate: "2026-04-01",
			paymentMethod: "Boleto",
		});
		await ctx.db.insert("payments", {
			weddingId: weddingB,
			vendorId,
			description: "Saldo buffet",
			amountCents: 1_000_000,
			dueDate: "2026-08-01",
			status: "pendente",
			paymentMethod: "Boleto",
		});
	});
}

describe("finance.overview", () => {
	it("aggregates totals, methods, paid ledger, pending and installments", async () => {
		const setup = await setupWeddingScopedTest();
		await seedWeddingA(setup);

		const o = await setup.asCoupleA.query(api.finance.overview, {
			today: TODAY,
		});

		// settings now come from the caller's wedding doc
		expect(o.settings?.coupleNames).toBe("Ana & Bruno");
		expect(o.finance.goalCents).toBe(5_000_000);
		expect(o.finance.paidCents).toBe(600_000);

		// by method: PIX (600k paid) + Cartão de crédito (600k pending)
		const pix = o.byMethod.find((m) => m.method === "PIX");
		expect(pix?.paidCents).toBe(600_000);
		const cartao = o.byMethod.find((m) => m.method === "Cartão de crédito");
		expect(cartao?.pendingCents).toBe(600_000);

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
			contractedCents: 1_800_000,
			paidCents: 600_000,
			remainingInstallments: 1,
			nextDueDate: "2026-07-10",
		});
	});

	it("returns empty structures with no data", async () => {
		const setup = await setupWeddingScopedTest();
		const o = await setup.asCoupleA.query(api.finance.overview, {
			today: TODAY,
		});
		expect(o.paid).toHaveLength(0);
		expect(o.byMethod).toHaveLength(0);
		expect(o.installments).toHaveLength(0);
		// the wedding doc itself still backs the settings/countdown block
		expect(o.settings?.weddingDate).toBe("2027-06-12");
		expect(o.countdownDays).not.toBeNull();
	});

	it("only aggregates the caller's wedding when another wedding has data", async () => {
		const setup = await setupWeddingScopedTest();
		await seedWeddingA(setup);
		await seedWeddingB(setup);

		const a = await setup.asCoupleA.query(api.finance.overview, {
			today: TODAY,
		});

		// totals unaffected by wedding B's 2M of payments
		expect(a.finance.goalCents).toBe(5_000_000);
		expect(a.finance.paidCents).toBe(600_000);
		expect(a.paid).toHaveLength(1);
		expect(a.pending).toHaveLength(1);
		expect(a.installments).toHaveLength(1);
		expect(a.installments[0]?.vendorName).toBe("Espaço Jardim");
		expect(a.byMethod.some((m) => m.method === "Boleto")).toBe(false);
		expect(a.settings?.coupleNames).toBe("Ana & Bruno");

		// and wedding B sees only its own rows
		const b = await setup.asCoupleB.query(api.finance.overview, {
			today: TODAY,
		});
		expect(b.finance.goalCents).toBe(8_000_000);
		expect(b.finance.paidCents).toBe(1_000_000);
		expect(b.paid).toHaveLength(1);
		expect(b.paid[0]?.vendorName).toBe("Buffet Central");
		expect(b.settings?.coupleNames).toBe("Carla & Diego");
	});
});

describe("finance.exportRows", () => {
	it("returns one row per payment with vendor and method", async () => {
		const setup = await setupWeddingScopedTest();
		await seedWeddingA(setup);
		const rows = await setup.asCoupleA.query(api.finance.exportRows, {});
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			vendorName: "Espaço Jardim",
			category: "espaco",
		});
		expect(rows.some((r) => r.method === "Cartão de crédito")).toBe(true);
	});

	it("only exports the caller's wedding rows", async () => {
		const setup = await setupWeddingScopedTest();
		await seedWeddingA(setup);
		await seedWeddingB(setup);
		const rows = await setup.asCoupleA.query(api.finance.exportRows, {});
		expect(rows).toHaveLength(2);
		expect(rows.every((r) => r.vendorName === "Espaço Jardim")).toBe(true);
	});
});
