"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { resolveTheme, THEME_STORAGE_KEY } from "@/lib/domain/themes";

/**
 * Applies the couple's look app-wide from the document root, so it reaches
 * portalled dialogs and toasts too: `data-wedding-theme` for the accent and
 * `--app-background` for their own photo (CSS falls back to the shipped one).
 * Renders nothing.
 */
export function WeddingTheme() {
	const identity = useQuery(api.weddings.currentIdentity, {});
	const backgroundUrl = useQuery(api.weddings.background, {});

	useEffect(() => {
		// Undefined means the query is still in flight. Applying a theme now
		// would mean applying the *default* one, undoing what ThemeBootstrap
		// already painted and producing the flash it exists to prevent.
		if (identity === undefined) return;
		const theme = resolveTheme(identity?.theme ?? undefined);
		document.documentElement.setAttribute("data-wedding-theme", theme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			// Private mode or a full quota: the theme still applies this session.
		}
	}, [identity]);

	useEffect(() => {
		const root = document.documentElement;
		if (typeof backgroundUrl === "string" && backgroundUrl.length > 0) {
			root.style.setProperty("--app-background", `url("${backgroundUrl}")`);
		} else if (backgroundUrl === null) {
			// Explicitly no custom photo — hand it back to the CSS fallback.
			root.style.removeProperty("--app-background");
		}
		return () => {
			root.style.removeProperty("--app-background");
		};
	}, [backgroundUrl]);

	return null;
}
