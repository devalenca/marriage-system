"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

/**
 * Centered destructive confirmation. A terracotta warning icon, serif title,
 * muted description, then two equal buttons: "Manter" (cancel) and the
 * destructive confirm action.
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
	busy,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	busy?: boolean;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="gap-0 rounded-3xl p-6 text-center"
			>
				<div
					className="mx-auto mb-3.5 flex size-[54px] items-center justify-center rounded-full bg-[#f7e3de] text-destructive"
					aria-hidden
				>
					<TriangleAlert className="size-6" />
				</div>
				<DialogHeader className="items-center gap-2">
					<DialogTitle className="font-display text-[22px] leading-tight font-semibold">
						{title}
					</DialogTitle>
					<DialogDescription className="text-[13.5px] leading-relaxed">
						{description}
					</DialogDescription>
				</DialogHeader>
				<div className="mt-6 flex gap-2.5">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="h-11 flex-1 rounded-xl"
					>
						Manter
					</Button>
					<Button
						type="button"
						onClick={onConfirm}
						disabled={busy}
						className="h-11 flex-1 rounded-xl bg-destructive font-semibold text-white hover:bg-destructive/90"
					>
						{confirmLabel}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
