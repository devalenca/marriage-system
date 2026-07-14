"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { isValidISODate } from "@/lib/domain/dates";

/** Pull a friendly pt-BR message out of a ConvexError (which carries string data). */
function convexMessage(error: unknown): string | null {
	if (error instanceof ConvexError && typeof error.data === "string") {
		return error.data;
	}
	return null;
}

export function SignupForm() {
	const { signIn } = useAuthActions();
	const { isAuthenticated } = useConvexAuth();
	const createForSelf = useMutation(api.weddings.createForSelf);
	const router = useRouter();

	const namesId = useId();
	const dateId = useId();
	const budgetId = useId();
	const emailId = useId();
	const passwordId = useId();
	const termsId = useId();

	const [coupleNames, setCoupleNames] = useState("");
	const [weddingDate, setWeddingDate] = useState("");
	const [budgetCents, setBudgetCents] = useState<number | null>(null);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	// Wedding data captured at submit; provisioned once auth is actually live.
	const [pendingWedding, setPendingWedding] = useState<{
		coupleNames: string;
		weddingDate: string;
		budgetGoalCents: number;
	} | null>(null);
	const provisioning = useRef(false);

	// Returning visitor already signed in (and not mid-signup) — skip to the app.
	useEffect(() => {
		if (isAuthenticated && pendingWedding === null && !submitting) {
			router.replace("/dashboard");
		}
	}, [isAuthenticated, pendingWedding, submitting, router]);

	// signUp authenticates asynchronously: the Convex client only attaches the
	// new token a moment later. Provisioning the wedding right after signIn
	// races that and fails with "Não autenticado" — so we wait for the auth
	// state to go live, then create it exactly once.
	useEffect(() => {
		if (!isAuthenticated || pendingWedding === null || provisioning.current) {
			return;
		}
		provisioning.current = true;
		let cancelled = false;
		(async () => {
			try {
				await createForSelf({ ...pendingWedding, acceptedTerms: true });
				if (!cancelled) router.push("/dashboard");
			} catch (weddingError) {
				if (cancelled) return;
				setError(
					convexMessage(weddingError) ??
						"Sua conta foi criada, mas não foi possível preparar o casamento. Tente novamente.",
				);
				setPendingWedding(null);
				setSubmitting(false);
				provisioning.current = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, pendingWedding, createForSelf, router]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const names = coupleNames.trim();
		if (names.length === 0) {
			setError("Informe os nomes do casal.");
			return;
		}
		if (!isValidISODate(weddingDate)) {
			setError("Escolha a data do casamento.");
			return;
		}
		if (budgetCents === null || budgetCents <= 0) {
			setError("Defina a meta de orçamento.");
			return;
		}
		if (email.trim().length === 0) {
			setError("Informe seu e-mail.");
			return;
		}
		if (password.length < 8) {
			setError("A senha precisa ter ao menos 8 caracteres.");
			return;
		}
		if (!acceptedTerms) {
			setError(
				"É preciso aceitar os Termos de Uso e a Política de Privacidade.",
			);
			return;
		}

		setSubmitting(true);

		// Create + authenticate the account via the password signUp flow. The
		// wedding is provisioned by the effect above once auth goes live.
		try {
			const formData = new FormData();
			formData.set("email", email.trim());
			formData.set("password", password);
			formData.set("flow", "signUp");
			await signIn("password", formData);
			setPendingWedding({
				coupleNames: names,
				weddingDate,
				budgetGoalCents: budgetCents,
			});
		} catch (signUpError) {
			// The backend rejects self-signup with a ConvexError when it's closed;
			// surface that verbatim. Any other failure at this step almost always
			// means the e-mail is already registered.
			setError(
				convexMessage(signUpError) ??
					"Este e-mail já está em uso. Tente entrar na sua conta.",
			);
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
			<div className="flex flex-col gap-2">
				<Label htmlFor={namesId}>Nomes do casal</Label>
				<Input
					id={namesId}
					name="coupleNames"
					type="text"
					autoComplete="name"
					required
					placeholder="Ex.: Gabriel & Alice"
					className="h-11"
					value={coupleNames}
					onChange={(e) => setCoupleNames(e.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={dateId}>Data do casamento</Label>
				<Input
					id={dateId}
					name="weddingDate"
					type="date"
					required
					className="h-11"
					value={weddingDate}
					onChange={(e) => setWeddingDate(e.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={budgetId}>Meta de orçamento</Label>
				<CurrencyInput
					id={budgetId}
					placeholder="55.000,00"
					className="h-11"
					value={budgetCents}
					onValueChange={setBudgetCents}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={emailId}>E-mail</Label>
				<Input
					id={emailId}
					name="email"
					type="email"
					autoComplete="email"
					required
					placeholder="voce@exemplo.com"
					className="h-11"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={passwordId}>Senha</Label>
				<Input
					id={passwordId}
					name="password"
					type="password"
					autoComplete="new-password"
					required
					minLength={8}
					placeholder="Mínimo de 8 caracteres"
					className="h-11"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</div>

			<div className="flex items-start gap-3">
				<input
					id={termsId}
					name="acceptedTerms"
					type="checkbox"
					checked={acceptedTerms}
					onChange={(e) => setAcceptedTerms(e.target.checked)}
					className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				/>
				<Label
					htmlFor={termsId}
					className="text-sm leading-snug font-normal text-muted-foreground"
				>
					Li e aceito os{" "}
					<Link
						href="/termos"
						className="font-medium text-primary underline underline-offset-2"
					>
						Termos de Uso
					</Link>{" "}
					e a{" "}
					<Link
						href="/privacidade"
						className="font-medium text-primary underline underline-offset-2"
					>
						Política de Privacidade
					</Link>
					.
				</Label>
			</div>

			{error && (
				<p role="alert" className="text-sm font-medium text-destructive">
					{error}
				</p>
			)}

			<Button type="submit" size="lg" className="h-11" disabled={submitting}>
				{submitting ? "Criando sua conta…" : "Criar conta"}
			</Button>

			<p className="text-center text-sm text-muted-foreground">
				Já tem conta?{" "}
				<Link
					href="/login"
					className="font-medium text-primary underline underline-offset-2"
				>
					Entrar
				</Link>
			</p>
		</form>
	);
}
