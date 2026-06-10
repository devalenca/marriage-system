"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
	const { signOut } = useAuthActions();
	const router = useRouter();
	const [signingOut, setSigningOut] = useState(false);

	async function handleSignOut() {
		setSigningOut(true);
		try {
			await signOut();
			router.push("/login");
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
