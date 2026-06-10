import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

/** Labeled money figure used in KPI grids (dashboard, vendor page). */
export function ValueItem({
	label,
	value,
	tone,
}: {
	label: string;
	value: number | undefined;
	tone?: string;
}) {
	return (
		<div>
			<dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
				{label}
			</dt>
			<dd className={cn("text-sm font-semibold tabular-nums", tone)}>
				{value !== undefined ? formatBRL(value) : "—"}
			</dd>
		</div>
	);
}
