"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_DESTINATIONS } from "@/components/nav-config";

/**
 * True for rich-text surfaces. Reads the attribute as well as the property
 * because `isContentEditable` is unimplemented in jsdom (and thus in tests).
 */
function isRichText(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const attr = target.getAttribute("contenteditable");
	return target.isContentEditable || (attr !== null && attr !== "false");
}

/** True when focus is in a field where digit keys are real input, not shortcuts. */
function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		isRichText(target)
	);
}

/**
 * App-wide keyboard shortcuts, mounted once by the shell:
 * - Ctrl/⌘+B folds the sidebar;
 * - number keys 1–8 jump to the matching section (see nav-config), as long as
 *   the user isn't typing and no modifier is held.
 */
export function useNavShortcuts({
	onToggleSidebar,
}: {
	onToggleSidebar?: () => void;
} = {}) {
	const router = useRouter();

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (
				(event.ctrlKey || event.metaKey) &&
				!event.altKey &&
				event.key.toLowerCase() === "b"
			) {
				// Left alone inside rich text, where Ctrl+B means bold. Plain
				// inputs have no such meaning, so the shortcut works there.
				if (isRichText(event.target)) return;
				event.preventDefault();
				onToggleSidebar?.();
				return;
			}
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;
			const destination = NAV_DESTINATIONS.find(
				(item) => item.shortcut === event.key,
			);
			if (destination) {
				event.preventDefault();
				router.push(destination.href);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [router, onToggleSidebar]);
}
