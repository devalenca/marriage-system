// Numeric one-time codes for email verification flows (password reset,
// e-mail change). Digits only so the couple can type them from a phone.

export function generateNumericCode(length: number): string {
	const digits = new Uint8Array(length);
	crypto.getRandomValues(digits);
	return Array.from(digits, (byte) => String(byte % 10)).join("");
}
