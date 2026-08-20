"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { forgetWeddingTheme } from "@/lib/theme-storage";

export function SignOutButton() {
	const { signOut } = useAuthActions();
	const [signingOut, setSigningOut] = useState(false);

	async function handleSignOut() {
		setSigningOut(true);
		try {
			await signOut();
			forgetWeddingTheme();
			// Back to the landing, not to /login: leaving the cockpit should feel
			// like stepping out the front door, not like being asked to sign in
			// again. Full-page navigation because crossing the auth boundary must
			// drop all client state (a soft transition races the auth teardown,
			// leaving the now-invalid wedding queries running).
			window.location.assign("/");
		} catch {
			setSigningOut(false);
		}
	}

	return (
		<Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
			<LogOut data-icon="inline-start" aria-hidden />
			{signingOut ? "Saindo..." : "Sair da conta"}
		</Button>
	);
}
