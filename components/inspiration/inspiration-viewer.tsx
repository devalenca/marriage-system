"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type ViewerImage = {
	id: string;
	url: string;
	caption?: string;
};

type InspirationViewerProps = {
	images: ViewerImage[];
	/** Index of the image being shown, or `null` when the viewer is closed. */
	index: number | null;
	onIndexChange: (index: number | null) => void;
};

/** Full-size viewer for a gallery image, with previous/next navigation. */
export function InspirationViewer({
	images,
	index,
	onIndexChange,
}: InspirationViewerProps) {
	const open = index !== null && index >= 0 && index < images.length;

	const step = useCallback(
		(delta: number) => {
			if (index === null || images.length === 0) return;
			onIndexChange((index + delta + images.length) % images.length);
		},
		[index, images.length, onIndexChange],
	);

	// Esc is the Dialog's job; the arrows are ours.
	useEffect(() => {
		if (!open) return;
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "ArrowRight") {
				event.preventDefault();
				step(1);
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				step(-1);
			}
		}
		// Capture: the Dialog popup stops arrow keys from bubbling up.
		document.addEventListener("keydown", handleKeyDown, true);
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [open, step]);

	if (index === null || !open) return null;
	const current = images[index];
	if (!current) return null;

	return (
		<Dialog
			open
			onOpenChange={(next) => {
				if (!next) onIndexChange(null);
			}}
		>
			<DialogContent className="gap-3 sm:max-w-3xl">
				<DialogTitle className="sr-only">
					{current.caption ?? "Imagem ampliada"}
				</DialogTitle>
				{/* biome-ignore lint/performance/noImgElement: Convex storage URLs are not statically known. */}
				<img
					src={current.url}
					alt={current.caption ?? "Inspiração"}
					className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
				/>
				{current.caption ? (
					<p className="text-pretty text-center text-sm text-muted-foreground">
						{current.caption}
					</p>
				) : null}
				{images.length > 1 ? (
					<div className="flex items-center justify-center gap-3">
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							aria-label="Imagem anterior"
							onClick={() => step(-1)}
						>
							<ChevronLeft aria-hidden />
						</Button>
						<span className="text-xs tabular-nums text-muted-foreground">
							{index + 1} de {images.length}
						</span>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							aria-label="Próxima imagem"
							onClick={() => step(1)}
						>
							<ChevronRight aria-hidden />
						</Button>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
