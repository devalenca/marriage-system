"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
	const { signOut } = useAuthActions();
	const [signingOut, setSigningOut] = useState(false);

	async function handleSignOut() {
		setSigningOut(true);
		try {
			await signOut();
			// Full-page navigation: crossing the auth boundary must drop all
			// client state (soft router navigation races the auth teardown).
			window.location.assign("/login");
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
