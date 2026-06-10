import { toast } from "sonner";

/** Standard error toast for mutation failures (Convex errors carry pt-BR messages). */
export function notifyError(error: unknown, fallback: string) {
	toast.error(error instanceof Error ? error.message : fallback);
}
