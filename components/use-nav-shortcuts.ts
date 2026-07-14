"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_DESTINATIONS } from "@/components/nav-config";

/** True when focus is in a field where digit keys are real input, not shortcuts. */
function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		target.isContentEditable
	);
}

/**
 * Number keys 1–8 jump to the matching section (see nav-config shortcuts),
 * as long as the user isn't typing and no modifier is held. Mounted once.
 */
export function useNavShortcuts() {
	const router = useRouter();

	useEffect(() => {
		function onKey(event: KeyboardEvent) {
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
	}, [router]);
}
