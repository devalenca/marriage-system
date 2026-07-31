"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { resolveTheme } from "@/lib/domain/themes";

/**
 * Applies the couple's look app-wide from the document root, so it reaches
 * portalled dialogs and toasts too: `data-wedding-theme` for the accent and
 * `--app-background` for their own photo (CSS falls back to the shipped one).
 * Renders nothing.
 */
export function WeddingTheme() {
	const identity = useQuery(api.weddings.currentIdentity, {});
	const backgroundUrl = useQuery(api.weddings.background, {});
	const theme = resolveTheme(identity?.theme ?? undefined);

	useEffect(() => {
		const root = document.documentElement;
		root.setAttribute("data-wedding-theme", theme);
		return () => {
			root.removeAttribute("data-wedding-theme");
		};
	}, [theme]);

	useEffect(() => {
		const root = document.documentElement;
		if (typeof backgroundUrl === "string" && backgroundUrl.length > 0) {
			root.style.setProperty("--app-background", `url("${backgroundUrl}")`);
		} else {
			// Undefined (still loading) or null (no custom photo) both mean the
			// CSS fallback should win — never flash a half-applied background.
			root.style.removeProperty("--app-background");
		}
		return () => {
			root.style.removeProperty("--app-background");
		};
	}, [backgroundUrl]);

	return null;
}
