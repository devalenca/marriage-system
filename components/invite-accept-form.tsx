"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { notifyError } from "@/lib/notify";

/**
 * The invited person lands here from the e-mailed link: sees whose wedding
 * it is, picks a password and goes straight into the app.
 */
export function InviteAcceptForm() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";
	const invitation = useQuery(api.access.invitationByToken, { token });
	const acceptInvitation = useAction(api.access.acceptInvitation);
	const { signIn } = useAuthActions();
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);

	if (invitation === undefined) {
		return (
			<p className="text-center text-sm text-muted-foreground">Carregando…</p>
		);
	}

	if (invitation === null) {
		return (
			<div className="flex flex-col gap-5 text-center">
				<p className="text-sm text-muted-foreground">
					Este convite não existe mais ou expirou. Peça um novo para quem
					administra o casamento.
				</p>
				<Button variant="outline" render={<Link href="/login" />}>
					Ir para o login
				</Button>
			</div>
		);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const password = String(
			new FormData(event.currentTarget).get("password") ?? "",
		);
		setSubmitting(true);
		try {
			const { email } = await acceptInvitation({ token, password });
			await signIn("password", { email, password, flow: "signIn" });
			router.push("/dashboard");
		} catch (error) {
			notifyError(error, "Não foi possível aceitar o convite");
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
			<p className="text-center text-sm text-pretty text-muted-foreground">
				Você foi convidado(a) para acompanhar o planejamento do casamento de{" "}
				<span className="font-medium text-foreground">
					{invitation.coupleNames}
				</span>
				. Crie sua senha para entrar como{" "}
				<span className="font-medium text-foreground">{invitation.email}</span>.
			</p>
			<div className="flex flex-col gap-2">
				<Label htmlFor="invite-password">Sua senha</Label>
				<Input
					id="invite-password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
					minLength={8}
					placeholder="Pelo menos 8 caracteres"
					className="h-11"
				/>
			</div>
			<Button type="submit" size="lg" className="h-11" disabled={submitting}>
				{submitting ? "Entrando…" : "Criar senha e entrar"}
			</Button>
		</form>
	);
}
