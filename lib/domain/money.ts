// Money is always integer centavos (see AGENTS.md). Formatting to "R$"
// happens only at the UI edge, through these helpers.

const brlFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

export function formatBRL(cents: number): string {
	return brlFormatter.format(cents / 100);
}

/**
 * Parses user input like "55000", "1.234,56" or "R$ 2.500,00" into centavos.
 * Returns null when the input has no parseable number.
 */
export function parseBRLInput(input: string): number | null {
	const cleaned = input.replace(/[R$\s]/g, "");
	if (!/\d/.test(cleaned)) return null;

	const normalized = cleaned.replace(/\./g, "").replace(",", ".");
	const value = Number(normalized);
	if (Number.isNaN(value)) return null;

	return Math.round(value * 100);
}
