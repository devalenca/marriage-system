import { describe, expect, it } from "vitest";
import { filterVendors } from "@/components/vendors/filter-vendors";

const vendors = [
	{ name: "Espaço Jardim das Flores", category: "espaco", status: "fechado" },
	{ name: "Buffet Sabor & Festa", category: "buffet", status: "cotado" },
	{ name: "Foto Luz Estúdio", category: "fotografia", status: "pesquisando" },
] as const;

describe("filterVendors", () => {
	it("returns everything with no filters", () => {
		expect(filterVendors([...vendors], {})).toHaveLength(3);
	});

	it("searches by name, accent- and case-insensitive", () => {
		const result = filterVendors([...vendors], { search: "espaco" });
		expect(result.map((v) => v.name)).toEqual(["Espaço Jardim das Flores"]);
	});

	it("filters by category and status together", () => {
		expect(
			filterVendors([...vendors], { category: "buffet", status: "cotado" }),
		).toHaveLength(1);
		expect(
			filterVendors([...vendors], { category: "buffet", status: "pago" }),
		).toHaveLength(0);
	});
});
