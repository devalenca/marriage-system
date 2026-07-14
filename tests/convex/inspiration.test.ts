import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { setupWeddingScopedTest } from "./helpers";

type Setup = Awaited<ReturnType<typeof setupWeddingScopedTest>>;

async function storeBlob(t: Setup["t"]) {
	return await t.run(async (ctx) =>
		ctx.storage.store(new Blob(["img"], { type: "image/png" })),
	);
}

describe("inspiration galleries", () => {
	it("createGallery inserts and listGalleries returns it empty", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Decoração",
		});

		const galleries = await asCoupleA.query(api.inspiration.listGalleries, {});
		expect(galleries).toHaveLength(1);
		expect(galleries[0]).toMatchObject({ name: "Decoração" });
		expect(galleries[0]?.images).toHaveLength(0);
	});

	it("addImage attaches to a gallery and listGalleries shows url + caption", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const galleryId = await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Buquê",
		});
		await asCoupleA.mutation(api.inspiration.addImage, {
			galleryId,
			storageId: await storeBlob(t),
			caption: "Flores do campo",
		});

		const galleries = await asCoupleA.query(api.inspiration.listGalleries, {});
		expect(galleries).toHaveLength(1);
		expect(galleries[0]?.images).toHaveLength(1);
		expect(galleries[0]?.images[0]).toMatchObject({
			caption: "Flores do campo",
		});
		expect(typeof galleries[0]?.images[0]?.url).toBe("string");
	});

	it("renameGallery changes the name", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		const galleryId = await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Antigo",
		});
		await asCoupleA.mutation(api.inspiration.renameGallery, {
			id: galleryId,
			name: "Novo",
		});

		const galleries = await asCoupleA.query(api.inspiration.listGalleries, {});
		expect(galleries[0]).toMatchObject({ name: "Novo" });
	});

	it("removeGallery deletes its images (cascade)", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const galleryId = await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Decoração",
		});
		await asCoupleA.mutation(api.inspiration.addImage, {
			galleryId,
			storageId: await storeBlob(t),
		});
		await asCoupleA.mutation(api.inspiration.addImage, {
			galleryId,
			storageId: await storeBlob(t),
		});

		await asCoupleA.mutation(api.inspiration.removeGallery, { id: galleryId });

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
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const galleryId = await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Decoração",
		});
		const imageId: Id<"inspirationImages"> = await asCoupleA.mutation(
			api.inspiration.addImage,
			{ galleryId, storageId: await storeBlob(t) },
		);

		await asCoupleA.mutation(api.inspiration.removeImage, { id: imageId });

		const galleries = await asCoupleA.query(api.inspiration.listGalleries, {});
		expect(galleries).toHaveLength(1);
		expect(galleries[0]?.images).toHaveLength(0);
	});

	it("addImage to a non-existent gallery rejects", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const galleryId = await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Temporária",
		});
		await asCoupleA.mutation(api.inspiration.removeGallery, { id: galleryId });

		await expect(
			asCoupleA.mutation(api.inspiration.addImage, {
				galleryId,
				storageId: await storeBlob(t),
			}),
		).rejects.toThrow();
	});

	it("createGallery with blank name rejects", async () => {
		const { asCoupleA } = await setupWeddingScopedTest();
		await expect(
			asCoupleA.mutation(api.inspiration.createGallery, { name: "   " }),
		).rejects.toThrow();
	});
});

describe("inspiration wedding isolation", () => {
	async function seedGalleryB(setup: Setup) {
		const { t, asCoupleB } = setup;
		const galleryIdB = await asCoupleB.mutation(api.inspiration.createGallery, {
			name: "Galeria B",
		});
		const imageIdB: Id<"inspirationImages"> = await asCoupleB.mutation(
			api.inspiration.addImage,
			{ galleryId: galleryIdB, storageId: await storeBlob(t) },
		);
		return { galleryIdB, imageIdB };
	}

	it("listGalleries only returns the caller's wedding rows", async () => {
		const setup = await setupWeddingScopedTest();
		const { asCoupleA, asCoupleB } = setup;
		await asCoupleA.mutation(api.inspiration.createGallery, {
			name: "Galeria A",
		});
		await seedGalleryB(setup);

		const galleriesA = await asCoupleA.query(api.inspiration.listGalleries, {});
		expect(galleriesA).toHaveLength(1);
		expect(galleriesA[0]).toMatchObject({ name: "Galeria A" });

		const galleriesB = await asCoupleB.query(api.inspiration.listGalleries, {});
		expect(galleriesB).toHaveLength(1);
		expect(galleriesB[0]).toMatchObject({ name: "Galeria B" });
	});

	it("renameGallery on another wedding's gallery fails like a missing row", async () => {
		const setup = await setupWeddingScopedTest();
		const { asCoupleA } = setup;
		const { galleryIdB } = await seedGalleryB(setup);

		await expect(
			asCoupleA.mutation(api.inspiration.renameGallery, {
				id: galleryIdB,
				name: "Hackeada",
			}),
		).rejects.toThrow("Galeria não encontrada");
	});

	it("removeGallery on another wedding's gallery is a no-op, like a missing row", async () => {
		const setup = await setupWeddingScopedTest();
		const { asCoupleA, asCoupleB } = setup;
		const { galleryIdB } = await seedGalleryB(setup);

		await asCoupleA.mutation(api.inspiration.removeGallery, {
			id: galleryIdB,
		});

		const galleriesB = await asCoupleB.query(api.inspiration.listGalleries, {});
		expect(galleriesB).toHaveLength(1);
		expect(galleriesB[0]?.images).toHaveLength(1);
	});

	it("addImage into another wedding's gallery fails like a missing gallery", async () => {
		const setup = await setupWeddingScopedTest();
		const { t, asCoupleA } = setup;
		const { galleryIdB } = await seedGalleryB(setup);

		await expect(
			asCoupleA.mutation(api.inspiration.addImage, {
				galleryId: galleryIdB,
				storageId: await storeBlob(t),
			}),
		).rejects.toThrow("Galeria não encontrada");
	});

	it("removeImage on another wedding's image is a no-op, like a missing row", async () => {
		const setup = await setupWeddingScopedTest();
		const { asCoupleA, asCoupleB } = setup;
		const { imageIdB } = await seedGalleryB(setup);

		await asCoupleA.mutation(api.inspiration.removeImage, { id: imageIdB });

		const galleriesB = await asCoupleB.query(api.inspiration.listGalleries, {});
		expect(galleriesB[0]?.images).toHaveLength(1);
	});
});
