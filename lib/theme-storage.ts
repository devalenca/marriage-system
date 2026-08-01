import { THEME_STORAGE_KEY } from "@/lib/domain/themes";

/**
 * Prefix Convex Auth gives its stored session token
 * (`__convexAuthJWT_<namespace>`). Its presence is how the browser knows,
 * before any query runs, whether someone is signed in.
 */
export const AUTH_TOKEN_PREFIX = "__convexAuthJWT";

/**
 * Whether the remembered accent may be painted. Signed out, it must not be:
 * the landing and the login page wear the product's own palette, not the
 * colours of whoever used this browser last.
 */
export function shouldApplyStoredTheme(
	storageKeys: readonly string[],
): boolean {
	return storageKeys.some((key) => key.startsWith(AUTH_TOKEN_PREFIX));
}

/**
 * Drops the remembered accent and the attribute carrying it, so the app falls
 * back to the product's palette. Called when a session ends — the next person
 * to open this browser is not necessarily the same couple.
 */
export function forgetWeddingTheme() {
	try {
		localStorage.removeItem(THEME_STORAGE_KEY);
	} catch {
		// Private mode: nothing was stored to begin with.
	}
	document.documentElement.removeAttribute("data-wedding-theme");
}
