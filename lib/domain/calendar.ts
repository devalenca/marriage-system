// Month-grid helpers for the calendar view. Months are `yyyy-MM` strings;
// days are ISO `yyyy-MM-dd` (same conventions as lib/domain/dates).

import { format } from "date-fns";

const MONTH_RE = /^(\d{4})-(\d{2})$/;

function parseMonth(month: string): { year: number; monthIndex: number } {
	const match = MONTH_RE.exec(month);
	if (!match) throw new Error(`Invalid month: ${month}`);
	const [, year, mm] = match;
	return { year: Number(year), monthIndex: Number(mm) - 1 };
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
	month: "long",
	year: "numeric",
});

/** "2026-06" → "junho de 2026" */
export function monthLabelPT(month: string): string {
	const { year, monthIndex } = parseMonth(month);
	return monthFormatter.format(new Date(year, monthIndex, 1));
}

export function shiftMonth(month: string, delta: number): string {
	const { year, monthIndex } = parseMonth(month);
	return format(new Date(year, monthIndex + delta, 1), "yyyy-MM");
}

export interface GridDay {
	date: string;
	inMonth: boolean;
}

/** Calendar cells for a month: full weeks from Sunday to Saturday. */
export function monthGrid(month: string): GridDay[] {
	const { year, monthIndex } = parseMonth(month);
	const first = new Date(year, monthIndex, 1);
	const last = new Date(year, monthIndex + 1, 0);

	const start = new Date(first);
	start.setDate(first.getDate() - first.getDay());
	const end = new Date(last);
	end.setDate(last.getDate() + (6 - last.getDay()));

	const days: GridDay[] = [];
	for (
		let cursor = new Date(start);
		cursor <= end;
		cursor.setDate(cursor.getDate() + 1)
	) {
		days.push({
			date: format(cursor, "yyyy-MM-dd"),
			inMonth: cursor.getMonth() === monthIndex,
		});
	}
	return days;
}
