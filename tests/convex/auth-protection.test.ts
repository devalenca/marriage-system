import { expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupUnauthenticatedTest } from "./helpers";

// Every public Convex function must reject callers without a signed-in
// identity. The deployed backend is reachable directly (not only through
// the Next.js pages), so the UI-level gate alone protects nothing.

type TestCtx = ReturnType<typeof setupUnauthenticatedTest>;

async function seed(t: TestCtx) {
	return await t.run(async (ctx) => {
		const storageId = await ctx.storage.store(new Blob(["x"]));
		const vendorId = await ctx.db.insert("vendors", {
			name: "Buffet Teste",
			category: "buffet",
			status: "pesquisando",
		});
		const paymentId = await ctx.db.insert("payments", {
			vendorId,
			description: "Entrada",
			amountCents: 1000,
			dueDate: "2026-07-01",
			status: "pendente",
		});
		const attachmentId = await ctx.db.insert("attachments", {
			vendorId,
			storageId,
			name: "contrato.pdf",
			kind: "contrato",
			uploadedAt: 0,
		});
		const taskId = await ctx.db.insert("tasks", {
			title: "Tarefa",
			priority: "media",
			status: "pendente",
			isGenerated: false,
		});
		await ctx.db.insert("settings", {
			coupleNames: "A & B",
			weddingDate: "2026-11-21",
			budgetGoalCents: 0,
		});
		return { storageId, vendorId, paymentId, attachmentId, taskId };
	});
}

type SeedIds = Awaited<ReturnType<typeof seed>>;
type Case = [string, (t: TestCtx, ids: SeedIds) => Promise<unknown>];

const cases: Case[] = [
	["settings.get", (t) => t.query(api.settings.get, {})],
	[
		"settings.save",
		(t) =>
			t.mutation(api.settings.save, {
				coupleNames: "A & B",
				weddingDate: "2026-11-21",
				budgetGoalCents: 0,
			}),
	],
	["vendors.list", (t) => t.query(api.vendors.list, {})],
	["vendors.get", (t, ids) => t.query(api.vendors.get, { id: ids.vendorId })],
	[
		"vendors.create",
		(t) =>
			t.mutation(api.vendors.create, {
				name: "Foto",
				category: "fotografia",
				status: "pesquisando",
			}),
	],
	[
		"vendors.update",
		(t, ids) => t.mutation(api.vendors.update, { id: ids.vendorId }),
	],
	[
		"vendors.remove",
		(t, ids) => t.mutation(api.vendors.remove, { id: ids.vendorId }),
	],
	[
		"payments.listByVendor",
		(t, ids) => t.query(api.payments.listByVendor, { vendorId: ids.vendorId }),
	],
	["payments.listPending", (t) => t.query(api.payments.listPending, {})],
	[
		"payments.create",
		(t, ids) =>
			t.mutation(api.payments.create, {
				vendorId: ids.vendorId,
				description: "Parcela",
				amountCents: 1000,
				dueDate: "2026-07-01",
			}),
	],
	[
		"payments.createSchedule",
		(t, ids) =>
			t.mutation(api.payments.createSchedule, {
				vendorId: ids.vendorId,
				totalCents: 10000,
				downPaymentCents: 1000,
				installmentsCount: 3,
			}),
	],
	[
		"payments.update",
		(t, ids) => t.mutation(api.payments.update, { id: ids.paymentId }),
	],
	[
		"payments.markPaid",
		(t, ids) => t.mutation(api.payments.markPaid, { id: ids.paymentId }),
	],
	[
		"payments.markPending",
		(t, ids) => t.mutation(api.payments.markPending, { id: ids.paymentId }),
	],
	[
		"payments.remove",
		(t, ids) => t.mutation(api.payments.remove, { id: ids.paymentId }),
	],
	[
		"attachments.generateUploadUrl",
		(t) => t.mutation(api.attachments.generateUploadUrl, {}),
	],
	[
		"attachments.create",
		(t, ids) =>
			t.mutation(api.attachments.create, {
				storageId: ids.storageId,
				name: "recibo.pdf",
				kind: "comprovante",
				vendorId: ids.vendorId,
			}),
	],
	[
		"attachments.listByVendor",
		(t, ids) =>
			t.query(api.attachments.listByVendor, { vendorId: ids.vendorId }),
	],
	[
		"attachments.listByPayment",
		(t, ids) =>
			t.query(api.attachments.listByPayment, { paymentId: ids.paymentId }),
	],
	[
		"attachments.remove",
		(t, ids) => t.mutation(api.attachments.remove, { id: ids.attachmentId }),
	],
	["tasks.list", (t) => t.query(api.tasks.list, {})],
	[
		"tasks.create",
		(t) => t.mutation(api.tasks.create, { title: "Nova", priority: "media" }),
	],
	[
		"tasks.update",
		(t, ids) => t.mutation(api.tasks.update, { id: ids.taskId }),
	],
	[
		"tasks.remove",
		(t, ids) => t.mutation(api.tasks.remove, { id: ids.taskId }),
	],
	[
		"tasks.generateFromTemplate",
		(t) => t.mutation(api.tasks.generateFromTemplate, {}),
	],
	[
		"dashboard.summary",
		(t) => t.query(api.dashboard.summary, { today: "2026-06-10" }),
	],
	[
		"finance.overview",
		(t) => t.query(api.finance.overview, { today: "2026-06-10" }),
	],
	["finance.exportRows", (t) => t.query(api.finance.exportRows, {})],
];

test.each(cases)("%s rejects unauthenticated callers", async (_name, call) => {
	const t = setupUnauthenticatedTest();
	const ids = await seed(t);
	await expect(call(t, ids)).rejects.toThrowError(/Não autenticado/);
});
