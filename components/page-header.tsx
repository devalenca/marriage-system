import type { ReactNode } from "react";

export function PageHeader({
	title,
	subtitle,
	action,
}: {
	title: string;
	subtitle?: string;
	action?: ReactNode;
}) {
	/* The title and subtitle of every screen live here, over the field
	   photograph. At bg-card/35 the same heading measured 1.92:1 against the
	   grass and 15:1 against the sky — so the surface, not the ink, is what had
	   to change. The colour layer is what blocks the photo; the gradient over it
	   only repeats the accent tint the cards already carry, so the header reads
	   as the same paper they do in both themes. */
	return (
		<header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/95 bg-gradient-to-br from-transparent to-accent/20 px-4 py-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-start sm:justify-between sm:px-5">
			<div className="min-w-0">
				<h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-primary sm:text-3xl">
					{title}
				</h1>
				<div
					aria-hidden
					className="mt-2 h-1.5 w-24 rounded-full bg-gradient-to-r from-primary via-gold to-transparent"
				/>
				{subtitle ? (
					<p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
				) : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</header>
	);
}
