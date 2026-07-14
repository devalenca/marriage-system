"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QUICK_ACTIONS } from "@/components/nav-config";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

/** Event any "+" button dispatches to open the quick-create menu. */
export const OPEN_QUICK_CREATE = "open-quick-create";

/**
 * Fast "criar rápido" menu: from anywhere, create a vendor, task or invite.
 * Rendered once in the app shell; opened by any button that dispatches
 * OPEN_QUICK_CREATE. Each action deep-links to a page that opens its create
 * dialog on `?criar=1`.
 */
export function QuickCreateMenu() {
	const router = useRouter();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function onOpen() {
			setOpen(true);
		}
		window.addEventListener(OPEN_QUICK_CREATE, onOpen);
		return () => window.removeEventListener(OPEN_QUICK_CREATE, onOpen);
	}, []);

	function go(href: string) {
		setOpen(false);
		router.push(href);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-xs">
				<DialogHeader>
					<DialogTitle className="font-display text-lg">
						Criar rápido
					</DialogTitle>
					<DialogDescription>
						O que você quer adicionar agora?
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					{QUICK_ACTIONS.map((action) => {
						const Icon = action.icon;
						return (
							<button
								key={action.href}
								type="button"
								onClick={() => go(action.href)}
								className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card/55 px-4 text-left text-sm font-semibold transition-colors hover:bg-card/80"
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
									<Icon className="size-4.5" aria-hidden />
								</span>
								{action.label}
							</button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
