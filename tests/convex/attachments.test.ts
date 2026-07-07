import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { setupTest } from "./helpers";

async function storeBlob(t: ReturnType<typeof setupTest>) {
	return await t.run(async (ctx) =>
		ctx.storage.store(new Blob(["contract"], { type: "application/pdf" })),
	);
}

async function createVendor(t: ReturnType<typeof setupTest>) {
	return await t.mutation(api.vendors.create, {
		name: "Espaço Jardim",
		category: "espaco",
		status: "fechado",
		contractedCents: 1000000,
	});
}

describe("attachments.create / list", () => {
	it("attaches a contract to a vendor and lists it with a url", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const storageId = await storeBlob(t);

		await t.mutation(api.attachments.create, {
			storageId,
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
			mimeType: "application/pdf",
			sizeBytes: 1234,
		});

		const list = await t.query(api.attachments.listByVendor, { vendorId });
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ name: "contrato.pdf", kind: "contrato" });
		expect(typeof list[0]?.url).toBe("string");
	});

	it("attaches a receipt to a payment", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const paymentId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		const storageId = await storeBlob(t);

		await t.mutation(api.attachments.create, {
			storageId,
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		const list = await t.query(api.attachments.listByPayment, { paymentId });
		expect(list).toHaveLength(1);
		expect(list[0]?.kind).toBe("comprovante");
	});

	it("requires exactly one of vendorId / paymentId", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const storageId = await storeBlob(t);

		await expect(
			t.mutation(api.attachments.create, {
				storageId,
				name: "x",
				kind: "outro",
			}),
		).rejects.toThrow();

		const paymentId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 1000,
			dueDate: "2026-07-01",
		});
		await expect(
			t.mutation(api.attachments.create, {
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
	it("removing a payment deletes its attachments", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const paymentId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "c.png",
			kind: "comprovante",
			paymentId,
		});

		await t.mutation(api.payments.remove, { id: paymentId });

		const remaining = await t.run(async (ctx) =>
			ctx.db.query("attachments").collect(),
		);
		expect(remaining).toHaveLength(0);
	});

	it("removing a vendor deletes vendor and payment attachments", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const paymentId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		await t.mutation(api.vendors.remove, { id: vendorId });

		const remaining = await t.run(async (ctx) =>
			ctx.db.query("attachments").collect(),
		);
		expect(remaining).toHaveLength(0);
	});

	it("remove deletes a single attachment", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const id: Id<"attachments"> = await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});

		await t.mutation(api.attachments.remove, { id });
		const list = await t.query(api.attachments.listByVendor, { vendorId });
		expect(list).toHaveLength(0);
	});
});

describe("attachments.listAll", () => {
	it("enriches a vendor attachment with the vendor name", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});

		const list = await t.query(api.attachments.listAll, {});
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({
			name: "contrato.pdf",
			kind: "contrato",
			source: { type: "vendor", vendorName: "Espaço Jardim" },
		});
		expect(typeof list[0]?.url).toBe("string");
	});

	it("enriches a payment attachment with payment description + vendor name", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const paymentId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		const list = await t.query(api.attachments.listAll, {});
		expect(list).toHaveLength(1);
		expect(list[0]?.source).toMatchObject({
			type: "payment",
			vendorName: "Espaço Jardim",
			paymentDescription: "Entrada",
		});
	});

	it("returns attachments newest-first across both sources", async () => {
		const t = setupTest();
		const vendorId = await createVendor(t);
		const paymentId = await t.mutation(api.payments.create, {
			vendorId,
			description: "Entrada",
			amountCents: 300000,
			dueDate: "2026-07-01",
		});
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "contrato.pdf",
			kind: "contrato",
			vendorId,
		});
		await t.mutation(api.attachments.create, {
			storageId: await storeBlob(t),
			name: "comprovante.png",
			kind: "comprovante",
			paymentId,
		});

		const list = await t.query(api.attachments.listAll, {});
		expect(list).toHaveLength(2);
		expect(list.map((f) => f.name)).toEqual(
			expect.arrayContaining(["contrato.pdf", "comprovante.png"]),
		);
		expect(list[0]?.uploadedAt).toBeGreaterThanOrEqual(
			list[1]?.uploadedAt ?? 0,
		);
	});

	it("empty when no attachments", async () => {
		const t = setupTest();
		const list = await t.query(api.attachments.listAll, {});
		expect(list).toEqual([]);
	});
});
