import { internalMutation } from "./_generated/server";

// One-shot, idempotent migration to multi-tenancy: the legacy `settings`
// singleton becomes the first wedding, every data row gets stamped with that
// weddingId and every existing user becomes an admin of that wedding.
// Safe to re-run; does nothing on a fresh deployment.

const TENANT_TABLES = [
	"vendors",
	"payments",
	"attachments",
	"galleries",
	"inspirationImages",
	"invites",
	"guests",
	"tasks",
] as const;

export const toMultiTenant = internalMutation({
	args: {},
	handler: async (ctx) => {
		let wedding = await ctx.db.query("weddings").first();
		if (wedding === null) {
			const settings = await ctx.db.query("settings").first();
			if (settings === null) return null; // fresh deployment — nothing to migrate
			const { _id, _creationTime, ...fields } = settings;
			wedding = await ctx.db.get(await ctx.db.insert("weddings", fields));
			if (wedding === null) return null;
		}
		const weddingId = wedding._id;

		for (const table of TENANT_TABLES) {
			for (const row of await ctx.db.query(table).collect()) {
				if (row.weddingId === undefined) {
					await ctx.db.patch(row._id, { weddingId });
				}
			}
		}

		for (const user of await ctx.db.query("users").collect()) {
			const linked = await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", user._id))
				.first();
			if (linked === null) {
				await ctx.db.insert("memberships", {
					weddingId,
					userId: user._id,
					role: "admin",
				});
			}
		}
		return null;
	},
});
