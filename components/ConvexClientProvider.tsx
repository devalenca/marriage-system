"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	const client = useMemo(() => {
		const url = process.env.NEXT_PUBLIC_CONVEX_URL;
		if (!url) {
			throw new Error(
				"NEXT_PUBLIC_CONVEX_URL is not set. Run `npm run dev` so the local Convex backend writes it to .env.local.",
			);
		}
		return new ConvexReactClient(url);
	}, []);

	// Client-side auth: tokens live in the browser and travel to Convex over
	// the reactive connection. Route gating happens in <AuthGate>; the real
	// protection is server-side (every function rejects anonymous callers).
	return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
