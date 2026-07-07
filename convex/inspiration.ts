import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { authedMutation as mutation, authedQuery as query } from "./lib/auth";

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

export const createGallery = mutation({
	args: { name: v.string() },
	handler: async (ctx, { name }) => {
		if (name.trim().length === 0) {
			throw new Error("Informe o nome da galeria");
		}
		return await ctx.db.insert("galleries", { name: name.trim() });
	},
});

export const renameGallery = mutation({
	args: { id: v.id("galleries"), name: v.string() },
	handler: async (ctx, { id, name }) => {
		if (!(await ctx.db.get(id))) {
			throw new Error("Galeria não encontrada");
		}
		if (name.trim().length === 0) {
			throw new Error("Informe o nome da galeria");
		}
		await ctx.db.patch(id, { name: name.trim() });
	},
});

export const removeGallery = mutation({
	args: { id: v.id("galleries") },
	handler: async (ctx, { id }) => {
		if (!(await ctx.db.get(id))) return;
		const images = await ctx.db
			.query("inspirationImages")
			.withIndex("by_gallery", (q) => q.eq("galleryId", id))
			.collect();
		for (const image of images) {
			await ctx.storage.delete(image.storageId);
			await ctx.db.delete(image._id);
		}
		await ctx.db.delete(id);
	},
});

export const addImage = mutation({
	args: {
		galleryId: v.id("galleries"),
		storageId: v.id("_storage"),
		caption: v.optional(v.string()),
	},
	handler: async (ctx, { galleryId, storageId, caption }) => {
		if (!(await ctx.db.get(galleryId))) {
			throw new Error("Galeria não encontrada");
		}
		return await ctx.db.insert("inspirationImages", {
			galleryId,
			storageId,
			caption: caption?.trim() || undefined,
			uploadedAt: Date.now(),
		});
	},
});

export const removeImage = mutation({
	args: { id: v.id("inspirationImages") },
	handler: async (ctx, { id }) => {
		const image = await ctx.db.get(id);
		if (!image) return;
		await ctx.storage.delete(image.storageId);
		await ctx.db.delete(id);
	},
});

async function imageWithUrl(ctx: QueryCtx, image: Doc<"inspirationImages">) {
	return { ...image, url: await ctx.storage.getUrl(image.storageId) };
}

export const listGalleries = query({
	args: {},
	handler: async (ctx) => {
		const galleries = await ctx.db.query("galleries").collect();
		return Promise.all(
			galleries.map(async (gallery) => {
				const images = await ctx.db
					.query("inspirationImages")
					.withIndex("by_gallery", (q) => q.eq("galleryId", gallery._id))
					.collect();
				const withUrls = await Promise.all(
					images.map((image) => imageWithUrl(ctx, image)),
				);
				// Newest first.
				withUrls.sort((a, b) => b.uploadedAt - a.uploadedAt);
				return { ...gallery, images: withUrls };
			}),
		);
	},
});
