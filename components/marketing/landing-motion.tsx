"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type RevealGesture = { from: gsap.TweenVars; to: gsap.TweenVars };

/**
 * Arrival gestures for the scroll reveals, selected by the *value* of
 * `data-reveal` / `data-reveal-stagger`. A bare attribute keeps the original
 * lift, so every existing call site is untouched; the named variants give
 * section headings (`mask`) and card grids (`scale`) a gesture of their own
 * instead of repeating one fade-up down the whole page.
 *
 * `clearProps` is not cosmetic: GSAP leaves the resolved transform inline when
 * a tween ends, and an inline transform outranks the `:hover` transform that
 * `.landing-card` / `.landing-tile` declare in the stylesheet. Clearing it
 * hands the hover lift back to CSS once the element has arrived.
 */
const REVEAL_GESTURES: Record<"default" | "mask" | "scale", RevealGesture> = {
	default: {
		from: { y: 32, autoAlpha: 0 },
		to: {
			y: 0,
			autoAlpha: 1,
			duration: 0.8,
			ease: "power3.out",
			clearProps: "transform",
		},
	},
	// Headings wipe up from their own baseline — no drift, just reveal.
	mask: {
		from: { y: 14, autoAlpha: 0, clipPath: "inset(0% 0% 100% 0%)" },
		to: {
			y: 0,
			autoAlpha: 1,
			clipPath: "inset(0% 0% 0% 0%)",
			duration: 0.95,
			ease: "power4.out",
			clearProps: "transform,clipPath",
		},
	},
	// Card grids settle in from slightly under-scaled, so a row of panels
	// reads as objects landing rather than text fading.
	scale: {
		from: { y: 22, scale: 0.955, autoAlpha: 0 },
		to: {
			y: 0,
			scale: 1,
			autoAlpha: 1,
			duration: 0.78,
			ease: "power3.out",
			clearProps: "transform",
		},
	},
};

/** `data-reveal` with no value renders as `"true"` — that is the default. */
function gestureFor(value: string | undefined): RevealGesture {
	if (value === "mask") return REVEAL_GESTURES.mask;
	if (value === "scale") return REVEAL_GESTURES.scale;
	return REVEAL_GESTURES.default;
}

/**
 * The landing page's motion layer. Renders nothing — it animates the
 * server-rendered markup via data attributes so the page stays crawlable
 * and works without JavaScript:
 *
 * - `data-hero-nav` / `data-hero-item` / `data-hero-bar` / `data-hero-visual`
 *   compose the entrance timeline (staggered fade + vertical lift). The bars
 *   are the kicker's flanking dashes, so they grow from their center; the
 *   visual is the framed ProductDemo wrapper — the demo animates its own
 *   interior (`data-demo-*` hooks live in product-demo.tsx, and nothing here
 *   selects inside the frame).
 * - `data-reveal` fades a block in when it scrolls into view (once). Its value
 *   picks the gesture: none/`"true"` = lift, `"mask"` = wipe, `"scale"` = land.
 * - `data-reveal-stagger` does the same for a container's children, staggered,
 *   and reads the same variant vocabulary.
 * - `data-parallax="<n>"` drifts an element ±n% vertically while it crosses
 *   the viewport (scrub-linked, transform-only).
 * - `data-floating-cta` slides in after the hero scrolls away (mobile CTA).
 *
 * Degradation strategy (one `gsap.matchMedia`, two tiers):
 * 1. `prefers-reduced-motion: reduce` — nothing here runs; the user gets the
 *    fully static page (the CSS kill-switch in globals.css backs this up).
 * 2. Mobile (< 768px) — only the cheap one-shot motion runs: hero entrance,
 *    scroll reveals and the floating CTA. Scroll-scrubbed parallax is
 *    desktop-only, so phones never carry a scrub listener.
 *
 * Everything animates compositor-friendly properties only (transform /
 * opacity) to hold 60fps, and reveals use `once: true` so their triggers are
 * released after firing.
 */
export function LandingMotion() {
	useGSAP(() => {
		const mm = gsap.matchMedia();

		// --- Tier 1: every viewport, motion allowed. One-shot animations only.
		mm.add("(prefers-reduced-motion: no-preference)", () => {
			// Hero entrance: nav drops, copy staggers up, the kicker's dashes
			// grow from their center, and the framed demo rises last. One shared
			// power3/expo signature. The demo's interior animates itself.
			const entrance = gsap.timeline({
				defaults: { ease: "power3.out", duration: 0.7 },
			});
			entrance
				.from("[data-hero-nav]", { y: -14, autoAlpha: 0, duration: 0.5 }, 0)
				.from("[data-hero-item]", { y: 28, autoAlpha: 0, stagger: 0.09 }, 0.3)
				.from(
					"[data-hero-bar]",
					{ scaleX: 0, transformOrigin: "center center", duration: 0.6 },
					"<0.25",
				)
				.from(
					"[data-hero-visual]",
					{ y: 44, autoAlpha: 0, scale: 0.96, duration: 0.9, ease: "expo.out" },
					"-=0.55",
				);

			// Scroll-driven reveals (fire once; no scrub, so cheap). The gesture
			// is chosen per call site, so a section heading and a row of cards
			// no longer arrive with the identical fade-up.
			for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
				const gesture = gestureFor(el.dataset.reveal);
				gsap.fromTo(el, gesture.from, {
					...gesture.to,
					scrollTrigger: { trigger: el, start: "top 86%", once: true },
				});
			}

			for (const group of gsap.utils.toArray<HTMLElement>(
				"[data-reveal-stagger]",
			)) {
				const gesture = gestureFor(group.dataset.revealStagger);
				gsap.fromTo(group.children, gesture.from, {
					...gesture.to,
					duration: 0.7,
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

		// --- Tier 2: desktop only. Scrubbed motion that would waste battery on
		// phones: the parallax drift.
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
			},
		);

		return () => mm.revert();
	});

	return null;
}
