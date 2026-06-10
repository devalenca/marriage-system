"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
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

	return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
