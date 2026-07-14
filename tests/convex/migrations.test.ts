import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../convex/_generated/api";
import { setupUnauthenticatedTest } from "./helpers";

// One-shot migration to multi-tenancy: turns the legacy `settings` singleton
// into the first wedding, stamps every data row with its weddingId and links
// every existing user to that wedding as an admin.

const SUPERADMIN_EMAIL = "super@example.com";

async function seedLegacyData() {
	const t = setupUnauthenticatedTest();
	const seeded = await t.run(async (ctx) => {
		await ctx.db.insert("settings", {
			coupleNames: "Gabriel & Alice",
			weddingDate: "2026-11-21",
			budgetGoalCents: 9_000_000,
			ceremonyVenue: "Igreja Matriz",
		});
		const superadmin = await ctx.db.insert("users", {
			email: SUPERADMIN_EMAIL,
		});
		const partner = await ctx.db.insert("users", {
			email: "alice@example.com",
		});

		const vendorId = await ctx.db.insert("vendors", {
			name: "Buffet Sabor",
			category: "buffet",
			status: "fechado",
			contractedCents: 3_000_000,
		});
		await ctx.db.insert("payments", {
			vendorId,
			description: "Sinal",
			amountCents: 1_000_000,
			dueDate: "2026-08-01",
			status: "pendente",
		});
		const storageId = await ctx.storage.store(new Blob(["contrato"]));
		await ctx.db.insert("attachments", {
			vendorId,
			storageId,
			name: "contrato.pdf",
			kind: "contrato",
			uploadedAt: 1,
		});
		const galleryId = await ctx.db.insert("galleries", { name: "Decoração" });
		await ctx.db.insert("inspirationImages", {
			galleryId,
			storageId,
			uploadedAt: 1,
		});
		const inviteId = await ctx.db.insert("invites", {
			title: "Família Silva",
		});
		await ctx.db.insert("guests", {
			inviteId,
			name: "Tia Maria",
			rsvpStatus: "pendente",
		});
		await ctx.db.insert("tasks", {
			title: "Provar o vestido",
			priority: "alta",
			status: "pendente",
			isGenerated: false,
		});
		return { superadmin, partner };
	});
	return { t, ...seeded };
}

beforeEach(() => {
	vi.stubEnv("AUTH_ADMIN_EMAIL", SUPERADMIN_EMAIL);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("migrations.toMultiTenant", () => {
	test("creates the wedding from settings and stamps every table", async () => {
		const { t } = await seedLegacyData();
		await t.mutation(internal.migrations.toMultiTenant, {});

		const rows = await t.run(async (ctx) => ({
			weddings: await ctx.db.query("weddings").collect(),
			vendors: await ctx.db.query("vendors").collect(),
			payments: await ctx.db.query("payments").collect(),
			attachments: await ctx.db.query("attachments").collect(),
			galleries: await ctx.db.query("galleries").collect(),
			inspirationImages: await ctx.db.query("inspirationImages").collect(),
			invites: await ctx.db.query("invites").collect(),
			guests: await ctx.db.query("guests").collect(),
			tasks: await ctx.db.query("tasks").collect(),
		}));

		expect(rows.weddings).toHaveLength(1);
		const wedding = rows.weddings[0];
		expect(wedding).toMatchObject({
			coupleNames: "Gabriel & Alice",
			weddingDate: "2026-11-21",
			budgetGoalCents: 9_000_000,
			ceremonyVenue: "Igreja Matriz",
		});

		for (const table of [
			rows.vendors,
			rows.payments,
			rows.attachments,
			rows.galleries,
			rows.inspirationImages,
			rows.invites,
			rows.guests,
			rows.tasks,
		]) {
			expect(table.length).toBeGreaterThan(0);
			for (const row of table) {
				expect(row.weddingId).toBe(wedding?._id);
			}
		}
	});

	test("links every existing user to the wedding as admin", async () => {
		const { t, superadmin, partner } = await seedLegacyData();
		await t.mutation(internal.migrations.toMultiTenant, {});

		const memberships = await t.run((ctx) =>
			ctx.db.query("memberships").collect(),
		);
		expect(memberships).toHaveLength(2);
		expect(
			memberships.map((m) => ({ userId: m.userId, role: m.role })),
		).toEqual(
			expect.arrayContaining([
				{ userId: superadmin, role: "admin" },
				{ userId: partner, role: "admin" },
			]),
		);
	});

	test("is idempotent", async () => {
		const { t } = await seedLegacyData();
		await t.mutation(internal.migrations.toMultiTenant, {});
		await t.mutation(internal.migrations.toMultiTenant, {});

		const rows = await t.run(async (ctx) => ({
			weddings: await ctx.db.query("weddings").collect(),
			memberships: await ctx.db.query("memberships").collect(),
		}));
		expect(rows.weddings).toHaveLength(1);
		expect(rows.memberships).toHaveLength(2);
	});

	test("does nothing on a deployment without settings", async () => {
		const t = setupUnauthenticatedTest();
		await t.mutation(internal.migrations.toMultiTenant, {});

		const weddings = await t.run((ctx) => ctx.db.query("weddings").collect());
		expect(weddings).toHaveLength(0);
	});
});
