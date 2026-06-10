"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Flow = "signIn" | "signUp";

const ERROR_MESSAGES: Record<Flow, string> = {
	signIn: "E-mail ou senha incorretos. Tente novamente.",
	signUp:
		"Não foi possível criar a conta. Confira se o e-mail está autorizado e se a senha tem pelo menos 8 caracteres.",
};

export function LoginForm() {
	const { signIn } = useAuthActions();
	const router = useRouter();
	const [flow, setFlow] = useState<Flow>("signIn");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		const formData = new FormData(event.currentTarget);
		formData.set("flow", flow);
		try {
			await signIn("password", formData);
			router.push("/dashboard");
		} catch {
			setError(ERROR_MESSAGES[flow]);
			setSubmitting(false);
		}
	}

	function toggleFlow() {
		setFlow((current) => (current === "signIn" ? "signUp" : "signIn"));
		setError(null);
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
					autoComplete={flow === "signIn" ? "current-password" : "new-password"}
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

			<Button type="submit" size="lg" className="h-11" disabled={submitting}>
				{flow === "signIn"
					? submitting
						? "Entrando…"
						: "Entrar"
					: submitting
						? "Criando conta…"
						: "Criar conta"}
			</Button>

			<Button
				type="button"
				variant="link"
				onClick={toggleFlow}
				className="self-center text-muted-foreground"
			>
				{flow === "signIn"
					? "Primeiro acesso? Criar conta"
					: "Já tem conta? Entrar"}
			</Button>
		</form>
	);
}
