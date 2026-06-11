"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";

export function LoginForm() {
	const { signIn } = useAuthActions();
	const router = useRouter();
	// First run only: with zero accounts the form creates the admin account.
	// The backend enforces that this works once, and only for the admin
	// e-mail — there is no self sign-up.
	const bootstrap = useQuery(api.users.bootstrapStatus, {});
	// Undefined = the backend hasn't answered yet (or is unreachable, e.g. a
	// deployment without a Convex URL configured) — don't pretend the form
	// works until the connection is alive.
	const connecting = bootstrap === undefined;
	const needsBootstrap = bootstrap?.needsBootstrap === true;
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		const formData = new FormData(event.currentTarget);
		formData.set("flow", needsBootstrap ? "signUp" : "signIn");
		try {
			await signIn("password", formData);
			router.push("/dashboard");
		} catch {
			setError(
				needsBootstrap
					? "Não foi possível criar a conta. Use o e-mail do administrador e uma senha com pelo menos 8 caracteres."
					: "E-mail ou senha incorretos. Tente novamente.",
			);
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
			{needsBootstrap && (
				<p className="rounded-2xl bg-accent/40 px-4 py-3 text-sm text-foreground">
					Bem-vindos! Para começar, crie a conta do administrador com o seu
					e-mail.
				</p>
			)}
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
					autoComplete={needsBootstrap ? "new-password" : "current-password"}
					required
					minLength={8}
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
				disabled={submitting || connecting}
			>
				{connecting
					? "Conectando…"
					: needsBootstrap
						? submitting
							? "Criando…"
							: "Criar conta do administrador"
						: submitting
							? "Entrando…"
							: "Entrar"}
			</Button>
		</form>
	);
}
