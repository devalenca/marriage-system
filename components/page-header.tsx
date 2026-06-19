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
	return (
		<header className="mb-6 flex items-start justify-between gap-4 rounded-[2rem] border border-border/60 bg-card/35 px-4 py-4 shadow-sm backdrop-blur-sm">
			<div>
				<h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
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
