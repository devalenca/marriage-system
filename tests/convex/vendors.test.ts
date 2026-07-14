import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupWeddingScopedTest } from "./helpers";

describe("vendors.create / get / list", () => {
	it("creates a vendor and reads it back with financials", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.vendors.create, {
			name: "Espaço Jardim das Flores",
			category: "espaco",
			status: "pesquisando",
			estimateCents: 2000000,
			instagram: "@jardimdasflores",
		});

		const vendor = await asCoupleA.query(api.vendors.get, { id });
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

	it("stamps the caller's wedding on created vendors", async () => {
		const { asCoupleA, weddingA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.vendors.create, {
			name: "Buffet Sabor & Festa",
			category: "buffet",
			status: "pesquisando",
		});
		const vendor = await asCoupleA.query(api.vendors.get, { id });
		expect(vendor?.weddingId).toBe(weddingA);
	});

	it("rejects an empty name", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await expect(
			asCoupleA.mutation(api.vendors.create, {
				name: "   ",
				category: "buffet",
				status: "pesquisando",
			}),
		).rejects.toThrow();
	});

	it("lists vendors with their financials", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.vendors.create, {
			name: "Buffet Sabor & Festa",
			category: "buffet",
			status: "cotado",
			estimateCents: 3000000,
		});
		await asCoupleA.mutation(api.vendors.create, {
			name: "Foto Luz Estúdio",
			category: "fotografia",
			status: "pesquisando",
		});

		const list = await asCoupleA.query(api.vendors.list, {});
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
		const { asCoupleA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.vendors.create, {
			name: "DJ Brilho",
			category: "dj_banda",
			status: "negociando",
			estimateCents: 500000,
		});

		await asCoupleA.mutation(api.vendors.update, {
			id,
			status: "fechado",
			contractedCents: 450000,
			closedDate: "2026-06-09",
			paymentMethod: "PIX — entrada + 2x",
		});

		const vendor = await asCoupleA.query(api.vendors.get, { id });
		expect(vendor?.status).toBe("fechado");
		expect(vendor?.contractedCents).toBe(450000);
		expect(vendor?.closedDate).toBe("2026-06-09");
	});

	it("rejects a contracted status without a contracted value", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.vendors.create, {
			name: "DJ Brilho",
			category: "dj_banda",
			status: "negociando",
		});

		await expect(
			asCoupleA.mutation(api.vendors.update, { id, status: "fechado" }),
		).rejects.toThrow();

		await expect(
			asCoupleA.mutation(api.vendors.create, {
				name: "Buffet Sem Valor",
				category: "buffet",
				status: "fechado",
			}),
		).rejects.toThrow();
	});

	it("rejects an invalid closing date", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.vendors.create, {
			name: "DJ Brilho",
			category: "dj_banda",
			status: "negociando",
		});

		await expect(
			asCoupleA.mutation(api.vendors.update, { id, closedDate: "09/06/2026" }),
		).rejects.toThrow();
	});
});

describe("vendors.remove", () => {
	it("removes the vendor and its payments", async () => {
		const { t, asCoupleA, weddingA } = await setupWeddingScopedTest();
		const id = await asCoupleA.mutation(api.vendors.create, {
			name: "Doces da Vó",
			category: "doces_bolo",
			status: "fechado",
			contractedCents: 200000,
		});
		// Seeded directly to keep this test independent of the payments module.
		await t.run(async (ctx) => {
			await ctx.db.insert("payments", {
				weddingId: weddingA,
				vendorId: id,
				description: "Entrada",
				amountCents: 100000,
				dueDate: "2026-07-01",
				status: "pendente",
			});
		});

		await asCoupleA.mutation(api.vendors.remove, { id });

		expect(await asCoupleA.query(api.vendors.get, { id })).toBeNull();
		const orphans = await t.run(async (ctx) =>
			ctx.db
				.query("payments")
				.withIndex("by_vendor", (q) => q.eq("vendorId", id))
				.collect(),
		);
		expect(orphans).toHaveLength(0);
	});
});

describe("wedding isolation", () => {
	async function seedBothWeddings() {
		const setup = await setupWeddingScopedTest();
		const vendorA = await setup.asCoupleA.mutation(api.vendors.create, {
			name: "Buffet da Ana",
			category: "buffet",
			status: "pesquisando",
		});
		const vendorB = await setup.asCoupleB.mutation(api.vendors.create, {
			name: "Buffet da Carla",
			category: "buffet",
			status: "pesquisando",
		});
		return { ...setup, vendorA, vendorB };
	}

	it("list only returns the caller's wedding vendors", async () => {
		const { asCoupleA, asCoupleB } = await seedBothWeddings();

		const listA = await asCoupleA.query(api.vendors.list, {});
		expect(listA.map((v) => v.name)).toEqual(["Buffet da Ana"]);

		const listB = await asCoupleB.query(api.vendors.list, {});
		expect(listB.map((v) => v.name)).toEqual(["Buffet da Carla"]);
	});

	it("get returns null for another wedding's vendor, like a missing row", async () => {
		const { asCoupleA, vendorA, vendorB } = await seedBothWeddings();

		expect(await asCoupleA.query(api.vendors.get, { id: vendorB })).toBeNull();

		// Same behavior as a genuinely missing row.
		await asCoupleA.mutation(api.vendors.remove, { id: vendorA });
		expect(await asCoupleA.query(api.vendors.get, { id: vendorA })).toBeNull();
	});

	it("update rejects another wedding's vendor exactly like a missing row", async () => {
		const { asCoupleA, asCoupleB, vendorA, vendorB } = await seedBothWeddings();

		await expect(
			asCoupleA.mutation(api.vendors.update, { id: vendorB, name: "Hackeado" }),
		).rejects.toThrow("Fornecedor não encontrado");

		await asCoupleA.mutation(api.vendors.remove, { id: vendorA });
		await expect(
			asCoupleA.mutation(api.vendors.update, { id: vendorA, name: "Sumido" }),
		).rejects.toThrow("Fornecedor não encontrado");

		// The foreign vendor is untouched.
		const vendor = await asCoupleB.query(api.vendors.get, { id: vendorB });
		expect(vendor?.name).toBe("Buffet da Carla");
	});

	it("remove rejects another wedding's vendor exactly like a missing row", async () => {
		const { asCoupleA, asCoupleB, vendorA, vendorB } = await seedBothWeddings();

		await expect(
			asCoupleA.mutation(api.vendors.remove, { id: vendorB }),
		).rejects.toThrow("Fornecedor não encontrado");

		await asCoupleA.mutation(api.vendors.remove, { id: vendorA });
		await expect(
			asCoupleA.mutation(api.vendors.remove, { id: vendorA }),
		).rejects.toThrow("Fornecedor não encontrado");

		// The foreign vendor is untouched.
		expect(
			await asCoupleB.query(api.vendors.get, { id: vendorB }),
		).not.toBeNull();
	});
});
