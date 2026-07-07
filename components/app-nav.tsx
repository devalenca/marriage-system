"use client";

import {
	House,
	ListChecks,
	Settings,
	Store,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/dashboard", label: "Início", icon: House },
	{ href: "/fornecedores", label: "Fornecedores", icon: Store },
	{ href: "/financeiro", label: "Financeiro", icon: Wallet },
	{ href: "/convidados", label: "Convidados", icon: Users },
	{ href: "/checklist", label: "Checklist", icon: ListChecks },
	{ href: "/configuracoes", label: "Ajustes", icon: Settings },
] as const;

export function AppNav() {
	const pathname = usePathname();

	return (
		<>
			<nav
				aria-label="Navegação principal"
				className="fixed inset-x-3 bottom-3 z-40 rounded-[1.75rem] border border-sidebar-border bg-sidebar/85 shadow-[0_18px_44px_oklch(0.32_0.07_132_/_0.18)] backdrop-blur-2xl md:hidden"
			>
				<ul className="grid grid-cols-6 p-1.5">
					{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
						const active = pathname.startsWith(href);
						return (
							<li key={href}>
								<Link
									href={href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.25rem] text-[11px] font-semibold transition-all",
										active
											? "bg-card/75 text-sidebar-primary shadow-sm"
											: "text-muted-foreground hover:bg-card/45 hover:text-foreground",
									)}
								>
									<span
										className={cn(
											"flex size-8 items-center justify-center rounded-full transition-all",
											active &&
												"bg-primary/12 text-primary ring-1 ring-primary/15",
										)}
									>
										<Icon className="size-5" aria-hidden />
									</span>
									{label}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar/75 p-5 shadow-[18px_0_60px_oklch(0.32_0.07_132_/_0.12)] backdrop-blur-2xl md:flex">
				<Link
					href="/dashboard"
					className="rounded-[2rem] border border-sidebar-border bg-card/55 p-4 shadow-sm transition-colors hover:bg-card/70"
				>
					<span className="flex items-center gap-3">
						<span className="flex size-12 items-center justify-center rounded-[1.15rem] bg-primary/12 text-primary ring-1 ring-primary/15">
							<House className="size-5" aria-hidden />
						</span>
						<span>
							<span className="block font-display text-2xl font-semibold leading-none text-primary">
								Nosso Casamento
							</span>
							<span className="mt-1 block text-xs font-medium text-muted-foreground">
								campo, céu e planos no lugar
							</span>
						</span>
					</span>
				</Link>
				<nav aria-label="Navegação principal" className="mt-6">
					<ul className="flex flex-col gap-2">
						{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
							const active = pathname.startsWith(href);
							return (
								<li key={href}>
									<Link
										href={href}
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex items-center gap-3 rounded-[1.25rem] px-3.5 py-3 text-sm font-semibold transition-all",
											active
												? "bg-card/75 text-sidebar-primary shadow-sm ring-1 ring-sidebar-border"
												: "text-muted-foreground hover:bg-card/45 hover:text-foreground",
										)}
									>
										<span
											className={cn(
												"flex size-9 items-center justify-center rounded-full",
												active
													? "bg-primary/12 text-primary"
													: "bg-card/35 text-muted-foreground",
											)}
										>
											<Icon className="size-4.5" aria-hidden />
										</span>
										{label}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			</aside>
		</>
	);
}
