import { ConvexError } from "convex/values";
import { toast } from "sonner";

/** Standard error toast for mutation failures (Convex errors carry pt-BR messages). */
export function notifyError(error: unknown, fallback: string) {
	if (error instanceof ConvexError && typeof error.data === "string") {
		toast.error(error.data);
		return;
	}
	toast.error(error instanceof Error ? error.message : fallback);
}
