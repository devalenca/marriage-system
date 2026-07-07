"use client";

import {
	House,
	Images,
	ListChecks,
	type LucideIcon,
	Menu,
	Paperclip,
	Settings,
	Store,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
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

function isActive(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

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
				"flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold transition-all",
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

/** The grouped item list, shared by the desktop sidebar and the mobile sheet. */
function NavList({
	pathname,
	onNavigate,
}: {
	pathname: string;
	onNavigate?: () => void;
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
			<div className="mt-auto border-t border-sidebar-border pt-3">
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

export function AppNav() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	// Close the mobile drawer whenever the route changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a body dep
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	return (
		<>
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
						<NavList pathname={pathname} onNavigate={() => setOpen(false)} />
					</SheetContent>
				</Sheet>
			</header>

			{/* Desktop: thin fixed sidebar. */}
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-5 border-r border-sidebar-border bg-sidebar/75 p-4 shadow-[18px_0_60px_oklch(0.32_0.07_132_/_0.12)] backdrop-blur-2xl md:flex">
				<Link
					href="/dashboard"
					className="rounded-[1.5rem] border border-sidebar-border bg-card/55 p-3 shadow-sm transition-colors hover:bg-card/70"
				>
					<BrandMark />
				</Link>
				<NavList pathname={pathname} />
			</aside>
		</>
	);
}
