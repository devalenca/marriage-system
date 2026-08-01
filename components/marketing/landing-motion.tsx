"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Per-blob drift recipes for the hero's ambient gradient blobs. Values are
 * deliberately small (single-digit percents of the blob's own size) and the
 * periods are long and mutually prime-ish, so the three blobs never sync up
 * and the background reads as a slow, organic shimmer — not an animation.
 */
const BLOB_DRIFTS = [
	{ xPercent: 7, yPercent: -9, scale: 1.07, rotation: 8, duration: 19 },
	{ xPercent: -9, yPercent: 7, scale: 1.11, rotation: -10, duration: 23 },
	{ xPercent: 6, yPercent: 9, scale: 1.05, rotation: 6, duration: 17 },
] as const;

/**
 * The landing page's motion layer. Renders nothing — it animates the
 * server-rendered markup via data attributes so the page stays crawlable
 * and works without JavaScript:
 *
 * - `data-hero-nav` / `data-hero-item` / `data-hero-bar` / `data-hero-visual`
 *   compose the entrance timeline (staggered fade + vertical lift).
 * - `data-hero-ambient` / `data-hero-blob` — the hero's slow-drifting
 *   gradient blobs (styled in globals.css; only `transform` is animated,
 *   the blur is a static `filter` on the element).
 * - `data-reveal` fades a block in when it scrolls into view (once).
 * - `data-reveal-stagger` does the same for a container's children, staggered.
 * - `data-parallax="<n>"` drifts an element ±n% vertically while it crosses
 *   the viewport (scrub-linked, transform-only).
 * - `data-floating-cta` slides in after the hero scrolls away (mobile CTA).
 *
 * Degradation strategy (one `gsap.matchMedia`, two tiers):
 * 1. `prefers-reduced-motion: reduce` — nothing here runs; the user gets the
 *    fully static page (the CSS kill-switch in globals.css backs this up).
 * 2. Mobile (< 768px) — only the cheap one-shot motion runs: hero entrance,
 *    scroll reveals and the floating CTA. Scroll-scrubbed parallax and the
 *    looping blob drift are desktop-only, so phones never carry a persistent
 *    tween or a scrub listener; the blobs stay as a static painted-once
 *    backdrop.
 *
 * Everything animates compositor-friendly properties only (transform /
 * opacity) to hold 60fps, and reveals use `once: true` so their triggers are
 * released after firing. GSAP's rAF-driven ticker pauses in hidden tabs, so
 * the infinite blob tweens cost nothing while the page is backgrounded.
 */
export function LandingMotion() {
	useGSAP(() => {
		const mm = gsap.matchMedia();

		// --- Tier 1: every viewport, motion allowed. One-shot animations only.
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			// Hero entrance: ambient glows breathe in, nav drops, copy staggers
			// up, visual follows. One shared power3/expo signature.
			const entrance = gsap.timeline({
				defaults: { ease: "power3.out", duration: 0.7 },
			});
			entrance
				.from("[data-hero-ambient]", {
					autoAlpha: 0,
					duration: 1.6,
					ease: "power2.out",
				})
				.from("[data-hero-nav]", { y: -14, autoAlpha: 0, duration: 0.5 }, 0)
				.from("[data-hero-item]", { y: 28, autoAlpha: 0, stagger: 0.09 }, 0.3)
				.from(
					"[data-hero-bar]",
					{ scaleX: 0, transformOrigin: "left center", duration: 0.6 },
					"<0.25",
				)
				.from(
					"[data-hero-visual]",
					{ y: 44, autoAlpha: 0, scale: 0.96, duration: 0.9, ease: "expo.out" },
					"-=0.55",
				);

			// Scroll-driven reveals (fire once; no scrub, so cheap).
			for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
				gsap.from(el, {
					y: 32,
					autoAlpha: 0,
					duration: 0.8,
					ease: "power3.out",
					scrollTrigger: { trigger: el, start: "top 86%", once: true },
				});
			}

			for (const group of gsap.utils.toArray<HTMLElement>(
				"[data-reveal-stagger]",
			)) {
				gsap.from(group.children, {
					y: 26,
					autoAlpha: 0,
					duration: 0.7,
					ease: "power3.out",
					stagger: 0.1,
					scrollTrigger: { trigger: group, start: "top 84%", once: true },
				});
			}

			// Floating mobile CTA: appears once the hero CTAs scroll away.
			const floating = document.querySelector("[data-floating-cta]");
			const hero = document.querySelector("[data-hero-section]");
			if (floating && hero) {
				gsap.set(floating, { autoAlpha: 0, y: 18 });
				ScrollTrigger.create({
					trigger: hero,
					start: "bottom 35%",
					onEnter: () =>
						gsap.to(floating, {
							autoAlpha: 1,
							y: 0,
							duration: 0.45,
							ease: "power3.out",
						}),
					onLeaveBack: () =>
						gsap.to(floating, {
							autoAlpha: 0,
							y: 18,
							duration: 0.35,
							ease: "power3.in",
						}),
				});
			}
		});

		// --- Tier 2: desktop only. Persistent/scrubbed motion that would waste
		// battery on phones: parallax drift and the hero's ambient blob loop.
		mm.add(
			"(prefers-reduced-motion: no-preference) and (min-width: 768px)",
			() => {
				// Gentle parallax drift, transform-only and scrub-smoothed.
				for (const el of gsap.utils.toArray<HTMLElement>("[data-parallax]")) {
					const amount = Number(el.dataset.parallax) || 6;
					gsap.fromTo(
						el,
						{ yPercent: amount },
						{
							yPercent: -amount,
							ease: "none",
							scrollTrigger: {
								trigger: el,
								start: "top bottom",
								end: "bottom top",
								scrub: 1.1,
							},
						},
					);
				}

				// Hero ambient: each blob drifts on its own slow sine loop.
				gsap.utils
					.toArray<HTMLElement>("[data-hero-blob]")
					.forEach((blob, index) => {
						const drift =
							BLOB_DRIFTS[index % BLOB_DRIFTS.length] ?? BLOB_DRIFTS[0];
						gsap.to(blob, {
							xPercent: drift.xPercent,
							yPercent: drift.yPercent,
							scale: drift.scale,
							rotation: drift.rotation,
							duration: drift.duration,
							ease: "sine.inOut",
							repeat: -1,
							yoyo: true,
						});
					});
			},
		);

		return () => mm.revert();
	});

	return null;
}
