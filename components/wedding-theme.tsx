"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { resolveTheme } from "@/lib/domain/themes";

/**
 * Applies the couple's accent theme app-wide by setting `data-wedding-theme`
 * on the document root, so it reaches portalled dialogs and toasts too.
 * Renders nothing.
 */
export function WeddingTheme() {
	const identity = useQuery(api.weddings.currentIdentity, {});
	const theme = resolveTheme(identity?.theme ?? undefined);

	useEffect(() => {
		const root = document.documentElement;
		root.setAttribute("data-wedding-theme", theme);
		return () => {
			root.removeAttribute("data-wedding-theme");
		};
	}, [theme]);

	return null;
}
