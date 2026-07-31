import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupWeddingScopedTest } from "./helpers";

// The couple can replace the app's background photo with one of their own.
// Missing = the shipped default (the CSS falls back to it).

async function storeImage(
	t: Awaited<ReturnType<typeof setupWeddingScopedTest>>["t"],
) {
	return await t.run(async (ctx) =>
		ctx.storage.store(new Blob(["fake-image"], { type: "image/png" })),
	);
}

describe("weddings.setBackground", () => {
	test("the admin sets a photo and it comes back as a URL", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const storageId = await storeImage(t);

		expect(await asCoupleA.query(api.weddings.background, {})).toBeNull();
		await asCoupleA.mutation(api.weddings.setBackground, { storageId });
		expect(await asCoupleA.query(api.weddings.background, {})).toEqual(
			expect.stringContaining("http"),
		);
	});

	test("replacing the photo deletes the previous file", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const first = await storeImage(t);
		const second = await storeImage(t);

		await asCoupleA.mutation(api.weddings.setBackground, {
			storageId: first,
		});
		await asCoupleA.mutation(api.weddings.setBackground, {
			storageId: second,
		});

		// The orphaned blob is gone, so storage never grows with each change.
		expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeNull();
		expect(await t.run((ctx) => ctx.storage.getUrl(second))).not.toBeNull();
	});

	test("clearing restores the default and frees the file", async () => {
		const { t, asCoupleA } = await setupWeddingScopedTest();
		const storageId = await storeImage(t);
		await asCoupleA.mutation(api.weddings.setBackground, { storageId });

		await asCoupleA.mutation(api.weddings.clearBackground, {});

		expect(await asCoupleA.query(api.weddings.background, {})).toBeNull();
		expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
	});

	test("a member cannot change the couple's background", async () => {
		const { t, weddingA } = await setupWeddingScopedTest();
		const storageId = await storeImage(t);
		const memberId = await t.run(async (ctx) => {
			const userId = await ctx.db.insert("users", {
				email: "membro@example.com",
			});
			await ctx.db.insert("memberships", {
				weddingId: weddingA,
				userId,
				role: "member",
			});
			return userId;
		});
		const asMember = t.withIdentity({
			subject: `${memberId}|session`,
			email: "membro@example.com",
		});

		await expect(
			asMember.mutation(api.weddings.setBackground, { storageId }),
		).rejects.toThrowError(/administrador/i);
	});

	test("never leaks another wedding's background", async () => {
		const { t, asCoupleA, asCoupleB } = await setupWeddingScopedTest();
		const storageId = await storeImage(t);
		await asCoupleA.mutation(api.weddings.setBackground, { storageId });

		expect(await asCoupleB.query(api.weddings.background, {})).toBeNull();
	});
});
