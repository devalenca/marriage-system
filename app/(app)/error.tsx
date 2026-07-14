"use client";

import { Button } from "@/components/ui/button";

/**
 * Segment error boundary for the authenticated app shell. Convex `useQuery`
 * throws during render when a function rejects — e.g. a signed-in account
 * whose user has no wedding membership calls a wedding-scoped query. Without
 * this boundary that would crash to the framework's default error screen.
 */
export default function AppError({ reset }: { reset: () => void }) {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
			<h2 className="font-display text-xl font-semibold">
				Não foi possível carregar seus dados
			</h2>
			<p className="max-w-sm text-sm text-muted-foreground">
				Este acesso pode ainda não estar vinculado a um casamento. Tente
				novamente ou fale com quem administra o app.
			</p>
			<Button variant="outline" onClick={reset}>
				Tentar novamente
			</Button>
		</div>
	);
}
