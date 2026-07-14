"use client";

import { useQuery } from "convex/react";
import {
	House,
	Images,
	ListChecks,
	type LucideIcon,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Paperclip,
	Settings,
	ShieldCheck,
	Store,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label?: string; items: NavItem[] };

// Grouped so the list reads as sections instead of one long column.
const NAV_GROUPS: NavGroup[] = [
	{ items: [{ href: "/dashboard", label: "Início", icon: House }] },
	{
		label: "Planejamento",
		items: [
			{ href: "/checklist", label: "Checklist", icon: ListChecks },
			{ href: "/convidados", label: "Convidados", icon: Users },
			{ href: "/inspiracoes", label: "Inspirações", icon: Images },
		],
	},
	{
		label: "Finanças",
		items: [
			{ href: "/fornecedores", label: "Fornecedores", icon: Store },
			{ href: "/financeiro", label: "Financeiro", icon: Wallet },
			{ href: "/anexos", label: "Anexos", icon: Paperclip },
		],
	},
];

const SETTINGS_ITEM: NavItem = {
	href: "/configuracoes",
	label: "Ajustes",
	icon: Settings,
};

// Only rendered for the platform superadmin (gated in AppNav).
const ADMIN_ITEM: NavItem = {
	href: "/admin",
	label: "Administração",
	icon: ShieldCheck,
};

function isActive(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

/** A nav row for the mobile drawer — always shows its label. */
function NavLink({
	item,
	pathname,
	onNavigate,
}: {
	item: NavItem;
	pathname: string;
	onNavigate?: () => void;
}) {
	const { href, label, icon: Icon } = item;
	const active = isActive(pathname, href);
	return (
		<Link
			href={href}
			onClick={onNavigate}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex min-h-11 items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold transition-all active:translate-y-px",
				active
					? "bg-card/80 text-sidebar-primary shadow-sm ring-1 ring-sidebar-border"
					: "text-muted-foreground hover:bg-card/50 hover:text-foreground",
			)}
		>
			<span
				className={cn(
					"flex size-8 items-center justify-center rounded-full transition-colors",
					active ? "bg-primary/12 text-primary" : "bg-card/40 text-current",
				)}
			>
				<Icon className="size-4.5" aria-hidden />
			</span>
			{label}
		</Link>
	);
}

/** The grouped item list for the mobile sheet (labels always visible). */
function NavList({
	pathname,
	onNavigate,
	showAdmin,
}: {
	pathname: string;
	onNavigate?: () => void;
	showAdmin: boolean;
}) {
	return (
		<nav aria-label="Navegação principal" className="flex flex-1 flex-col">
			<div className="flex flex-col gap-4">
				{NAV_GROUPS.map((group, i) => (
					<div
						key={group.label ?? `group-${i}`}
						className="flex flex-col gap-1"
					>
						{group.label ? (
							<p className="px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
								{group.label}
							</p>
						) : null}
						{group.items.map((item) => (
							<NavLink
								key={item.href}
								item={item}
								pathname={pathname}
								onNavigate={onNavigate}
							/>
						))}
					</div>
				))}
			</div>
			<div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-3">
				{showAdmin ? (
					<NavLink
						item={ADMIN_ITEM}
						pathname={pathname}
						onNavigate={onNavigate}
					/>
				) : null}
				<NavLink
					item={SETTINGS_ITEM}
					pathname={pathname}
					onNavigate={onNavigate}
				/>
			</div>
		</nav>
	);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
	return (
		<span className="flex items-center gap-2.5">
			<span
				className={cn(
					"flex items-center justify-center rounded-[1.1rem] bg-primary/12 text-primary ring-1 ring-primary/15",
					compact ? "size-9" : "size-11",
				)}
			>
				<House className={compact ? "size-4" : "size-5"} aria-hidden />
			</span>
			<span>
				<span
					className={cn(
						"block font-display font-semibold leading-none text-primary",
						compact ? "text-lg" : "text-xl",
					)}
				>
					Nosso Casamento
				</span>
				{compact ? null : (
					<span className="mt-1 block text-xs font-medium text-muted-foreground">
						campo, céu e planos no lugar
					</span>
				)}
			</span>
		</span>
	);
}

