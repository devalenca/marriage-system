"use client";

import { useEffect } from "react";

/**
 * Keeps the page from jumping sideways when a popup locks scrolling.
 *
 * Base UI locks the document by setting `overflow: hidden` inline, and relies
 * on `scrollbar-gutter: stable` to hold the scrollbar's lane. Chromium does
 * not honour the gutter for `overflow: hidden` (verified in 148, even on a
 * bare document), so its own feature test fails and the scrollbar's width is
 * simply reclaimed — every select or dialog shoved the layout ~12px across.
 *
 * This watches for that inline lock and pads the locked element by exactly the
 * width that was reclaimed. Renders nothing.
 */
export function ScrollLockGutter() {
	useEffect(() => {
		const html = document.documentElement;
		const body = document.body;
		const scrollbarWidth = measureScrollbarWidth();
		// Overlay scrollbars (macOS, touch) take no space: nothing to hold open.
		if (scrollbarWidth === 0) return;

		let padded: HTMLElement | null = null;

		function sync() {
			const locked =
				html.style.overflowY === "hidden"
					? html
					: body.style.overflowY === "hidden"
						? body
						: null;
			if (locked === padded) return;
			if (padded) {
				padded.style.paddingRight = "";
				padded = null;
			}
			if (locked) {
				locked.style.paddingRight = `${scrollbarWidth}px`;
				padded = locked;
			}
		}

		const observer = new MutationObserver(sync);
		observer.observe(html, { attributes: true, attributeFilter: ["style"] });
		observer.observe(body, { attributes: true, attributeFilter: ["style"] });
		sync();

		return () => {
			observer.disconnect();
			if (padded) padded.style.paddingRight = "";
		};
	}, []);

	return null;
}

/** Width the classic scrollbar occupies, measured off-screen. */
function measureScrollbarWidth(): number {
	const probe = document.createElement("div");
	probe.style.cssText =
		"position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";
	document.body.appendChild(probe);
	const width = probe.offsetWidth - probe.clientWidth;
	probe.remove();
	return width;
}
