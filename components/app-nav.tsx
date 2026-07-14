"use client";

import { useQuery } from "convex/react";
import {
	House,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { OPEN_COMMAND_PALETTE } from "@/components/command-palette";
import {
	ADMIN_ITEM,
	NAV_GROUPS,
	type NavItem,
	SETTINGS_ITEM,
} from "@/components/nav-config";
import { OPEN_QUICK_CREATE } from "@/components/quick-create-menu";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { daysBetween, formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

function openPalette() {
	window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE));
}

function openQuickCreate() {
	window.dispatchEvent(new Event(OPEN_QUICK_CREATE));
}

function isActive(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/** The couple's own line under their names, e.g. "faltam 124 dias". */
function countdownLabel(weddingDate: string): string {
	const days = daysBetween(todayInSaoPaulo(), weddingDate);
	if (days > 1) return `faltam ${days} dias`;
	if (days === 1) return "falta 1 dia";
	if (days === 0) return "é hoje";
	return formatDateBR(weddingDate);
}

type Identity = { coupleNames: string; weddingDate: string } | null | undefined;

/**
 * The personalized identity: the couple's names in the display face plus their
 * countdown. Falls back to the product name before a wedding is loaded.
 */
function BrandIdentity({ identity }: { identity: Identity }) {
	const names = identity?.coupleNames ?? "Nosso Casamento";
	const sub = identity
		? countdownLabel(identity.weddingDate)
		: "planejamento do casamento";
	return (
		<span className="flex min-w-0 flex-col">
			<span className="truncate font-display text-lg font-semibold leading-tight text-primary">
				{names}
			</span>
			<span className="truncate text-xs font-medium text-muted-foreground">
				{sub}
			</span>
		</span>
	);
}

function BrandIcon({ size = "md" }: { size?: "sm" | "md" }) {
	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center rounded-[1.1rem] bg-primary/12 text-primary ring-1 ring-primary/15",
				size === "sm" ? "size-9" : "size-10",
			)}
		>
			<House className={size === "sm" ? "size-4" : "size-4.5"} aria-hidden />
		</span>
	);
}

/** One nav row. Collapsed on the desktop rail, it becomes an icon + tooltip. */
function NavRow({
	item,
	pathname,
	collapsed = false,
	onNavigate,
}: {
	item: NavItem;
	pathname: string;
	collapsed?: boolean;
	onNavigate?: () => void;
}) {
	const { href, label, icon: Icon, shortcut } = item;
	const active = isActive(pathname, href);

	const link = (
		<Link
			href={href}
			onClick={onNavigate}
			aria-label={collapsed ? label : undefined}
			aria-current={active ? "page" : undefined}
			className={cn(
				"group flex items-center rounded-2xl font-semibold transition-colors active:translate-y-px",
				collapsed
					? "justify-center p-1.5"
					: "min-h-11 gap-2.5 px-3 py-2 text-sm",
				active
					? "bg-card/80 text-sidebar-primary shadow-sm ring-1 ring-sidebar-border"
					: "text-muted-foreground hover:bg-card/50 hover:text-foreground",
			)}
		>
			<span
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
					active ? "bg-primary/12 text-primary" : "bg-card/40 text-current",
				)}
			>
				<Icon className="size-4.5" aria-hidden />
			</span>
			{collapsed ? null : (
				<>
					<span className="flex-1 truncate">{label}</span>
					{shortcut ? (
						<kbd className="hidden shrink-0 rounded-md border border-sidebar-border bg-card/60 px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground/70 group-hover:inline-block">
							{shortcut}
						</kbd>
					) : null}
				</>
			)}
		</Link>
	);

	if (!collapsed) return link;
	return (
		<Tooltip>
			<TooltipTrigger render={link} />
			<TooltipContent side="right">
				{label}
				{shortcut ? (
					<span className="ml-1.5 opacity-70">{shortcut}</span>
				) : null}
			</TooltipContent>
		</Tooltip>
	);
}

function Hairline() {
	return <div className="mx-3 my-1.5 h-px bg-sidebar-border/60" />;
}

/** Search (⌘K/Ctrl+K palette) and quick-create (+) controls for the sidebar. */
function NavToolbar({ collapsed }: { collapsed: boolean }) {
	if (collapsed) {
		return (
			<div className="flex flex-col items-center gap-1">
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon"
								aria-label="Buscar (Ctrl+K)"
								onClick={openPalette}
							/>
						}
					>
						<Search aria-hidden />
					</TooltipTrigger>
					<TooltipContent side="right">Buscar · Ctrl K</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon"
								aria-label="Criar rápido"
								onClick={openQuickCreate}
							/>
						}
					>
						<Plus aria-hidden />
					</TooltipTrigger>
					<TooltipContent side="right">Criar rápido</TooltipContent>
				</Tooltip>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-1.5">
			<Button
				variant="outline"
				onClick={openPalette}
				className="h-10 flex-1 justify-start gap-2 rounded-2xl bg-card/50 font-normal text-muted-foreground"
			>
				<Search className="size-4" aria-hidden />
				<span className="text-sm">Buscar</span>
				<kbd className="ml-auto rounded-md border border-border bg-card/70 px-1.5 py-0.5 font-sans text-[11px] font-medium">
					Ctrl K
				</kbd>
			</Button>
			<Button
				variant="outline"
				size="icon"
				onClick={openQuickCreate}
				aria-label="Criar rápido"
				className="size-10 rounded-2xl"
			>
				<Plus aria-hidden />
			</Button>
		</div>
	);
}