/** A desktop rail row. When collapsed it's icon-only with a hover tooltip. */
function RailLink({
	item,
	pathname,
	collapsed,
}: {
	item: NavItem;
	pathname: string;
	collapsed: boolean;
}) {
	const { href, label, icon: Icon } = item;
	const active = isActive(pathname, href);

	const link = (
		<Link
			href={href}
			aria-label={collapsed ? label : undefined}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex items-center rounded-2xl font-semibold transition-colors active:translate-y-px",
				collapsed ? "justify-center p-1.5" : "gap-2.5 px-3 py-2 text-sm",
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
			{collapsed ? null : <span className="whitespace-nowrap">{label}</span>}
		</Link>
	);

	if (!collapsed) return link;
	return (
		<Tooltip>
			<TooltipTrigger render={link} />
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

/** Desktop nav: grouped rows; dividers when collapsed, headers when expanded. */
function RailNav({
	pathname,
	collapsed,
	showAdmin,
}: {
	pathname: string;
	collapsed: boolean;
	showAdmin: boolean;
}) {
	return (
		<nav
			aria-label="Navegação principal"
			className="flex flex-1 flex-col gap-1"
		>
			{NAV_GROUPS.map((group, i) => (
				<Fragment key={group.label ?? `group-${i}`}>
					{collapsed
						? i > 0 && <div className="mx-2 my-1 h-px bg-sidebar-border/70" />
						: group.label && (
								<p className="px-3 pt-2 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
									{group.label}
								</p>
							)}
					{group.items.map((item) => (
						<RailLink
							key={item.href}
							item={item}
							pathname={pathname}
							collapsed={collapsed}
						/>
					))}
				</Fragment>
			))}
			<div className="mt-auto flex flex-col gap-1">
				<div className="mx-2 my-1.5 h-px bg-sidebar-border/70" />
				{showAdmin ? (
					<RailLink
						item={ADMIN_ITEM}
						pathname={pathname}
						collapsed={collapsed}
					/>
				) : null}
				<RailLink
					item={SETTINGS_ITEM}
					pathname={pathname}
					collapsed={collapsed}
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
	const showAdmin = viewer?.isSuperadmin ?? false;

	// Close the mobile drawer whenever the route changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a body dep
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	return (
		<TooltipProvider delay={0}>
			{/* Mobile: slim top bar with a hamburger that opens a drawer. */}
			<header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/85 px-3 backdrop-blur-2xl md:hidden">
				<Link href="/dashboard" className="rounded-2xl px-1 py-1">
					<BrandMark compact />
				</Link>
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
						<div className="mb-5 px-1">
							<BrandMark />
						</div>
						<NavList
							pathname={pathname}
							onNavigate={() => setOpen(false)}
							showAdmin={showAdmin}
						/>
					</SheetContent>
				</Sheet>
			</header>

			{/* Desktop: collapsible sidebar toggled by a button. */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-50 hidden flex-col gap-3 border-r border-sidebar-border bg-sidebar/85 p-3 shadow-[18px_0_60px_oklch(0.32_0.07_132_/_0.12)] backdrop-blur-2xl transition-[width] duration-200 ease-out md:flex",
					collapsed ? "w-[4.75rem]" : "w-64",
				)}
			>
				<div
					className={cn(
						"flex items-center gap-2",
						collapsed ? "justify-center" : "justify-between",
					)}
				>
					{collapsed ? null : (
						<Link
							href="/dashboard"
							className="min-w-0 rounded-2xl p-1 transition-colors hover:bg-card/55"
						>
							<BrandMark compact />
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
				<RailNav
					pathname={pathname}
					collapsed={collapsed}
					showAdmin={showAdmin}
				/>
			</aside>
		</TooltipProvider>
	);
}
