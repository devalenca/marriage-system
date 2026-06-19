"use client";

import { useQuery } from "convex/react";
import {
	CalendarDays,
	House,
	ListChecks,
	Settings,
	Store,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Início", short: "Início", icon: House },
	{ href: "/agenda", label: "Agenda", short: "Agenda", icon: CalendarDays },
	{
		href: "/fornecedores",
		label: "Fornecedores",
		short: "Fornec.",
		icon: Store,
	},
	{ href: "/financeiro", label: "Financeiro", short: "Financ.", icon: Wallet },
	{ href: "/checklist", label: "Checklist", short: "Check.", icon: ListChecks },
	{
		href: "/configuracoes",
		label: "Ajustes",
		short: "Ajustes",
		icon: Settings,
	},
] as const;

/** Hand-drawn line icons matching the Painel Navegável handoff (20×20, currentColor). */
function DesktopNavIcon({ href }: { href: string }) {
	const common = {
		width: 20,
		height: 20,
		viewBox: "0 0 20 20",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.6,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		className: "shrink-0",
	};
	switch (href) {
		case "/dashboard":
			return (
				<svg {...common} aria-hidden="true">
					<path d="M3 8.5 L10 3 L17 8.5" />
					<path d="M5 8 V16 H15 V8" />
				</svg>
			);
		case "/agenda":
			return (
				<svg {...common} aria-hidden="true">
					<rect x="3.5" y="4.5" width="13" height="12" rx="2" />
					<path d="M3.5 8 H16.5" />
					<path d="M7 3 V5.5 M13 3 V5.5" />
				</svg>
			);
		case "/fornecedores":
			return (
				<svg {...common} aria-hidden="true">
					<path d="M5.5 7 H14.5 L15.5 16.5 H4.5 Z" />
					<path d="M7.5 7 V5.5 a2.5 2.5 0 0 1 5 0 V7" />
				</svg>
			);
		case "/financeiro":
			return (
				<svg {...common} aria-hidden="true">
					<rect x="3.5" y="5.5" width="13" height="10" rx="2.5" />
					<path d="M12.5 10.5 H16.5" />
					<circle
						cx="13.2"
						cy="10.5"
						r="0.6"
						fill="currentColor"
						stroke="none"
					/>
				</svg>
			);
		case "/checklist":
			return (
				<svg {...common} aria-hidden="true">
					<rect x="3.5" y="4.5" width="13" height="13" rx="3" />
					<path d="M6.5 10 L9 12.5 L13.5 7.5" />
				</svg>
			);
		default:
			return (
				<svg {...common} aria-hidden="true">
					<path d="M4 7 H16 M4 13 H16" />
					<circle cx="8" cy="7" r="1.9" fill="#fbf8f1" />
					<circle cx="12.5" cy="13" r="1.9" fill="#fbf8f1" />
				</svg>
			);
	}
}

export function AppNav({
	collapsed,
	onToggle,
	animate,
}: {
	collapsed: boolean;
	onToggle: () => void;
	animate: boolean;
}) {
	const pathname = usePathname();
	const settings = useQuery(api.settings.get, {});
	const coupleNames = settings?.coupleNames;

	return (
		<>
			<nav
				aria-label="Navegação principal"
				className="fixed inset-x-3 bottom-3 z-40 rounded-[1.375rem] border border-sidebar-border bg-sidebar shadow-[0_6px_20px_rgba(46,38,32,.1)] md:hidden"
			>
				<ul className="grid grid-cols-6 p-1.5">
					{NAV_ITEMS.map(({ href, short, icon: Icon }) => {
						const active = pathname.startsWith(href);
						return (
							<li key={href}>
								<Link
									href={href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex min-h-14 flex-col items-center justify-center gap-1 rounded-[0.9rem] text-[10px] font-semibold transition-colors",
										active
											? "text-primary"
											: "text-sidebar-foreground hover:text-foreground",
									)}
								>
									<span
										className={cn(
											"flex size-7 items-center justify-center rounded-[0.6rem] transition-colors",
											active
												? "bg-primary text-primary-foreground"
												: "bg-[#e3d8c6] text-[#9a8f80]",
										)}
									>
										<Icon className="size-4" aria-hidden />
									</span>
									{short}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<aside
				style={{ width: collapsed ? 68 : 212 }}
				className={cn(
					"fixed inset-y-0 left-0 z-40 hidden flex-col gap-1 overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex",
					animate && "transition-[width] duration-200 ease-out",
				)}
			>
				<Link
					href="/dashboard"
					className="flex items-center gap-2.5 overflow-hidden px-1.5 pt-1.5 pb-4 transition-opacity hover:opacity-80"
				>
					<span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary">
						<span className="size-[13px] rounded-[4px] bg-[#dfc98c]" />
					</span>
					{!collapsed && (
						<span className="min-w-0">
							<span className="block whitespace-nowrap font-display text-[18px] font-bold leading-[1.05] text-[#3c5741]">
								Nosso Casamento
							</span>
							{coupleNames ? (
								<span className="mt-px block whitespace-nowrap text-[11px] text-muted-foreground">
									{coupleNames}
								</span>
							) : null}
						</span>
					)}
				</Link>

				<nav aria-label="Navegação principal" className="flex flex-col gap-1">
					{NAV_ITEMS.map(({ href, label }) => {
						const active = pathname.startsWith(href);
						return (
							<Link
								key={href}
								href={href}
								aria-current={active ? "page" : undefined}
								title={collapsed ? label : undefined}
								className={cn(
									"flex items-center gap-[11px] overflow-hidden rounded-[11px] px-[11px] py-[9px] text-[13.5px] whitespace-nowrap transition-colors",
									collapsed && "justify-center",
									active
										? "bg-primary font-semibold text-primary-foreground"
										: "font-medium text-[#5a5048] hover:bg-[#f1ece1]",
								)}
							>
								<DesktopNavIcon href={href} />
								{!collapsed && (
									<span className="whitespace-nowrap">{label}</span>
								)}
							</Link>
						);
					})}
				</nav>

				<div className="mt-auto flex flex-col gap-1.5">
					<button
						type="button"
						onClick={onToggle}
						aria-expanded={!collapsed}
						aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
						className={cn(
							"flex items-center gap-[11px] overflow-hidden rounded-[11px] bg-[#f1ece1] px-[11px] py-[9px] text-[12.5px] font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:bg-[#e8e1d3]",
							collapsed && "justify-center",
						)}
					>
						<span className="shrink-0 text-base leading-none">
							{collapsed ? "»" : "«"}
						</span>
						{!collapsed && (
							<span className="whitespace-nowrap">Recolher menu</span>
						)}
					</button>
					{!collapsed && (
						<div className="px-2.5 py-2 text-[11px] text-[#a89a84]">
							America/Sao_Paulo · R$ BRL
						</div>
					)}
				</div>
			</aside>
		</>
	);
}
