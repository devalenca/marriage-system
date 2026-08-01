"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";

type Mode = "signIn" | "reset-request" | "reset-verify";

export function LoginForm() {
	const { signIn } = useAuthActions();
	const { isAuthenticated } = useConvexAuth();
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
	const [mode, setMode] = useState<Mode>("signIn");
	const [resetEmail, setResetEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (seeding) {
			ensureAdminSeeded().catch(() => {
				// Seeding is best-effort here; a misconfigured deployment simply
				// keeps the form locked, which is the honest state.
			});
		}
	}, [seeding, ensureAdminSeeded]);

	// Already signed in (e.g. returning visitor) — go straight to the app.
	useEffect(() => {
		if (isAuthenticated) {
			router.replace("/dashboard");
		}
	}, [isAuthenticated, router]);

	function switchMode(next: Mode) {
		setMode(next);
		setError(null);
		setNotice(null);
	}

	async function handleSignIn(event: FormEvent<HTMLFormElement>) {
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

	async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		const email = String(new FormData(event.currentTarget).get("email") ?? "")
			.trim()
			.toLowerCase();
		setResetEmail(email);
		try {
			await signIn("password", { email, flow: "reset" });
		} catch {
			// Deliberately swallowed: advancing either way avoids confirming
			// whether an e-mail has an account (no user enumeration).
		}
		setNotice(
			`Se ${email} tiver uma conta, um código de 8 dígitos chegará em instantes.`,
		);
		setMode("reset-verify");
		setSubmitting(false);
	}

	async function handleResetVerify(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		const formData = new FormData(event.currentTarget);
		try {
			await signIn("password", {
				email: resetEmail,
				code: String(formData.get("code") ?? "").trim(),
				newPassword: String(formData.get("newPassword") ?? ""),
				flow: "reset-verification",
			});
			router.push("/dashboard");
		} catch {
			setError(
				"Código inválido ou expirado. Confira o e-mail e tente de novo.",
			);
			setSubmitting(false);
		}
	}

	if (mode === "reset-request") {
		return (
			<form
				key="reset-request"
				onSubmit={handleResetRequest}
				className="flex flex-col gap-5"
				noValidate
			>
				<p className="text-sm text-muted-foreground">
					Informe o e-mail da sua conta e enviaremos um código para você criar
					uma nova senha.
				</p>
				<div className="flex flex-col gap-2">
					<Label htmlFor="reset-email">E-mail</Label>
					<Input
						id="reset-email"
						name="email"
						type="email"
						autoComplete="email"
						required
						defaultValue={resetEmail}
						placeholder="voce@exemplo.com"
						className="h-11"
					/>
				</div>
				{error && (
					<p role="alert" className="text-sm font-medium text-destructive">
						{error}
					</p>
				)}
				<Button type="submit" size="lg" className="h-11" disabled={submitting}>
					{submitting ? "Enviando…" : "Enviar código"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="h-10"
					onClick={() => switchMode("signIn")}
				>
					Voltar
				</Button>
			</form>
		);
	}

	if (mode === "reset-verify") {
		return (
			<form
				key="reset-verify"
				onSubmit={handleResetVerify}
				className="flex flex-col gap-5"
				noValidate
			>
				{notice && <p className="text-sm text-muted-foreground">{notice}</p>}
				<div className="flex flex-col gap-2">
					<Label htmlFor="reset-code">Código</Label>
					<Input
						id="reset-code"
						name="code"
						inputMode="numeric"
						autoComplete="one-time-code"
						required
						placeholder="12345678"
						className="h-11 tracking-widest"
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="reset-new-password">Nova senha</Label>
					<Input
						id="reset-new-password"
						name="newPassword"
						type="password"
						autoComplete="new-password"
						required
						placeholder="Pelo menos 8 caracteres"
						className="h-11"
					/>
				</div>
				{error && (
					<p role="alert" className="text-sm font-medium text-destructive">
						{error}
					</p>
				)}
				<Button type="submit" size="lg" className="h-11" disabled={submitting}>
					{submitting ? "Redefinindo…" : "Redefinir e entrar"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="h-10"
					onClick={() => switchMode("reset-request")}
				>
					Não recebi o código
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="h-10"
					onClick={() => switchMode("signIn")}
				>
					Voltar
				</Button>
			</form>
		);
	}

	return (
		<form
			key="sign-in"
			onSubmit={handleSignIn}
			className="flex flex-col gap-5"
			noValidate
		>
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
			<Button
				type="button"
				variant="ghost"
				className="h-10 text-muted-foreground"
				onClick={() => switchMode("reset-request")}
			>
				Esqueci minha senha
			</Button>
		</form>
	);
}
