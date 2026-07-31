import Script from "next/script";

/**
 * Paints the couple's accent before React hydrates.
 *
 * The theme lives in Convex behind client-side auth, so the first paint can
 * only know it from the browser: WeddingTheme remembers the last resolved
 * theme and this script re-applies it synchronously. Without it the app
 * renders in the default olive for as long as the query takes, then snaps to
 * the couple's colour.
 *
 * The code is a fixed string — nothing is interpolated into it — and it only
 * ever copies a value from localStorage onto an attribute.
 */
const BOOTSTRAP = `try{var t=localStorage.getItem("wedding-theme");if(t)document.documentElement.setAttribute("data-wedding-theme",t)}catch(e){}`;

export function ThemeBootstrap() {
	return (
		<Script id="wedding-theme-bootstrap" strategy="beforeInteractive">
			{BOOTSTRAP}
		</Script>
	);
}
