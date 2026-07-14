import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { deleteAttachmentsFor } from "../../convex/attachments";
import { setupWeddingScopedTest } from "./helpers";

type Setup = Awaited<ReturnType<typeof setupWeddingScopedTest>>;

async function storeBlob(t: Setup["t"]) {
	return await t.run(async (ctx) =>
		ctx.storage.store(new Blob(["contract"], { type: "application/pdf" })),
	);
}

// Vendors/payments are seeded directly (stamped with the wedding) so this
// suite does not depend on those modules' own mutations.
async function seedVendor(
	t: Setup["t"],
	weddingId: Id<"weddings">,
	name = "Espaço Jardim",
) {
	return await t.run(async (ctx) =>
		ctx.db.insert("vendors", {
			weddingId,
			name,
			category: "espaco",
			status: "fechado",
			contractedCents: 1000000,
		}),
	);
}

async function seedPayment(
	t: Setup["t"],
	weddingId: Id<"weddings">,
	vendorId: Id<"vendors">,
	description = "Entrada",
) {
	return await t.run(async (ctx) =>
		ctx.db.insert("payments", {
			weddingId,
			vendorId,
			description,
			amountCents: 300000,
			dueDate: "2026-07-01",
			status: "pendente",
		}),
	);
}

describe("attachments.create / list", () => {
	it("attaches a contract to a vendor and lists it with a url", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const storageId = await storeBlob(t);

		await asCoupleA.mutation(api.attachments.create, {
			storageId,
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
			mimeType: "application/pdf",
			sizeBytes: 1234,
		});

		const list = await asCoupleA.query(api.attachments.listByVendor, {
			vendorId,
		});
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ name: "contrato.pdf", kind: "contrato" });
		expect(typeof list[0]?.url).toBe("string");
	});

	it("attaches a receipt to a payment", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const paymentId = await seedPayment(t, weddingA, vendorId);
		const storageId = await storeBlob(t);

		await asCoupleA.mutation(api.attachments.create, {
			storageId,
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		const list = await asCoupleA.query(api.attachments.listByPayment, {
			paymentId,
		});
		expect(list).toHaveLength(1);
		expect(list[0]?.kind).toBe("comprovante");
	});

	it("stamps new attachments with the caller's wedding", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const id = await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});

		const row = await t.run(async (ctx) => ctx.db.get(id));
		expect(row?.weddingId).toBe(weddingA);
	});

	it("requires exactly one of vendorId / paymentId", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const storageId = await storeBlob(t);

		await expect(
			asCoupleA.mutation(api.attachments.create, {
				storageId,
				name: "x",
				kind: "outro",
			}),
		).rejects.toThrow();

		const paymentId = await seedPayment(t, weddingA, vendorId);
		await expect(
			asCoupleA.mutation(api.attachments.create, {
				storageId,
				name: "x",
				kind: "outro",
				vendorId,
				paymentId,
			}),
		).rejects.toThrow();
	});
});

describe("attachments cascade delete", () => {
	it("deleteAttachmentsFor a payment deletes its attachments and blobs", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const paymentId = await seedPayment(t, weddingA, vendorId);
		await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "c.png",
			kind: "comprovante",
			paymentId,
		});

		await t.run(async (ctx) => {
			await deleteAttachmentsFor(ctx, { paymentId });
		});

		const remaining = await t.run(async (ctx) =>
			ctx.db.query("attachments").collect(),
		);
		expect(remaining).toHaveLength(0);
	});

	it("deleteAttachmentsFor a vendor deletes the vendor's attachments", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});

		await t.run(async (ctx) => {
			await deleteAttachmentsFor(ctx, { vendorId });
		});

		const remaining = await t.run(async (ctx) =>
			ctx.db.query("attachments").collect(),
		);
		expect(remaining).toHaveLength(0);
	});

	it("remove deletes a single attachment", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const id: Id<"attachments"> = await asCoupleA.mutation(
			api.attachments.create,
			{
				storageId: await storeBlob(t),
				name: "contrato.pdf",
				kind: "contrato",
				vendorId,
			},
		);

		await asCoupleA.mutation(api.attachments.remove, { id });
		const list = await asCoupleA.query(api.attachments.listByVendor, {
			vendorId,
		});
		expect(list).toHaveLength(0);
	});
});

describe("attachments.listAll", () => {
	it("enriches a vendor attachment with the vendor name", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});

		const list = await asCoupleA.query(api.attachments.listAll, {});
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({
			name: "contrato.pdf",
			kind: "contrato",
			source: { type: "vendor", vendorName: "Espaço Jardim" },
		});
		expect(typeof list[0]?.url).toBe("string");
	});

	it("enriches a payment attachment with payment description + vendor name", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const paymentId = await seedPayment(t, weddingA, vendorId);
		await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		const list = await asCoupleA.query(api.attachments.listAll, {});
		expect(list).toHaveLength(1);
		expect(list[0]?.source).toMatchObject({
			type: "payment",
			vendorName: "Espaço Jardim",
			paymentDescription: "Entrada",
		});
	});

	it("returns attachments newest-first across both sources", async () => {
		const { t, weddingA, asCoupleA } = await setupWeddingScopedTest();
		const vendorId = await seedVendor(t, weddingA);
		const paymentId = await seedPayment(t, weddingA, vendorId);
		await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});
		await asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		const list = await asCoupleA.query(api.attachments.listAll, {});
		expect(list).toHaveLength(2);
		expect(list.map((f) => f.name)).toEqual(
			expect.arrayContaining(["contrato.pdf", "comprovante.png"]),
		);
		expect(list[0]?.uploadedAt).toBeGreaterThanOrEqual(
			list[1]?.uploadedAt ?? 0,
		);
	});

	it("empty when no attachments", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const list = await asCoupleA.query(api.attachments.listAll, {});
		expect(list).toEqual([]);
	});
});

