// Per-wedding accent themes: each couple picks the palette their space wears.
// The id is stored on the wedding; the matching color overrides live in
// app/globals.css under [data-wedding-theme="<id>"]. `swatch` is only the
// preview dot shown in the picker.

export type WeddingTheme = {
	id: string;
	label: string;
	swatch: string; // oklch, mirrors the theme's --primary
};

export const WEDDING_THEMES: readonly WeddingTheme[] = [
	{ id: "oliva", label: "Oliva", swatch: "oklch(0.45 0.075 142)" },
	{ id: "terracota", label: "Terracota", swatch: "oklch(0.52 0.11 42)" },
	{ id: "rose", label: "Rosé", swatch: "oklch(0.55 0.1 12)" },
	{ id: "lavanda", label: "Lavanda", swatch: "oklch(0.5 0.09 300)" },
	{ id: "oceano", label: "Oceano", swatch: "oklch(0.5 0.08 235)" },
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
