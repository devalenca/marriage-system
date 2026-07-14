"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { Infinity as InfinityIcon, KeyRound, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { PageHeader } from "@/components/page-header";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateBR, isValidISODate } from "@/lib/domain/dates";
import { notifyError } from "@/lib/notify";

type Wedding = {
	_id: Id<"weddings">;
	coupleNames: string;
	weddingDate: string;
	memberCount: number;
	adminUserId: Id<"users"> | null;
	adminEmail: string | null;
	subscription: {
		active: boolean;
		activeUntil: string | null;
		daysLeft: number | null;
	};
};

/** Superadmin-only: provision couples and manage their manual subscriptions. */
export function AdminPanel() {
	const viewer = useQuery(api.users.viewer, {});
	const weddings = useQuery(
		api.weddings.listAll,
		viewer?.isSuperadmin ? {} : "skip",
	);

	if (viewer === undefined) {
		return (
			<div className="animate-screen-enter" aria-busy>
				<PageHeader title="Administração" />
				<div className="flex flex-col gap-3">
					<Skeleton className="h-72 rounded-2xl" />
					<Skeleton className="h-48 rounded-2xl" />
				</div>
			</div>
		);
	}

	if (!viewer.isSuperadmin) {
		return (
			<div className="animate-screen-enter">
				<PageHeader title="Administração" />
				<Card>
					<CardHeader>
						<CardTitle className="font-display text-lg">
							Acesso restrito
						</CardTitle>
						<CardDescription>
							Esta área é exclusiva da administração da plataforma. Sua conta
							não tem permissão para vê-la.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Administração"
				subtitle="Cadastre casais e gerencie as assinaturas manualmente."
			/>
			<div className="flex flex-col gap-3">
				<ProvisionForm />
				<Card>
					<CardHeader>
						<CardTitle className="font-display text-lg">Casais</CardTitle>
						<CardDescription>
							{weddings === undefined
								? "Carregando os casamentos cadastrados..."
								: `${weddings.length} ${
										weddings.length === 1
											? "casamento cadastrado"
											: "casamentos cadastrados"
									}.`}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2.5">
						{weddings === undefined ? (
							<>
								<Skeleton className="h-24 rounded-2xl" />
								<Skeleton className="h-24 rounded-2xl" />
							</>
						) : weddings.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum casamento cadastrado ainda. Use o formulário acima para
								provisionar o primeiro.
							</p>
						) : (
							weddings.map((wedding) => (
								<WeddingRow key={wedding._id} wedding={wedding} />
							))
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function ProvisionForm() {
	const provision = useAction(api.access.provision);
	const [coupleNames, setCoupleNames] = useState("");
	const [weddingDate, setWeddingDate] = useState("");
	const [budgetCents, setBudgetCents] = useState<number | null>(null);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [creating, setCreating] = useState(false);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (coupleNames.trim().length === 0) {
			toast.error("Informe os nomes do casal");
			return;
		}
		if (!isValidISODate(weddingDate)) {
			toast.error("Escolha a data do casamento");
			return;
		}
		if (budgetCents === null || budgetCents <= 0) {
			toast.error("Defina a meta de orçamento");
			return;
		}

		setCreating(true);
		try {
			await provision({
				coupleNames: coupleNames.trim(),
				weddingDate,
				budgetGoalCents: budgetCents,
				email: email.trim(),
				password,
			});
			toast.success(
				`Casamento de ${coupleNames.trim()} criado com teste de 14 dias`,
			);
			setCoupleNames("");
			setWeddingDate("");
			setBudgetCents(null);
			setEmail("");
			setPassword("");
		} catch (error) {
			notifyError(error, "Não foi possível provisionar o casamento");
		} finally {
			setCreating(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Novo casamento</CardTitle>
				<CardDescription>
					Cria a conta do casal, o casamento e um período de teste de 14 dias.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Key remount not needed; fields are cleared on success. */}
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="provision-names">Nomes do casal</Label>
							<Input
								id="provision-names"
								placeholder="Ex.: Gabriel & Alice"
								value={coupleNames}
								onChange={(e) => setCoupleNames(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="provision-date">Data do casamento</Label>
							<Input
								id="provision-date"
								type="date"
								value={weddingDate}
								onChange={(e) => setWeddingDate(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="provision-budget">Meta de orçamento</Label>
							<CurrencyInput
								id="provision-budget"
								placeholder="55.000,00"
								value={budgetCents}
								onValueChange={setBudgetCents}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="provision-email">E-mail de acesso</Label>
							<Input
								id="provision-email"
								type="email"
								required
								autoComplete="off"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="casal@exemplo.com"
							/>
						</div>
						<div className="flex flex-col gap-1.5 sm:col-span-2">
							<Label htmlFor="provision-password">Senha inicial</Label>
							<Input
								id="provision-password"
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
						{creating ? "Criando..." : "Provisionar casamento"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function SubscriptionBadge({
	subscription,
}: {
	subscription: Wedding["subscription"];
}) {
	const { active, activeUntil, daysLeft } = subscription;

	if (!active) {
		return (
			<Badge className="border-warning/25 bg-warning/12 text-warning">
				Expirada
			</Badge>
		);
	}

	const label =
		activeUntil === null
			? "Ilimitada"
			: `Ativa até ${formatDateBR(activeUntil)}`;

	// Nudge the superadmin when a paid window is close to lapsing.
	const showCountdown = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
	const countdown = daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`;

	return (
		<span className="flex items-center gap-1.5">
			<Badge className="border-success/25 bg-success/12 text-success">
				{label}
			</Badge>
			{showCountdown ? (
				<span className="text-xs text-muted-foreground">{countdown}</span>
			) : null}
		</span>
	);
}

function WeddingRow({ wedding }: { wedding: Wedding }) {
	const setSubscription = useMutation(api.weddings.setSubscription);
	const resetPassword = useAction(api.users.resetPassword);

	const [until, setUntil] = useState(wedding.subscription.activeUntil ?? "");
	const [savingSub, setSavingSub] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [resetting, setResetting] = useState(false);

	async function handleSaveUntil() {
		if (!isValidISODate(until)) {
			toast.error("Escolha uma data de validade");
			return;
		}
		setSavingSub(true);
		try {
			await setSubscription({ weddingId: wedding._id, activeUntil: until });
			toast.success(`Assinatura ativa até ${formatDateBR(until)}`);
		} catch (error) {
			notifyError(error, "Não foi possível atualizar a assinatura");
		} finally {
			setSavingSub(false);
		}
	}

	async function handleMakeUnlimited() {
		setSavingSub(true);
		try {
			await setSubscription({ weddingId: wedding._id, activeUntil: null });
			setUntil("");
			toast.success("Assinatura marcada como ilimitada");
		} catch (error) {
			notifyError(error, "Não foi possível atualizar a assinatura");
		} finally {
			setSavingSub(false);
		}
	}

	async function handleReset(event: FormEvent) {
		event.preventDefault();
		if (wedding.adminUserId === null) return;
		setResetting(true);
		try {
			await resetPassword({ id: wedding.adminUserId, password: newPassword });
			setResetOpen(false);
			setNewPassword("");
			toast.success("Senha do admin redefinida");
		} catch (error) {
			notifyError(error, "Não foi possível redefinir a senha");
		} finally {
			setResetting(false);
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/55 p-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate font-display text-base font-semibold">
						{wedding.coupleNames}
					</p>
					<p className="text-sm text-muted-foreground">
						{formatDateBR(wedding.weddingDate)} ·{" "}
						{wedding.memberCount === 1
							? "1 membro"
							: `${wedding.memberCount} membros`}
					</p>
					<p className="truncate text-sm text-muted-foreground">
						{wedding.adminEmail ?? "Sem administrador"}
					</p>
				</div>
				<SubscriptionBadge subscription={wedding.subscription} />
			</div>

			<div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`until-${wedding._id}`} className="text-xs">
						Ativa até
					</Label>
					<Input
						id={`until-${wedding._id}`}
						type="date"
						value={until}
						onChange={(e) => setUntil(e.target.value)}
						className="w-[10.5rem]"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleSaveUntil}
					disabled={savingSub}
				>
					Salvar validade
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleMakeUnlimited}
					disabled={savingSub}
				>
					<InfinityIcon data-icon="inline-start" aria-hidden />
					Tornar ilimitada
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setResetOpen(true)}
					disabled={wedding.adminUserId === null}
					className="ml-auto"
					aria-label={`Redefinir senha do admin de ${wedding.coupleNames}`}
				>
					<KeyRound data-icon="inline-start" aria-hidden />
					Redefinir senha
				</Button>
			</div>

			<Dialog open={resetOpen} onOpenChange={setResetOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Redefinir senha do admin
						</DialogTitle>
						<DialogDescription>
							{wedding.adminEmail
								? `${wedding.adminEmail} é desconectado de todos os dispositivos e passa a usar a nova senha.`
								: "O administrador passa a usar a nova senha."}
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleReset} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor={`reset-${wedding._id}`}>Nova senha</Label>
							<Input
								id={`reset-${wedding._id}`}
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
							<Button type="submit" disabled={resetting}>
								Redefinir
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
