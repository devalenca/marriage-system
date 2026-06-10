import {
	convexAuthNextjsMiddleware,
	createRouteMatcher,
	nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLoginPage = createRouteMatcher(["/login"]);

// Gate every page: visitors without a session land on /login, and a
// signed-in user visiting /login is sent back into the app.
export default convexAuthNextjsMiddleware(
	async (request, { convexAuth }) => {
		const authenticated = await convexAuth.isAuthenticated();
		if (isLoginPage(request)) {
			return authenticated
				? nextjsMiddlewareRedirect(request, "/dashboard")
				: undefined;
		}
		return authenticated
			? undefined
			: nextjsMiddlewareRedirect(request, "/login");
	},
	{ cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
	// Everything except static files and Next internals.
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
