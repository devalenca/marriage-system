import { ConvexError } from "convex/values";

/**
 * Sign-up gate: `allowlist` is the AUTH_ALLOWED_EMAILS env value — a
 * comma-separated list of e-mails. Missing or empty list denies everyone,
 * so a misconfigured deployment fails closed.
 */
export function assertEmailAllowed(
	email: string,
	allowlist: string | undefined,
): void {
	const normalized = email.trim().toLowerCase();
	const allowed = (allowlist ?? "")
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.length > 0);

	if (normalized.length === 0 || !allowed.includes(normalized)) {
		throw new ConvexError("E-mail não autorizado a criar conta");
	}
}
