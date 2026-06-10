import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { assertEmailAllowed } from "./lib/allowlist";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Password({
			// Runs on sign-up: only allowlisted e-mails may create an account.
			profile(params) {
				const email = String(params.email ?? "")
					.trim()
					.toLowerCase();
				assertEmailAllowed(email, process.env.AUTH_ALLOWED_EMAILS);
				return { email };
			},
		}),
	],
});
