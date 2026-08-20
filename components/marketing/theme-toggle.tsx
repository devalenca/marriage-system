"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";

/** The View Transitions API, still absent from the DOM lib typings. */
type ViewTransitionDocument = Document & {
	startViewTransition?: (callback: () => void) => unknown;
};

/**
 * Light/dark switch for the landing page. Rendered only after mount so the
 * icon never mismatches the persisted theme during hydration.
 *
 * Flipping the theme is the most dramatic gesture the landing has, so it goes
 * through a view transition: the browser cross-fades the old and the new paint
 * of the whole page (~250ms) instead of cutting between two palettes. The
 * theme class has to be on `<html>` *before* the callback returns for the
 * browser to capture the new state, hence `flushSync`. Anything missing — no
 * API, or a visitor who asked for less motion — falls straight through to the
 * plain, instant switch.
 */
export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDark = mounted && resolvedTheme === "dark";

	function toggleTheme() {
		const next = isDark ? "light" : "dark";
		const doc = document as ViewTransitionDocument;
		const reduced = window.matchMedia?.(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (reduced || typeof doc.startViewTransition !== "function") {
			setTheme(next);
			return;
		}

		doc.startViewTransition(() => {
			flushSync(() => setTheme(next));
		});
	}

	return (
		<Button
			variant="ghost"
			size="icon-lg"
			aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
			onClick={toggleTheme}
			className="group/theme"
		>
			{isDark ? (
				<Sun
					className="size-4.5 transition-transform duration-300 ease-out group-hover/theme:rotate-45"
					aria-hidden
				/>
			) : (
				<Moon
					className="size-4.5 transition-transform duration-300 ease-out group-hover/theme:-rotate-12"
					aria-hidden
				/>
			)}
		</Button>
	);
}
