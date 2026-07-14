// Single source for the app's destinations and quick actions, shared by the
// sidebar, the command palette (⌘K) and the keyboard shortcuts.

import {
	House,
	Images,
	ListChecks,
	type LucideIcon,
	Paperclip,
	Settings,
	ShieldCheck,
	Store,
	Users,
	Wallet,
} from "lucide-react";

export type NavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
	/** Single-key shortcut that jumps here (shown as a hint on the rail). */
	shortcut?: string;
};

// Grouped for the sidebar; a faint hairline separates each group.
export const NAV_GROUPS: NavItem[][] = [
	[{ href: "/dashboard", label: "Início", icon: House, shortcut: "1" }],
	[
		{ href: "/checklist", label: "Checklist", icon: ListChecks, shortcut: "2" },
		{ href: "/convidados", label: "Convidados", icon: Users, shortcut: "3" },
		{ href: "/inspiracoes", label: "Inspirações", icon: Images, shortcut: "4" },
	],
	[
		{
			href: "/fornecedores",
			label: "Fornecedores",
			icon: Store,
			shortcut: "5",
		},
		{ href: "/financeiro", label: "Financeiro", icon: Wallet, shortcut: "6" },
		{ href: "/anexos", label: "Anexos", icon: Paperclip, shortcut: "7" },
	],
];

export const SETTINGS_ITEM: NavItem = {
	href: "/configuracoes",
	label: "Ajustes",
	icon: Settings,
	shortcut: "8",
};

// Only rendered for the platform superadmin (gated in AppNav).
export const ADMIN_ITEM: NavItem = {
	href: "/admin",
	label: "Administração",
	icon: ShieldCheck,
};

/** Flat list of every keyboard-reachable destination, in shortcut order. */
export const NAV_DESTINATIONS: NavItem[] = [
	...NAV_GROUPS.flat(),
	SETTINGS_ITEM,
];

export type QuickAction = { label: string; icon: LucideIcon; href: string };

// "Criar rápido" targets — each deep-links to a page that opens its create
// dialog when it sees `?criar=1` (see the pages' content components).
export const QUICK_ACTIONS: QuickAction[] = [
	{ label: "Novo fornecedor", icon: Store, href: "/fornecedores?criar=1" },
	{ label: "Nova tarefa", icon: ListChecks, href: "/checklist?criar=1" },
	{ label: "Novo convite", icon: Users, href: "/convidados?criar=1" },
];
