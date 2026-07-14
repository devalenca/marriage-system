"use client";

import { useEffect } from "react";

/**
 * Opens a page's create dialog when it was reached via `?criar=1` (a quick
 * action / command-palette deep link), then strips the param so a refresh
 * doesn't reopen it. Reads the URL client-side to avoid a Suspense boundary.
 */
export function useOpenOnCreateParam(setOpen: (open: boolean) => void) {
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (new URLSearchParams(window.location.search).get("criar") === "1") {
			setOpen(true);
			window.history.replaceState(null, "", window.location.pathname);
		}
	}, [setOpen]);
}
