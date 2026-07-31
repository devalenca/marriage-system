"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Light/dark mode. Separate from the couple's accent theme (that one lives on
 * `data-wedding-theme`); this only toggles the `.dark` class on <html>.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="light"
			enableSystem
			disableTransitionOnChange
		>
			{children}
		</ThemeProvider>
	);
}
