import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

describe("payments.listPending", () => {
	it("lists pending payments with vendor names sorted by due date, skipping cancelled vendors", async () => {
		const t = setupTest();

		const espacoId = await t.mutation(api.vendors.create, {
			name: "Espaço Jardim",
			category: "espaco",
			status: "fechado",
			contractedCents: 1000000,
		});
		await t.mutation(api.payments.create, {
			vendorId: espacoId,
			description: "Parcela 2/2",
			amountCents: 300000,
			dueDate: "2026-08-10",
		});
		await t.mutation(api.payments.create, {
			vendorId: espacoId,
			description: "Parcela 1/2",
			amountCents: 300000,
			dueDate: "2026-07-10",
		});
		const paidId = await t.mutation(api.payments.create, {
			vendorId: espacoId,
			description: "Entrada",
			amountCents: 400000,
			dueDate: "2026-06-01",
		});
		await t.mutation(api.payments.markPaid, {
			id: paidId,
			paidDate: "2026-06-01",
		});

		const cancelledId = await t.mutation(api.vendors.create, {
			name: "Buffet Cancelado",
			category: "buffet",
			status: "fechado",
			contractedCents: 500000,
		});
		await t.mutation(api.payments.create, {
			vendorId: cancelledId,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});
		await t.mutation(api.vendors.update, {
			id: cancelledId,
			status: "cancelado",
		});

		const pending = await t.query(api.payments.listPending, {});

		expect(pending.map((p) => p.description)).toEqual([
			"Parcela 1/2",
			"Parcela 2/2",
		]);
		expect(pending[0]?.vendorName).toBe("Espaço Jardim");
	});
});
