"use client";

import { ErrorState } from "@/components/ui/state-view";

export default function AppError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-1 items-center justify-center">
			<ErrorState onRetry={reset} />
		</div>
	);
}
