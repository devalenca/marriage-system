import Script from "next/script";
import { THEME_STORAGE_KEY } from "@/lib/domain/themes";
import { AUTH_TOKEN_PREFIX } from "@/lib/theme-storage";

/**
 * Paints the couple's accent before React hydrates.
 *
 * The theme lives in Convex behind client-side auth, so the first paint can
 * only know it from the browser: WeddingTheme remembers the last resolved
 * theme and this script re-applies it synchronously. Without it the app
 * renders in the default olive for as long as the query takes, then snaps to
 * the couple's colour.
 *
 * It applies only while a session token is present — the same rule as
 * `shouldApplyStoredTheme`, which this mirrors because the script has to run
 * before any module is loaded. Signed out, the default palette stands.
 *
 * The only values interpolated are this app's own constants; nothing from a
 * user, a URL or the network reaches this string.
 */
const BOOTSTRAP = `try{
var signedIn=Object.keys(localStorage).some(function(k){return k.indexOf(${JSON.stringify(AUTH_TOKEN_PREFIX)})===0});
var t=signedIn?localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}):null;
if(t){document.documentElement.setAttribute("data-wedding-theme",t)}
}catch(e){}`;

export function ThemeBootstrap() {
	return (
		<Script id="wedding-theme-bootstrap" strategy="beforeInteractive">
			{BOOTSTRAP}
		</Script>
	);
}
