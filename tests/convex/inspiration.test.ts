import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { setupTest } from "./helpers";

async function storeBlob(t: ReturnType<typeof setupTest>) {
	return await t.run(async (ctx) =>
		ctx.storage.store(new Blob(["img"], { type: "image/png" })),
	);
}

describe("inspiration galleries", () => {
	it("createGallery inserts and listGalleries returns it empty", async () => {
		const t = setupTest();
		await t.mutation(api.inspiration.createGallery, { name: "Decoração" });

		const galleries = await t.query(api.inspiration.listGalleries, {});
		expect(galleries).toHaveLength(1);
		expect(galleries[0]).toMatchObject({ name: "Decoração" });
		expect(galleries[0]?.images).toHaveLength(0);
	});

	it("addImage attaches to a gallery and listGalleries shows url + caption", async () => {
		const t = setupTest();
		const galleryId = await t.mutation(api.inspiration.createGallery, {
			name: "Buquê",
		});
		await t.mutation(api.inspiration.addImage, {
			galleryId,
			storageId: await storeBlob(t),
			caption: "Flores do campo",
		});

		const galleries = await t.query(api.inspiration.listGalleries, {});
		expect(galleries).toHaveLength(1);
		expect(galleries[0]?.images).toHaveLength(1);
		expect(galleries[0]?.images[0]).toMatchObject({
			caption: "Flores do campo",
		});
		expect(typeof galleries[0]?.images[0]?.url).toBe("string");
	});

	it("renameGallery changes the name", async () => {
		const t = setupTest();
		const galleryId = await t.mutation(api.inspiration.createGallery, {
			name: "Antigo",
		});
		await t.mutation(api.inspiration.renameGallery, {
			id: galleryId,
			name: "Novo",
		});

		const galleries = await t.query(api.inspiration.listGalleries, {});
		expect(galleries[0]).toMatchObject({ name: "Novo" });
	});

	it("removeGallery deletes its images (cascade)", async () => {
		const t = setupTest();
		const galleryId = await t.mutation(api.inspiration.createGallery, {
			name: "Decoração",
		});
		await t.mutation(api.inspiration.addImage, {
			galleryId,
			storageId: await storeBlob(t),
		});
		await t.mutation(api.inspiration.addImage, {
			galleryId,
			storageId: await storeBlob(t),
		});

		await t.mutation(api.inspiration.removeGallery, { id: galleryId });

		const images = await t.run(async (ctx) =>
			ctx.db.query("inspirationImages").collect(),
		);
		const galleries = await t.run(async (ctx) =>
			ctx.db.query("galleries").collect(),
		);
		expect(images).toHaveLength(0);
		expect(galleries).toHaveLength(0);
	});

	it("removeImage deletes a single image, gallery survives", async () => {
		const t = setupTest();
		const galleryId = await t.mutation(api.inspiration.createGallery, {
			name: "Decoração",
		});
		const imageId: Id<"inspirationImages"> = await t.mutation(
			api.inspiration.addImage,
			{ galleryId, storageId: await storeBlob(t) },
		);

		await t.mutation(api.inspiration.removeImage, { id: imageId });

		const galleries = await t.query(api.inspiration.listGalleries, {});
		expect(galleries).toHaveLength(1);
		expect(galleries[0]?.images).toHaveLength(0);
	});

	it("addImage to a non-existent gallery rejects", async () => {
		const t = setupTest();
		const galleryId = await t.mutation(api.inspiration.createGallery, {
			name: "Temporária",
		});
		await t.mutation(api.inspiration.removeGallery, { id: galleryId });

		await expect(
			t.mutation(api.inspiration.addImage, {
				galleryId,
				storageId: await storeBlob(t),
			}),
		).rejects.toThrow();
	});

	it("createGallery with blank name rejects", async () => {
		const t = setupTest();
		await expect(
			t.mutation(api.inspiration.createGallery, { name: "   " }),
		).rejects.toThrow();
	});
});
