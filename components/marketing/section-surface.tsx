import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Paper for landing copy that would otherwise stand directly on the page's
 * fixed field photograph.
 *
 * Darkening the ink cannot fix that copy: the same six labels measured 1.92:1
 * over grass and 15.3:1 over sky, purely because of where they happened to fall
 * on the picture — one scroll later the same ink sits somewhere else and
 * disappears again. So a heading and its supporting paragraph get a surface of
 * their own, built from the two layers the app's cards and page headers already
 * use: a near-opaque colour that blocks the photo, and the accent tint over it.
 * The photograph stays exactly what it was — the environment around the paper,
 * visible in the gutters and between the panels.
 *
 * Same material in both themes on purpose. Dark mode drops the photo, but
 * `--card` there is one step up from the page ground, so the panel reads as the
 * raised paper the cards beside it already are — not as a slab that only makes
 * sense in the light theme.
 *
 * `bg-linear-to-br`, not the deprecated `bg-gradient-to-br`: these classes go
 * through `cn`, and tailwind-merge reads the old name as a conflict with
 * `bg-card/95` and drops the colour layer — which is the one layer actually
 * blocking the photograph. The v4 name is understood as `background-image` and
 * the two compose, as they must.
 */
export function SectionSurface({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"rounded-[2rem] border border-border/60 bg-card/95 bg-linear-to-br from-transparent to-accent/20 px-6 py-7 shadow-sm backdrop-blur-sm sm:px-8 sm:py-8",
				className,
			)}
			{...props}
		/>
	);
}
