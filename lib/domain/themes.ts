// Per-wedding accent themes: each couple picks the palette their space wears.
// The id is stored on the wedding; the colours themselves live only in
// app/globals.css under [data-wedding-theme="<id>"]. Pickers render their
// swatch by scoping that same attribute, so a preview dot can never drift
// from the app it is previewing.

export type WeddingTheme = {
	id: string;
	label: string;
};

export const WEDDING_THEMES: readonly WeddingTheme[] = [
	{ id: "oliva", label: "Oliva" },
	{ id: "terracota", label: "Terracota" },
	{ id: "rose", label: "Rosé" },
	{ id: "lavanda", label: "Lavanda" },
	{ id: "oceano", label: "Oceano" },
] as const;

/** The default theme id when a wedding has not chosen one. */
export const DEFAULT_THEME = "oliva";

export function isWeddingTheme(id: string | undefined): boolean {
	return WEDDING_THEMES.some((theme) => theme.id === id);
}

/** Normalizes any stored/absent value to a valid theme id. */
export function resolveTheme(id: string | undefined): string {
	return isWeddingTheme(id) ? (id as string) : DEFAULT_THEME;
}