/** The shared item list: three groups, a hairline between each. */
function NavItems({
	pathname,
	collapsed = false,
	showAdmin,
	onNavigate,
}: {
	pathname: string;
	collapsed?: boolean;
	showAdmin: boolean;
	onNavigate?: () => void;
}) {
	return (
		<nav
			aria-label="Navegação principal"
			className="flex min-h-0 flex-1 flex-col gap-1"
		>
			{/* The main groups scroll when they outgrow the viewport, so nothing
			    (least of all Ajustes below) is ever pushed out of reach. */}
			<div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
				{NAV_GROUPS.map((group, i) => (
					<Fragment key={group[0]?.href ?? i}>
						{i > 0 ? <Hairline /> : null}
						{group.map((item) => (
							<NavRow
								key={item.href}
								item={item}
								pathname={pathname}
								collapsed={collapsed}
								onNavigate={onNavigate}
							/>
						))}
					</Fragment>
				))}
			</div>
			{/* Ajustes (and Administração) stay pinned at the bottom. */}
			<div className="flex shrink-0 flex-col gap-1 pt-1">
				<Hairline />
				{showAdmin ? (
					<NavRow
						item={ADMIN_ITEM}
						pathname={pathname}
						collapsed={collapsed}
						onNavigate={onNavigate}
					/>
				) : null}
				<NavRow
					item={SETTINGS_ITEM}
					pathname={pathname}
					collapsed={collapsed}
					onNavigate={onNavigate}
				/>
			</div>
		</nav>
	);
}

export function AppNav({
	collapsed,
	onToggle,
}: {
	collapsed: boolean;
	onToggle: () => void;
}) {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const viewer = useQuery(api.users.viewer, {});
	const identity = useQuery(api.weddings.currentIdentity, {});
	const showAdmin = viewer?.isSuperadmin ?? false;

	// Close the mobile drawer whenever the route changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a body dep
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	return (
		<TooltipProvider delay={0}>
			{/* Mobile: slim top bar with the couple's names and a drawer trigger. */}
			<header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar/85 px-3 backdrop-blur-2xl md:hidden">
				<Link
					href="/dashboard"
					className="flex min-w-0 items-center gap-2.5 rounded-2xl px-1 py-1"
				>
					<BrandIcon size="sm" />
					<BrandIdentity identity={identity} />
				</Link>
				<div className="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Buscar"
						onClick={openPalette}
					>
						<Search aria-hidden />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Criar rápido"
						onClick={openQuickCreate}
					>
						<Plus aria-hidden />
					</Button>
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							render={
								<Button variant="ghost" size="icon" aria-label="Abrir menu" />
							}
						>
							<Menu aria-hidden />
						</SheetTrigger>
						<SheetContent
							side="left"
							className="w-[17rem] gap-0 border-sidebar-border bg-sidebar/95 p-4 backdrop-blur-2xl"
						>
							<SheetTitle className="sr-only">Menu de navegação</SheetTitle>
							<SheetDescription className="sr-only">
								Acesse as seções do planejamento do casamento.
							</SheetDescription>
							<div className="mb-5 flex items-center gap-2.5 px-1">
								<BrandIcon />
								<BrandIdentity identity={identity} />
							</div>
							<NavItems
								pathname={pathname}
								showAdmin={showAdmin}
								onNavigate={() => setOpen(false)}
							/>
						</SheetContent>
					</Sheet>
				</div>
			</header>

			{/* Desktop: collapsible sidebar. */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-50 hidden flex-col gap-3 border-r border-sidebar-border bg-sidebar/85 p-3 shadow-[18px_0_60px_oklch(0.32_0.07_132_/_0.12)] backdrop-blur-2xl transition-[width] duration-200 ease-out md:flex",
					collapsed ? "w-[4.75rem]" : "w-64",
				)}
			>
				{/* Utility row: brand icon + collapse toggle. The identity block
				    below gets the full width so the couple's names never wrap. */}
				<div
					className={cn(
						"flex items-center gap-2",
						collapsed ? "flex-col" : "justify-between",
					)}
				>
					{collapsed ? (
						<BrandIcon />
					) : (
						<Link
							href="/dashboard"
							className="rounded-2xl p-1 transition-colors hover:bg-card/55"
						>
							<BrandIcon />
						</Link>
					)}
					<Button
						variant="ghost"
						size="icon"
						onClick={onToggle}
						aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
						aria-expanded={!collapsed}
					>
						{collapsed ? (
							<PanelLeftOpen aria-hidden />
						) : (
							<PanelLeftClose aria-hidden />
						)}
					</Button>
				</div>

				{collapsed ? null : (
					<Link
						href="/dashboard"
						className="rounded-2xl px-1 transition-colors hover:bg-card/40"
					>
						<BrandIdentity identity={identity} />
					</Link>
				)}

				<NavToolbar collapsed={collapsed} />

				<NavItems
					pathname={pathname}
					collapsed={collapsed}
					showAdmin={showAdmin}
				/>
			</aside>
		</TooltipProvider>
	);
}
