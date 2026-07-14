// Pure validation/normalization of a wedding's editable fields — shared by
// the weddings module and the legacy settings module until the latter dies.

import { isValidISODate, isValidISOTime } from "./dates";

export type WeddingFields = {
	coupleNames: string;
	weddingDate: string; // ISO yyyy-MM-dd (America/Sao_Paulo)
	budgetGoalCents: number;
	ceremonyVenue?: string;
	receptionVenue?: string;
	weddingTime?: string; // ISO HH:mm (24h)
};

/** Validates and trims wedding fields; empty optionals become undefined. */
export function normalizeWeddingFields(args: WeddingFields): WeddingFields {
	if (!isValidISODate(args.weddingDate)) {
		throw new Error("Data do casamento inválida");
	}
	if (args.budgetGoalCents < 0) {
		throw new Error("A meta de orçamento não pode ser negativa");
	}
	if (args.coupleNames.trim().length === 0) {
		throw new Error("Informe os nomes do casal");
	}

	const ceremonyVenue = args.ceremonyVenue?.trim();
	const receptionVenue = args.receptionVenue?.trim();
	const weddingTime = args.weddingTime?.trim();
	if (weddingTime && !isValidISOTime(weddingTime)) {
		throw new Error("Horário inválido");
	}

	return {
		coupleNames: args.coupleNames.trim(),
		weddingDate: args.weddingDate,
		budgetGoalCents: args.budgetGoalCents,
		ceremonyVenue: ceremonyVenue || undefined,
		receptionVenue: receptionVenue || undefined,
		weddingTime: weddingTime || undefined,
	};
}
