import {
	CircleCheck,
	CircleDollarSign,
	CircleX,
	FileCheck,
	FileText,
	Handshake,
	Search,
} from "lucide-react";
import { STATUS_LABELS, type VendorStatus } from "@/lib/domain/categories";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
	VendorStatus,
	{ className: string; icon: typeof Search }
> = {
	pesquisando: { className: "bg-muted text-muted-foreground", icon: Search },
	cotado: {
		className: "bg-secondary text-secondary-foreground",
		icon: FileText,
	},
	negociando: { className: "bg-warning/15 text-warning", icon: Handshake },
	fechado: { className: "bg-primary/12 text-primary", icon: FileCheck },
	parcialmente_pago: {
		className: "bg-gold/15 text-gold",
		icon: CircleDollarSign,
	},
	pago: { className: "bg-success/15 text-success", icon: CircleCheck },
	cancelado: {
		className: "bg-destructive/10 text-destructive",
		icon: CircleX,
	},
};

export function StatusBadge({
	status,
	className,
}: {
	status: VendorStatus;
	className?: string;
}) {
	const { className: styles, icon: Icon } = STATUS_STYLES[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
				styles,
				className,
			)}
		>
			<Icon className="size-3" aria-hidden />
			{STATUS_LABELS[status]}
		</span>
	);
}
