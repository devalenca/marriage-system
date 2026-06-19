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
		<header className="mb-6 flex items-start justify-between gap-4">
			<div>
				<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				<div
					aria-hidden
					className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-primary via-gold to-transparent"
				/>
				{subtitle ? (
					<p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
				) : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</header>
	);
}
