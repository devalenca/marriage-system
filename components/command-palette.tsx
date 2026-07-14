"use client";

import { CornerDownLeft, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	NAV_DESTINATIONS,
	QUICK_ACTIONS,
	type QuickAction,
} from "@/components/nav-config";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Custom event other components dispatch to open the palette (e.g. buttons). */
export const OPEN_COMMAND_PALETTE = "open-command-palette";

type Command = {
	id: string;
	label: string;
	group: "Ir para" | "Criar";
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	href: string;
};

function buildCommands(): Command[] {
	const go: Command[] = NAV_DESTINATIONS.map((item) => ({
		id: `go:${item.href}`,
		label: item.label,
		group: "Ir para",
		icon: item.icon,
		href: item.href,
	}));
	const create: Command[] = QUICK_ACTIONS.map((action: QuickAction) => ({
		id: `new:${action.href}`,
		label: action.label,
		group: "Criar",
		icon: action.icon,
		href: action.href,
	}));
	return [...create, ...go];
}

function normalize(text: string): string {
	return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * ⌘K / Ctrl+K command palette: search and jump to any section or quick-create
 * action. Rendered once in the app shell; opened by the shortcut or by any
 * button that dispatches the OPEN_COMMAND_PALETTE event.
 */
export function CommandPalette() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);

	const commands = useMemo(buildCommands, []);
	const results = useMemo(() => {
		const q = normalize(query.trim());
		if (q.length === 0) return commands;
		return commands.filter((c) => normalize(c.label).includes(q));
	}, [commands, query]);

	// Open on ⌘K / Ctrl+K, and on the shared open event from other buttons.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((prev) => !prev);
			}
		}
		function onOpen() {
			setOpen(true);
		}
		window.addEventListener("keydown", onKey);
		window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
		};
	}, []);

	// Reset query/selection each time it opens.
	useEffect(() => {
		if (open) {
			setQuery("");
			setSelected(0);
		}
	}, [open]);

	// Keep the selection in range as results shrink.
	useEffect(() => {
		setSelected((prev) => Math.min(prev, Math.max(0, results.length - 1)));
	}, [results.length]);

	const run = useCallback(
		(command: Command | undefined) => {
			if (!command) return;
			setOpen(false);
			router.push(command.href);
		},
		[router],
	);

	function onInputKeyDown(event: React.KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelected((prev) => Math.min(prev + 1, results.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelected((prev) => Math.max(prev - 1, 0));
		} else if (event.key === "Enter") {
			event.preventDefault();
			run(results[selected]);
		}
	}

	// Scroll the active row into view as the selection moves.
	useEffect(() => {
		const node = listRef.current?.querySelector<HTMLElement>(
			`[data-index="${selected}"]`,
		);
		node?.scrollIntoView({ block: "nearest" });
	}, [selected]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent
				className="top-[12vh] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Buscar e criar</DialogTitle>
				<DialogDescription className="sr-only">
					Busque uma seção ou uma ação e pressione Enter.
				</DialogDescription>
				<div className="flex items-center gap-2 border-b border-border px-3">
					<Search
						className="size-4.5 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<Input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onInputKeyDown}
						placeholder="Buscar seção ou ação…"
						aria-label="Buscar seção ou ação"
						className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
					/>
				</div>

				<div
					ref={listRef}
					className="max-h-[min(24rem,60vh)] overflow-y-auto p-2"
				>
					{results.length === 0 ? (
						<p className="px-3 py-6 text-center text-sm text-muted-foreground">
							Nada encontrado para “{query}”.
						</p>
					) : (
						results.map((command, index) => {
							const Icon = command.icon;
							const isSelected = index === selected;
							const isCreate = command.group === "Criar";
							return (
								<button
									key={command.id}
									type="button"
									data-index={index}
									onMouseMove={() => setSelected(index)}
									onClick={() => run(command)}
									className={cn(
										"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
										isSelected
											? "bg-primary/10 text-foreground"
											: "text-muted-foreground",
									)}
								>
									<span
										className={cn(
											"flex size-8 shrink-0 items-center justify-center rounded-full",
											isSelected ? "bg-primary/15 text-primary" : "bg-card/60",
										)}
									>
										{isCreate ? (
											<Plus className="size-4" aria-hidden />
										) : (
											<Icon className="size-4" aria-hidden />
										)}
									</span>
									<span className="flex-1 truncate">{command.label}</span>
									<span className="text-xs text-muted-foreground/70">
										{command.group}
									</span>
									{isSelected ? (
										<CornerDownLeft
											className="size-4 text-muted-foreground/70"
											aria-hidden
										/>
									) : null}
								</button>
							);
						})
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
