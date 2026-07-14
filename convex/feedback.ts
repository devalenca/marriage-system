import { ConvexError, v } from "convex/values";
import { authedMutation, getViewer, superadminQuery } from "./lib/auth";

const kindValidator = v.union(
	v.literal("sugestao"),
	v.literal("problema"),
	v.literal("elogio"),
);

/** Any signed-in couple can send feedback; we tag it with their wedding. */
export const submit = authedMutation({
	args: { kind: kindValidator, message: v.string() },
	handler: async (ctx, { kind, message }) => {
		const text = message.trim();
		if (text.length < 3) {
			throw new ConvexError("Escreva um pouco mais para a gente entender.");
		}
		if (text.length > 4000) {
			throw new ConvexError("Mensagem muito longa.");
		}
		const viewer = await getViewer(ctx);
		if (viewer === null) {
			throw new ConvexError("Não autenticado");
		}
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", viewer._id))
			.first();
		await ctx.db.insert("feedback", {
			userId: viewer._id,
			weddingId: membership?.weddingId,
			email: viewer.email,
			kind,
			message: text,
			createdAt: Date.now(),
		});
		return null;
	},
});

/** Superadmin inbox: every piece of feedback, newest first, with context. */
export const list = superadminQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db
			.query("feedback")
			.withIndex("by_created")
			.order("desc")
			.collect();
		return await Promise.all(
			rows.map(async (row) => {
				const wedding = row.weddingId ? await ctx.db.get(row.weddingId) : null;
				return {
					_id: row._id,
					kind: row.kind,
					message: row.message,
					createdAt: row.createdAt,
					email: row.email ?? null,
					coupleNames: wedding?.coupleNames ?? null,
				};
			}),
		);
	},
});
