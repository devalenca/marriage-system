import { describe, expect, it } from "vitest";
import { filterAttachments } from "@/lib/domain/attachments-filter";

const items = [
	{
		name: "contrato.pdf",
		kind: "contrato" as const,
		source: { vendorName: "Espaço Jardim" },
	},
	{
		name: "comprovante.png",
		kind: "comprovante" as const,
		source: { vendorName: "Buffet do Chef", paymentDescription: "Entrada" },
	},
	{
		name: "planilha.xlsx",
		kind: "outro" as const,
		source: { vendorName: null },
	},
];

describe("filterAttachments", () => {
	it("filters by kind", () => {
		const result = filterAttachments(items, { kind: "contrato" });
		expect(result.map((f) => f.name)).toEqual(["contrato.pdf"]);
	});

	it("search matches file name", () => {
		const result = filterAttachments(items, { search: "planilha" });
		expect(result.map((f) => f.name)).toEqual(["planilha.xlsx"]);
	});

	it("search matches vendor name accent-insensitively", () => {
		const result = filterAttachments(items, { search: "espaco" });
		expect(result.map((f) => f.name)).toEqual(["contrato.pdf"]);
	});

	it("search matches payment description", () => {
		const result = filterAttachments(items, { search: "entrada" });
		expect(result.map((f) => f.name)).toEqual(["comprovante.png"]);
	});

	it("returns all when kind is todos and search is empty", () => {
		const result = filterAttachments(items, { kind: "todos", search: "" });
		expect(result).toHaveLength(3);
	});
});
