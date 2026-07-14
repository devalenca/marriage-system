"use client";

import { useCallback, useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nav-collapsed";

/**
 * Client shell that owns the desktop sidebar's collapsed/expanded state
 * (persisted in localStorage) so both the nav and the content padding stay
 * in sync. On mobile the nav is a hamburger drawer and this padding is unused.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	const [collapsed, setCollapsed] = useState(true);

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved !== null) setCollapsed(saved === "1");
	}, []);

	const toggle = useCallback(() => {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
			return next;
		});
	}, []);

	return (
		<div
			className={cn(
				"min-h-screen transition-[padding] duration-200 ease-out",
				collapsed ? "md:pl-[4.75rem]" : "md:pl-64",
			)}
		>
			<AppNav collapsed={collapsed} onToggle={toggle} />
			<main className="mx-auto w-full max-w-5xl px-4 pt-20 pb-12 sm:px-6 md:px-8 md:pt-8 md:pb-14">
				<SubscriptionBanner />
				{children}
			</main>
		</div>
	);
}
