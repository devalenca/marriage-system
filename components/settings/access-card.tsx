"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, MailPlus, RotateCcw, Trash2, UserPlus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { formatDateBR } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";

type Member = {
	userId: Id<"users">;
	email: string;
	role: "admin" | "member";
	isSelf: boolean;
};

/** Lets the wedding admin manage who can help plan this wedding. */
export function AccessCard() {
	const members = useQuery(api.access.listMembers, {});

	// Only people who belong to a wedding see the card at all.
	if (!members || members.length === 0) return null;

	const isAdmin = members.some(
		(member) => member.isSelf && member.role === "admin",
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Acessos</CardTitle>
				<CardDescription>
					Quem tem acesso a este casamento. Sem convite do administrador,
					ninguém entra.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<ul className="flex flex-col gap-2">
					{members.map((member) => (
						<AccessRow
							key={member.userId}
							member={member}
							canManage={isAdmin}
						/>
					))}
				</ul>
				{isAdmin ? (
					<>
						<PendingInvitations />
						<InviteForm />
						<details className="group">
							<summary className="cursor-pointer text-sm text-muted-foreground select-none">
								Prefere criar o acesso manualmente (sem e-mail)?
							</summary>
							<div className="mt-3">
								<CreateMemberForm />
							</div>
						</details>
					</>
				) : null}
			</CardContent>
		</Card>
	);
}

function AccessRow({
	member,
	canManage,
}: {
	member: Member;
	canManage: boolean;
}) {
	const removeMember = useMutation(api.access.removeMember);
	const resetPassword = useAction(api.access.resetMemberPassword);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [busy, setBusy] = useState(false);

	// Only the admin manages accounts, and only 'member' rows can be touched —
	// the admin's own account can't be removed or reset here.
	const showControls = canManage && member.role === "member";

	async function handleRemove() {
		setBusy(true);
		try {
			await removeMember({ userId: member.userId });
			setConfirmOpen(false);
			toast.success(`Acesso de ${member.email} removido`);
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
			await resetPassword({ userId: member.userId, password: newPassword });
			setResetOpen(false);
			setNewPassword("");
			toast.success(`Senha de ${member.email} redefinida`);
		} catch (error) {
			notifyError(error, "Não foi possível redefinir a senha");
		} finally {
			setBusy(false);
		}
	}

	return (
		<li className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/55 px-3.5 py-2">
			<span className="min-w-0 flex-1 truncate text-sm font-medium">
				{member.email}
			</span>
			<Badge variant="secondary">
				{member.role === "admin" ? "Administrador" : "Membro"}
			</Badge>
			{showControls ? (
				<span className="flex items-center gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setResetOpen(true)}
						aria-label={`Redefinir senha de ${member.email}`}
					>
						<KeyRound data-icon="inline-start" aria-hidden />
						Redefinir senha
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setConfirmOpen(true)}
						aria-label={`Remover ${member.email}`}
					>
						<Trash2 data-icon="inline-start" aria-hidden />
						Remover
					</Button>
				</span>
			) : null}

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">Remover acesso?</DialogTitle>
						<DialogDescription>
							{member.email} perde o acesso imediatamente. Os dados do casamento
							não são afetados.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={handleRemove}
							disabled={busy}
						>
							Sim, remover
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={resetOpen} onOpenChange={setResetOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Redefinir senha de {member.email}
						</DialogTitle>
						<DialogDescription>
							A pessoa é desconectada de todos os dispositivos e passa a usar a
							nova senha.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleReset} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor={`reset-password-${member.userId}`}>
								Nova senha
							</Label>
							<Input
								id={`reset-password-${member.userId}`}
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

/** Primary path: invite by e-mail — the invited person picks their own password. */
function InviteForm() {
	const inviteMember = useAction(api.access.inviteMember);
	const [email, setEmail] = useState("");
	const [sending, setSending] = useState(false);

	async function handleInvite(event: FormEvent) {
		event.preventDefault();
		setSending(true);
		try {
			await inviteMember({ email: email.trim() });
			toast.success(`Convite enviado para ${email.trim()}`);
			setEmail("");
		} catch (error) {
			notifyError(error, "Não foi possível enviar o convite");
		} finally {
			setSending(false);
		}
	}

	return (
		<form
			onSubmit={handleInvite}
			className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4"
		>
			<p className="text-sm font-semibold">Convidar por e-mail</p>
			<p className="text-xs text-muted-foreground">
				A pessoa recebe um link para criar a própria senha. O convite vale por 7
				dias.
			</p>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					type="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="convidado@exemplo.com"
					aria-label="E-mail do convidado"
					className="flex-1"
				/>
				<Button type="submit" disabled={sending}>
					<MailPlus data-icon="inline-start" aria-hidden />
					{sending ? "Enviando..." : "Convidar"}
				</Button>
			</div>
		</form>
	);
}

/** Invitations waiting to be accepted, with resend + revoke. */
function PendingInvitations() {
	const invitations = useQuery(api.access.listInvitations, {});
	const inviteMember = useAction(api.access.inviteMember);
	const revokeInvitation = useMutation(api.access.revokeInvitation);
	const [busyId, setBusyId] = useState<string | null>(null);

	if (!invitations || invitations.length === 0) return null;

	async function handleResend(email: string, id: string) {
		setBusyId(id);
		try {
			await inviteMember({ email });
			toast.success(`Convite reenviado para ${email}`);
		} catch (error) {
			notifyError(error, "Não foi possível reenviar o convite");
		} finally {
			setBusyId(null);
		}
	}

	async function handleRevoke(id: Id<"invitations">, email: string) {
		setBusyId(id);
		try {
			await revokeInvitation({ invitationId: id });
			toast.success(`Convite de ${email} cancelado`);
		} catch (error) {
			notifyError(error, "Não foi possível cancelar o convite");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm font-semibold">Convites pendentes</p>
			<ul className="flex flex-col gap-2">
				{invitations.map((invitation) => (
					<li
						key={invitation.id}
						className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border px-3.5 py-2"
					>
						<span className="min-w-0 flex-1 truncate text-sm">
							{invitation.email}
						</span>
						<span className="text-xs text-muted-foreground">
							expira em{" "}
							{formatDateBR(
								new Date(invitation.expiresAt).toISOString().slice(0, 10),
							)}
						</span>
						<Button
							variant="ghost"
							size="sm"
							disabled={busyId === invitation.id}
							onClick={() => handleResend(invitation.email, invitation.id)}
							aria-label={`Reenviar convite para ${invitation.email}`}
						>
							<RotateCcw data-icon="inline-start" aria-hidden />
							Reenviar
						</Button>
						<Button
							variant="ghost"
							size="sm"
							disabled={busyId === invitation.id}
							onClick={() => handleRevoke(invitation.id, invitation.email)}
							aria-label={`Cancelar convite de ${invitation.email}`}
						>
							<X data-icon="inline-start" aria-hidden />
							Cancelar
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
}

function CreateMemberForm() {
	const createMember = useAction(api.access.createMember);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [creating, setCreating] = useState(false);

	async function handleCreate(event: FormEvent) {
		event.preventDefault();
		setCreating(true);
		try {
			await createMember({ email: email.trim(), password });
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
			className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4"
		>
			<p className="text-sm font-semibold">Novo acesso</p>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="access-email">E-mail</Label>
					<Input
						id="access-email"
						type="email"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="convidado@exemplo.com"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
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
			</div>
			<Button type="submit" disabled={creating} className="self-end">
				<UserPlus data-icon="inline-start" aria-hidden />
				{creating ? "Criando..." : "Criar acesso"}
			</Button>
		</form>
	);
}
