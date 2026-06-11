"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

/**
 * Client-side route gate for the authenticated app shell. While auth is
 * resolving it shows a quiet placeholder; unauthenticated visitors are sent
 * to /login. This is UX only — every Convex function independently rejects
 * anonymous callers, so no data is reachable before this resolves.
 */
export function AuthGate({ children }: { children: ReactNode }) {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.replace("/login");
		}
	}, [isLoading, isAuthenticated, router]);

	if (isLoading || !isAuthenticated) {
		return (
			<div
				aria-busy
				className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
			>
				Carregando…
			</div>
		);
	}

	return <>{children}</>;
}
