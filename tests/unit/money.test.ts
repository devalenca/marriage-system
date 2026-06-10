import { describe, expect, it } from "vitest";
import { formatBRL, parseBRLInput } from "@/lib/domain/money";

// Intl pt-BR uses a non-breaking space between "R$" and the number.
const NBSP = " ";

describe("formatBRL", () => {
	it("formats integer centavos as pt-BR currency", () => {
		expect(formatBRL(5500000)).toBe(`R$${NBSP}55.000,00`);
	});

	it("formats centavo fractions", () => {
		expect(formatBRL(123456)).toBe(`R$${NBSP}1.234,56`);
	});

	it("formats zero", () => {
		expect(formatBRL(0)).toBe(`R$${NBSP}0,00`);
	});

	it("formats negative amounts", () => {
		expect(formatBRL(-150000)).toBe(`-R$${NBSP}1.500,00`);
	});
});

describe("parseBRLInput", () => {
	it("parses plain digits as reais", () => {
		expect(parseBRLInput("55000")).toBe(5500000);
	});

	it("parses pt-BR decimal comma", () => {
		expect(parseBRLInput("1.234,56")).toBe(123456);
	});

	it("parses values with R$ prefix and spaces", () => {
		expect(parseBRLInput("R$ 2.500,00")).toBe(250000);
	});

	it("parses comma with a single decimal digit", () => {
		expect(parseBRLInput("10,5")).toBe(1050);
	});

	it("returns null for empty or invalid input", () => {
		expect(parseBRLInput("")).toBeNull();
		expect(parseBRLInput("abc")).toBeNull();
	});
});