describe("attachments wedding isolation", () => {
	async function seedBothWeddings(s: Setup) {
		const vendorA = await seedVendor(s.t, s.weddingA, "Espaço Jardim");
		const vendorB = await seedVendor(s.t, s.weddingB, "Buffet Central");
		const paymentA = await seedPayment(s.t, s.weddingA, vendorA);
		const paymentB = await seedPayment(s.t, s.weddingB, vendorB, "Sinal");
		const attachmentA = await s.asCoupleA.mutation(api.attachments.create, {
			storageId: await storeBlob(s.t),
			name: "contrato-a.pdf",
			kind: "contrato",
			vendorId: vendorA,
		});
		const attachmentB = await s.asCoupleB.mutation(api.attachments.create, {
			storageId: await storeBlob(s.t),
			name: "contrato-b.pdf",
			kind: "contrato",
			vendorId: vendorB,
		});
		return { vendorA, vendorB, paymentA, paymentB, attachmentA, attachmentB };
	}

	it("listAll only returns the caller's wedding rows", async () => {
		const s = await setupWeddingScopedTest();
		await seedBothWeddings(s);

		const listA = await s.asCoupleA.query(api.attachments.listAll, {});
		expect(listA).toHaveLength(1);
		expect(listA[0]?.name).toBe("contrato-a.pdf");

		const listB = await s.asCoupleB.query(api.attachments.listAll, {});
		expect(listB).toHaveLength(1);
		expect(listB[0]?.name).toBe("contrato-b.pdf");
	});

	it("listByVendor treats another wedding's vendor exactly like a missing one", async () => {
		const s = await setupWeddingScopedTest();
		const { vendorB } = await seedBothWeddings(s);
		const missingVendorId = await s.t.run(async (ctx) => {
			const id = await ctx.db.insert("vendors", {
				weddingId: s.weddingA,
				name: "Fantasma",
				category: "espaco",
				status: "pesquisando",
			});
			await ctx.db.delete(id);
			return id;
		});

		const foreign = await s.asCoupleA.query(api.attachments.listByVendor, {
			vendorId: vendorB,
		});
		const missing = await s.asCoupleA.query(api.attachments.listByVendor, {
			vendorId: missingVendorId,
		});
		expect(foreign).toEqual(missing);
		expect(foreign).toEqual([]);
	});

	it("listByPayment treats another wedding's payment exactly like a missing one", async () => {
		const s = await setupWeddingScopedTest();
		const { vendorA, paymentB } = await seedBothWeddings(s);
		const missingPaymentId = await s.t.run(async (ctx) => {
			const id = await ctx.db.insert("payments", {
				weddingId: s.weddingA,
				vendorId: vendorA,
				description: "Fantasma",
				amountCents: 1,
				dueDate: "2026-07-01",
				status: "pendente",
			});
			await ctx.db.delete(id);
			return id;
		});

		const foreign = await s.asCoupleA.query(api.attachments.listByPayment, {
			paymentId: paymentB,
		});
		const missing = await s.asCoupleA.query(api.attachments.listByPayment, {
			paymentId: missingPaymentId,
		});
		expect(foreign).toEqual(missing);
		expect(foreign).toEqual([]);
	});

	it("create rejects another wedding's vendor exactly like a missing one", async () => {
		const s = await setupWeddingScopedTest();
		const { vendorB } = await seedBothWeddings(s);

		await expect(
			s.asCoupleA.mutation(api.attachments.create, {
				storageId: await storeBlob(s.t),
				name: "invasao.pdf",
				kind: "contrato",
				vendorId: vendorB,
			}),
		).rejects.toThrow("Fornecedor não encontrado");
	});

	it("create rejects another wedding's payment exactly like a missing one", async () => {
		const s = await setupWeddingScopedTest();
		const { paymentB } = await seedBothWeddings(s);

		await expect(
			s.asCoupleA.mutation(api.attachments.create, {
				storageId: await storeBlob(s.t),
				name: "invasao.png",
				kind: "comprovante",
				paymentId: paymentB,
			}),
		).rejects.toThrow("Pagamento não encontrado");
	});

	it("remove on another wedding's attachment is a no-op, like a missing row", async () => {
		const s = await setupWeddingScopedTest();
		const { attachmentB } = await seedBothWeddings(s);

		await s.asCoupleA.mutation(api.attachments.remove, { id: attachmentB });

		const row = await s.t.run(async (ctx) => ctx.db.get(attachmentB));
		expect(row).not.toBeNull();
		// Blob must survive too — a cross-tenant remove must not touch storage.
		const url = await s.t.run(async (ctx) =>
			ctx.storage.getUrl(row?.storageId as Id<"_storage">),
		);
		expect(typeof url).toBe("string");
	});
});
