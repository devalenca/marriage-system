"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";

export function LoginForm() {
	const { signIn } = useAuthActions();
	const router = useRouter();
	// Undefined = the backend hasn't answered yet (or is unreachable, e.g. a
	// deployment without a Convex URL configured) — don't pretend the form
	// works until the connection is alive.
	const bootstrap = useQuery(api.users.bootstrapStatus, {});
	const ensureAdminSeeded = useAction(api.users.ensureAdminSeeded);
	const connecting = bootstrap === undefined;
	// With zero accounts the backend seeds the admin from its env vars
	// (AUTH_ADMIN_EMAIL + AUTH_ADMIN_PASSWORD); the form stays locked until
	// the seeded account shows up reactively.
	const seeding = bootstrap?.needsBootstrap === true;
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (seeding) {
			ensureAdminSeeded().catch(() => {
				// Seeding is best-effort here; a misconfigured deployment simply
				// keeps the form locked, which is the honest state.
			});
		}
	}, [seeding, ensureAdminSeeded]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		const formData = new FormData(event.currentTarget);
		formData.set("flow", "signIn");
		try {
			await signIn("password", formData);
			router.push("/dashboard");
		} catch {
			setError("E-mail ou senha incorretos. Tente novamente.");
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
			<div className="flex flex-col gap-2">
				<Label htmlFor="login-email">E-mail</Label>
				<Input
					id="login-email"
					name="email"
					type="email"
					autoComplete="email"
					required
					placeholder="voce@exemplo.com"
					className="h-11"
				/>
			</div>
			<div className="flex flex-col gap-2">
				<Label htmlFor="login-password">Senha</Label>
				<Input
					id="login-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					placeholder="••••••••"
					className="h-11"
				/>
			</div>

			{error && (
				<p role="alert" className="text-sm font-medium text-destructive">
					{error}
				</p>
			)}

			<Button
				type="submit"
				size="lg"
				className="h-11"
				disabled={submitting || connecting || seeding}
			>
				{connecting
					? "Conectando…"
					: seeding
						? "Preparando…"
						: submitting
							? "Entrando…"
							: "Entrar"}
			</Button>
		</form>
	);
}
