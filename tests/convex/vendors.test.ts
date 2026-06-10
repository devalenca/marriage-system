import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "./helpers";

describe("vendors.create / get / list", () => {
	it("creates a vendor and reads it back with financials", async () => {
		const t = setupTest();
		const id = await t.mutation(api.vendors.create, {
			name: "Espaço Jardim das Flores",
			category: "espaco",
			status: "pesquisando",
			estimateCents: 2000000,
			instagram: "@jardimdasflores",
		});

		const vendor = await t.query(api.vendors.get, { id });
		expect(vendor).toMatchObject({
			name: "Espaço Jardim das Flores",
			category: "espaco",
			status: "pesquisando",
			estimateCents: 2000000,
		});
		expect(vendor?.financials).toEqual({
			paidCents: 0,
			pendingCents: 0,
			scheduledCents: 0,
			remainingInstallments: 0,
			progress: 0,
		});
	});

	it("rejects an empty name", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.vendors.create, {
				name: "   ",
				category: "buffet",
				status: "pesquisando",
			}),
		).rejects.toThrow();
	});

	it("lists vendors with their financials", async () => {
		const t = setupTest();
		await t.mutation(api.vendors.create, {
			name: "Buffet Sabor & Festa",
			category: "buffet",
			status: "cotado",
			estimateCents: 3000000,
		});
		await t.mutation(api.vendors.create, {
			name: "Foto Luz Estúdio",
			category: "fotografia",
			status: "pesquisando",
		});

		const list = await t.query(api.vendors.list, {});
		expect(list).toHaveLength(2);
		expect(list.map((v) => v.name).sort()).toEqual([
			"Buffet Sabor & Festa",
			"Foto Luz Estúdio",
		]);
		expect(list[0]?.financials).toBeDefined();
	});
});

describe("vendors.update", () => {
	it("updates contract fields when closing a deal", async () => {
		const t = setupTest();
		const id = await t.mutation(api.vendors.create, {
			name: "DJ Brilho",
			category: "dj_banda",
			status: "negociando",
			estimateCents: 500000,
		});

		await t.mutation(api.vendors.update, {
			id,
			status: "fechado",
			contractedCents: 450000,
			closedDate: "2026-06-09",
			paymentMethod: "PIX — entrada + 2x",
		});

		const vendor = await t.query(api.vendors.get, { id });
		expect(vendor?.status).toBe("fechado");
		expect(vendor?.contractedCents).toBe(450000);
		expect(vendor?.closedDate).toBe("2026-06-09");
	});

	it("rejects a contracted status without a contracted value", async () => {
		const t = setupTest();
		const id = await t.mutation(api.vendors.create, {
			name: "DJ Brilho",
			category: "dj_banda",
			status: "negociando",
		});

		await expect(
			t.mutation(api.vendors.update, { id, status: "fechado" }),
		).rejects.toThrow();

		await expect(
			t.mutation(api.vendors.create, {
				name: "Buffet Sem Valor",
				category: "buffet",
				status: "fechado",
			}),
		).rejects.toThrow();
	});

	it("rejects an invalid closing date", async () => {
		const t = setupTest();
		const id = await t.mutation(api.vendors.create, {
			name: "DJ Brilho",
			category: "dj_banda",
			status: "negociando",
		});

		await expect(
			t.mutation(api.vendors.update, { id, closedDate: "09/06/2026" }),
		).rejects.toThrow();
	});
});

describe("vendors.remove", () => {
	it("removes the vendor and its payments", async () => {
		const t = setupTest();
		const id = await t.mutation(api.vendors.create, {
			name: "Doces da Vó",
			category: "doces_bolo",
			status: "fechado",
			contractedCents: 200000,
		});
		await t.mutation(api.payments.create, {
			vendorId: id,
			description: "Entrada",
			amountCents: 100000,
			dueDate: "2026-07-01",
		});

		await t.mutation(api.vendors.remove, { id });

		expect(await t.query(api.vendors.get, { id })).toBeNull();
		const orphans = await t.run(async (ctx) =>
			ctx.db
				.query("payments")
				.withIndex("by_vendor", (q) => q.eq("vendorId", id))
				.collect(),
		);
		expect(orphans).toHaveLength(0);
	});
});
