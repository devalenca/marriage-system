import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { setupWeddingScopedTest } from "./helpers";

type Setup = Awaited<ReturnType<typeof setupWeddingScopedTest>>;

// Vendors are seeded directly (stamped with the wedding) so this suite does
// not depend on the vendors module's public API.
async function createClosedVendor(
	t: Setup["t"],
	weddingId: Id<"weddings">,
	fields: { name: string; category: "buffet" | "espaco" },
) {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("vendors", {
			name: fields.name,
			category: fields.category,
			status: "fechado",
			contractedCents: 1000000,
			weddingId,
		});
	});
}

describe("payments.listPending", () => {
	it("lists pending payments with vendor names sorted by due date, skipping cancelled vendors", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();

		const espacoId = await createClosedVendor(t, weddingA, {
			name: "Espaço Jardim",
			category: "espaco",
		});
		await asCoupleA.mutation(api.payments.create, {
			vendorId: espacoId,
			description: "Parcela 2/2",
			amountCents: 300000,
			dueDate: "2026-08-10",
		});
		await asCoupleA.mutation(api.payments.create, {
			vendorId: espacoId,
			description: "Parcela 1/2",
			amountCents: 300000,
			dueDate: "2026-07-10",
		});
		const paidId = await asCoupleA.mutation(api.payments.create, {
			vendorId: espacoId,
			description: "Entrada",
			amountCents: 400000,
			dueDate: "2026-06-01",
		});
		await asCoupleA.mutation(api.payments.markPaid, {
			id: paidId,
			paidDate: "2026-06-01",
		});

		const cancelledId = await createClosedVendor(t, weddingA, {
			name: "Buffet Cancelado",
			category: "buffet",
		});
		await asCoupleA.mutation(api.payments.create, {
			vendorId: cancelledId,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});
		await t.run(async (ctx) => {
			await ctx.db.patch(cancelledId, { status: "cancelado" });
		});

		const pending = await asCoupleA.query(api.payments.listPending, {});

		expect(pending.map((p) => p.description)).toEqual([
			"Parcela 1/2",
			"Parcela 2/2",
		]);
		expect(pending[0]?.vendorName).toBe("Espaço Jardim");
	});

	it("only returns the caller's wedding rows when another wedding has pending payments too", async () => {
		const { t, weddingA, weddingB, asCoupleA, asCoupleB } =
			await setupWeddingScopedTest();

		const vendorA = await createClosedVendor(t, weddingA, {
			name: "Espaço Jardim",
			category: "espaco",
		});
		await asCoupleA.mutation(api.payments.create, {
			vendorId: vendorA,
			description: "Parcela A",
			amountCents: 300000,
			dueDate: "2026-07-10",
		});

		const vendorB = await createClosedVendor(t, weddingB, {
			name: "Buffet do B",
			category: "buffet",
		});
		await asCoupleB.mutation(api.payments.create, {
			vendorId: vendorB,
			description: "Parcela B",
			amountCents: 200000,
			dueDate: "2026-07-05",
		});

		const pendingA = await asCoupleA.query(api.payments.listPending, {});
		expect(pendingA.map((p) => p.description)).toEqual(["Parcela A"]);
		expect(pendingA[0]?.vendorName).toBe("Espaço Jardim");

		const pendingB = await asCoupleB.query(api.payments.listPending, {});
		expect(pendingB.map((p) => p.description)).toEqual(["Parcela B"]);
	});
});
