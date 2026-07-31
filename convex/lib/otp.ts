// Numeric one-time codes for email verification flows (password reset,
// e-mail change). Digits only so the couple can type them from a phone.

export function generateNumericCode(length: number): string {
	const digits = new Uint8Array(length);
	crypto.getRandomValues(digits);
	return Array.from(digits, (byte) => String(byte % 10)).join("");
}

/** URL-safe random token for e-mailed links (invitations). */
export function generateUrlToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hex sha-256 — codes are stored hashed, never in the clear. */
export async function sha256Hex(value: string): Promise<string> {
	const bytes = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, "0"),
	).join("");
}
