// Domain dates are ISO `yyyy-MM-dd` strings interpreted in
// America/Sao_Paulo (see AGENTS.md). All math here is pure calendar
// arithmetic on the date parts — no Date timezone surprises.

import { addMonths, differenceInCalendarDays, format } from "date-fns";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses an ISO date string into a local-time Date (safe for calendar math). */
function toLocalDate(iso: string): Date {
	const match = ISO_DATE_RE.exec(iso);
	if (!match) throw new Error(`Invalid ISO date: ${iso}`);
	const [, year, month, day] = match;
	return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isValidISODate(iso: string): boolean {
	const match = ISO_DATE_RE.exec(iso);
	if (!match) return false;
	const [, year, month, day] = match;
	const date = new Date(Number(year), Number(month) - 1, Number(day));
	return (
		date.getFullYear() === Number(year) &&
		date.getMonth() === Number(month) - 1 &&
		date.getDate() === Number(day)
	);
}

export function formatDateBR(iso: string): string {
	return format(toLocalDate(iso), "dd/MM/yyyy");
}

/** Calendar days from `fromISO` to `toISO` (negative when in the past). */
export function daysBetween(fromISO: string, toISO: string): number {
	return differenceInCalendarDays(toLocalDate(toISO), toLocalDate(fromISO));
}

/** Adds months, clamping the day at shorter months (Jan 31 + 1 → Feb 28). */
export function addMonthsISO(iso: string, months: number): string {
	return format(addMonths(toLocalDate(iso), months), "yyyy-MM-dd");
}

// Intl formatter construction is expensive; build it once per module load.
const saoPauloFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: "America/Sao_Paulo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** Today's date in São Paulo, regardless of the machine's timezone. */
export function todayInSaoPaulo(): string {
	return saoPauloFormatter.format(new Date());
}
