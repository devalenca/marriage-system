"use client";

import { useCallback, useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nav-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
	const [collapsed, setCollapsed] = useState(false);
	// `hydrated` gates the width/padding transition so the persisted state
	// snaps into place on load instead of animating from the SSR default.
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
		setHydrated(true);
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
			style={
				{
					"--app-sidebar-w": collapsed ? "68px" : "212px",
				} as React.CSSProperties
			}
			className={cn(
				"min-h-screen md:[padding-left:var(--app-sidebar-w)]",
				hydrated && "transition-[padding] duration-200 ease-out",
			)}
		>
			<AppNav collapsed={collapsed} onToggle={toggle} animate={hydrated} />
			<main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-24 sm:px-6 md:px-8 md:pt-8 md:pb-14">
				{children}
			</main>
		</div>
	);
}
