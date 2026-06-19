"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { notifyError } from "@/lib/notify";

type AccessUser = { _id: Id<"users">; email: string; isAdmin: boolean };

/** Admin-only: create, remove and reset the password of access accounts. */
export function AccessCard() {
	const viewer = useQuery(api.users.viewer, {});
	const users = useQuery(api.users.list, viewer?.isAdmin ? {} : "skip");

	if (!viewer?.isAdmin) return null;

	return (
		<Card className="animate-fadeup px-[26px] py-6 [animation-delay:.15s]">
			<CardHeader className="px-0">
				<CardTitle className="font-display text-[22px] font-semibold text-foreground">
					Acessos
				</CardTitle>
				<CardDescription>
					Somente você cria e remove acessos. Sem convite seu, ninguém entra.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5 px-0">
				<ul className="flex flex-col gap-2">
					{(users ?? []).map((user) => (
						<AccessRow key={user._id} user={user} />
					))}
				</ul>
				<CreateAccessForm />
			</CardContent>
		</Card>
	);
}

/** Single uppercase initial for the round avatar; "?" when the email is empty. */
function initialOf(email: string): string {
	return email.trim().charAt(0).toUpperCase() || "?";
}

function AccessRow({ user }: { user: AccessUser }) {
	const removeUser = useMutation(api.users.remove);
	const resetPassword = useAction(api.users.resetPassword);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [busy, setBusy] = useState(false);

	async function handleRemove() {
		setBusy(true);
		try {
			await removeUser({ id: user._id });
			setConfirmOpen(false);
			toast.success(`Acesso de ${user.email} removido`);
		} catch (error) {
			notifyError(error, "Não foi possível remover o acesso");
		} finally {
			setBusy(false);
		}
	}

	async function handleReset(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		try {
			await resetPassword({ id: user._id, password: newPassword });
			setResetOpen(false);
			setNewPassword("");
			toast.success(`Senha de ${user.email} redefinida`);
		} catch (error) {
			notifyError(error, "Não foi possível redefinir a senha");
		} finally {
			setBusy(false);
		}
	}

	return (
		<li className="flex min-h-11 flex-wrap items-center gap-3 rounded-[13px] bg-[#f7f3ec] px-4 py-2.5">
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
			>
				{initialOf(user.email)}
			</span>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-foreground">
					{user.email}
				</div>
				{user.isAdmin && (
					<div className="text-xs text-muted-foreground">Administrador</div>
				)}
			</div>
			{!user.isAdmin && (
				<span className="flex items-center gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setResetOpen(true)}
						aria-label={`Redefinir senha de ${user.email}`}
					>
						<KeyRound data-icon="inline-start" aria-hidden />
						Redefinir senha
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setConfirmOpen(true)}
						aria-label={`Remover ${user.email}`}
					>
						<Trash2 data-icon="inline-start" aria-hidden />
						Remover
					</Button>
				</span>
			)}

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Remover acesso?"
				description={`${user.email} perde o acesso imediatamente. Os dados do casamento não são afetados.`}
				confirmLabel="Sim, remover"
				onConfirm={handleRemove}
				busy={busy}
			/>

			<Dialog open={resetOpen} onOpenChange={setResetOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Redefinir senha de {user.email}
						</DialogTitle>
						<DialogDescription>
							A pessoa é desconectada de todos os dispositivos e passa a usar a
							nova senha.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleReset} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor={`reset-password-${user._id}`}>Nova senha</Label>
							<Input
								id={`reset-password-${user._id}`}
								type="password"
								autoComplete="new-password"
								minLength={8}
								required
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setResetOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={busy}>
								Redefinir
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</li>
	);
}

function CreateAccessForm() {
	const createAccess = useAction(api.users.create);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [creating, setCreating] = useState(false);

	async function handleCreate(event: FormEvent) {
		event.preventDefault();
		setCreating(true);
		try {
			await createAccess({ email: email.trim(), password });
			toast.success(`Acesso criado para ${email.trim()}`);
			setEmail("");
			setPassword("");
		} catch (error) {
			notifyError(error, "Não foi possível criar o acesso");
		} finally {
			setCreating(false);
		}
	}

	return (
		<form
			onSubmit={handleCreate}
			className="flex flex-col gap-3 border-t border-[#eee4d4] pt-5 sm:flex-row sm:items-end sm:gap-3"
		>
			<div className="flex flex-col gap-1.5 sm:flex-[1.4]">
				<Label htmlFor="access-email">E-mail</Label>
				<Input
					id="access-email"
					type="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="novo@email.com"
				/>
			</div>
			<div className="flex flex-col gap-1.5 sm:flex-1">
				<Label htmlFor="access-password">Senha</Label>
				<Input
					id="access-password"
					type="password"
					autoComplete="new-password"
					minLength={8}
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="mínimo 8 caracteres"
				/>
			</div>
			<Button
				type="submit"
				disabled={creating}
				className="rounded-full px-5 sm:shrink-0"
			>
				<UserPlus data-icon="inline-start" aria-hidden />
				{creating ? "Criando..." : "Criar acesso"}
			</Button>
		</form>
	);
}
