"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { KeyRound, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { notifyError } from "@/lib/notify";

/**
 * "Minha conta": self-service credentials for whoever is signed in — no more
 * depending on the admin to change a password or an e-mail.
 */
export function AccountCard() {
	const viewer = useQuery(api.users.viewer, {});
	if (viewer === undefined || viewer.email === null) return null;
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Minha conta</CardTitle>
				<CardDescription>
					Você está conectado(a) como{" "}
					<span className="font-medium text-foreground">{viewer.email}</span>.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<PasswordSection email={viewer.email} />
				<EmailSection isSuperadmin={viewer.isSuperadmin} />
			</CardContent>
		</Card>
	);
}

function PasswordSection({ email }: { email: string }) {
	const changePassword = useAction(api.account.changePassword);
	const { signIn } = useAuthActions();
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const currentPassword = String(data.get("currentPassword") ?? "");
		const newPassword = String(data.get("newPassword") ?? "");
		setSubmitting(true);
		try {
			await changePassword({ currentPassword, newPassword });
			// The change invalidates every session (including this one) — sign
			// back in with the new password so the user never notices.
			await signIn("password", {
				email,
				password: newPassword,
				flow: "signIn",
			});
			form.reset();
			toast.success("Senha alterada");
		} catch (error) {
			notifyError(error, "Não foi possível alterar a senha");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
				<KeyRound className="size-4 text-muted-foreground" aria-hidden />
				Alterar senha
			</h3>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="account-current-password">Senha atual</Label>
					<Input
						id="account-current-password"
						name="currentPassword"
						type="password"
						autoComplete="current-password"
						required
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="account-new-password">Nova senha</Label>
					<Input
						id="account-new-password"
						name="newPassword"
						type="password"
						autoComplete="new-password"
						required
						placeholder="Pelo menos 8 caracteres"
					/>
				</div>
			</div>
			<Button type="submit" disabled={submitting} className="self-end">
				{submitting ? "Alterando..." : "Alterar senha"}
			</Button>
		</form>
	);
}

function EmailSection({ isSuperadmin }: { isSuperadmin: boolean }) {
	const requestEmailChange = useAction(api.account.requestEmailChange);
	const confirmEmailChange = useAction(api.account.confirmEmailChange);
	const [pendingEmail, setPendingEmail] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	if (isSuperadmin) {
		return (
			<p className="text-sm text-muted-foreground">
				O e-mail do administrador é definido na configuração do sistema e não
				pode ser trocado por aqui.
			</p>
		);
	}

	async function handleRequest(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const newEmail = String(data.get("newEmail") ?? "")
			.trim()
			.toLowerCase();
		const password = String(data.get("password") ?? "");
		setSubmitting(true);
		try {
			await requestEmailChange({ newEmail, password });
			setPendingEmail(newEmail);
			toast.success(`Código enviado para ${newEmail}`);
		} catch (error) {
			notifyError(error, "Não foi possível enviar o código");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleConfirm(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const code = String(new FormData(event.currentTarget).get("code") ?? "");
		setSubmitting(true);
		try {
			await confirmEmailChange({ code: code.trim() });
			setPendingEmail(null);
			toast.success("E-mail atualizado");
		} catch (error) {
			notifyError(error, "Não foi possível confirmar o código");
		} finally {
			setSubmitting(false);
		}
	}

	if (pendingEmail !== null) {
		return (
			<form
				key="email-confirm"
				onSubmit={handleConfirm}
				className="flex flex-col gap-3"
			>
				<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
					<Mail className="size-4 text-muted-foreground" aria-hidden />
					Alterar e-mail
				</h3>
				<p className="text-sm text-muted-foreground">
					Enviamos um código de 8 dígitos para{" "}
					<span className="font-medium text-foreground">{pendingEmail}</span>.
					Digite-o abaixo para confirmar a troca.
				</p>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="account-email-code">Código</Label>
					<Input
						id="account-email-code"
						name="code"
						inputMode="numeric"
						autoComplete="one-time-code"
						required
						placeholder="12345678"
						className="tracking-widest"
					/>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => setPendingEmail(null)}
					>
						Cancelar
					</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? "Confirmando..." : "Confirmar troca"}
					</Button>
				</div>
			</form>
		);
	}

	return (
		<form
			key="email-request"
			onSubmit={handleRequest}
			className="flex flex-col gap-3"
		>
			<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
				<Mail className="size-4 text-muted-foreground" aria-hidden />
				Alterar e-mail
			</h3>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="account-new-email">Novo e-mail</Label>
					<Input
						id="account-new-email"
						name="newEmail"
						type="email"
						autoComplete="email"
						required
						placeholder="novo@exemplo.com"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="account-email-password">Confirme sua senha</Label>
					<Input
						id="account-email-password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
				</div>
			</div>
			<p className="text-xs text-muted-foreground">
				Enviaremos um código de confirmação para o novo endereço.
			</p>
			<Button type="submit" disabled={submitting} className="self-end">
				{submitting ? "Enviando..." : "Enviar código"}
			</Button>
		</form>
	);
}
