"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
	Infinity as InfinityIcon,
	KeyRound,
	ListChecks,
	Plus,
	Trash2,
	UserPlus,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { FeedbackInbox } from "@/components/admin/feedback-inbox";
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
import {
	CATEGORY_LABELS,
	PRIORITY_LABELS,
	TASK_PRIORITIES,
	VENDOR_CATEGORIES,
} from "@/lib/domain/categories";
import { monthsBeforeLabel } from "@/lib/domain/checklist";
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
				<ChecklistTemplateCard />
				<FeedbackInbox />
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
	const removeWedding = useMutation(api.weddings.remove);
	const regenerateChecklist = useMutation(api.tasks.generateFromTemplate);

	const [until, setUntil] = useState(wedding.subscription.activeUntil ?? "");
	const [regenOpen, setRegenOpen] = useState(false);
	const [regenerating, setRegenerating] = useState(false);
	const [savingSub, setSavingSub] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [resetting, setResetting] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

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

	async function handleRegenerate() {
		setRegenerating(true);
		try {
			const result = await regenerateChecklist({
				weddingId: wedding._id,
				regenerate: true,
			});
			setRegenOpen(false);
			toast.success(
				`Checklist recriado para ${wedding.coupleNames} (${result.created} tarefas)`,
			);
		} catch (error) {
			notifyError(error, "Não foi possível recriar o checklist");
		} finally {
			setRegenerating(false);
		}
	}

	async function handleDelete() {
		setDeleting(true);
		try {
			await removeWedding({ weddingId: wedding._id });
			setDeleteOpen(false);
			toast.success(`Casamento de ${wedding.coupleNames} excluído`);
		} catch (error) {
			notifyError(error, "Não foi possível excluir o casamento");
		} finally {
			setDeleting(false);
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
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setRegenOpen(true)}
					aria-label={`Recriar o checklist de ${wedding.coupleNames}`}
				>
					<ListChecks data-icon="inline-start" aria-hidden />
					Regerar checklist
				</Button>
				<Button
					variant="destructive"
					size="sm"
					onClick={() => setDeleteOpen(true)}
					aria-label={`Excluir o casamento de ${wedding.coupleNames}`}
				>
					<Trash2 data-icon="inline-start" aria-hidden />
					Excluir
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

			<Dialog open={regenOpen} onOpenChange={setRegenOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Recriar o checklist de {wedding.coupleNames}?
						</DialogTitle>
						<DialogDescription>
							Recria as tarefas do checklist padrão a partir da data do
							casamento. Tarefas já concluídas e as criadas pelo casal são
							preservadas; as pendentes geradas automaticamente são
							substituídas.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRegenOpen(false)}
						>
							Cancelar
						</Button>
						<Button onClick={handleRegenerate} disabled={regenerating}>
							{regenerating ? "Recriando..." : "Recriar checklist"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-display">
							Excluir o casamento de {wedding.coupleNames}?
						</DialogTitle>
						<DialogDescription>
							Todos os dados do casamento — fornecedores, orçamento, pagamentos,
							checklist e acessos — são apagados permanentemente. Esta ação não
							pode ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleting}
						>
							{deleting ? "Excluindo..." : "Excluir para sempre"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

const MONTH_OPTIONS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;
const TEMPLATE_FIELD_CLASS =
	"h-10 rounded-lg border border-input bg-field px-3 text-sm text-foreground";

/**
 * Superadmin editor for the platform-wide default checklist. Empty until
 * seeded from the shipped template; every couple provisioned afterwards — and
 * any wedding regenerated from a row above — is built from these items.
 */
function ChecklistTemplateCard() {
	const items = useQuery(api.checklistTemplate.list, {});
	const addItem = useMutation(api.checklistTemplate.add);
	const removeItem = useMutation(api.checklistTemplate.remove);
	const seedDefault = useMutation(api.checklistTemplate.seedDefault);

	const [title, setTitle] = useState("");
	const [monthsBefore, setMonthsBefore] = useState(6);
	const [priority, setPriority] =
		useState<(typeof TASK_PRIORITIES)[number]>("media");
	const [category, setCategory] = useState("");
	const [saving, setSaving] = useState(false);
	const [seeding, setSeeding] = useState(false);

	async function handleAdd(event: FormEvent) {
		event.preventDefault();
		if (title.trim().length === 0) {
			toast.error("Informe o título da tarefa");
			return;
		}
		setSaving(true);
		try {
			await addItem({
				title: title.trim(),
				monthsBefore,
				priority,
				category:
					category === ""
						? undefined
						: (category as (typeof VENDOR_CATEGORIES)[number]),
			});
			setTitle("");
			toast.success("Item adicionado ao checklist padrão");
		} catch (error) {
			notifyError(error, "Não foi possível adicionar o item");
		} finally {
			setSaving(false);
		}
	}

	async function handleSeed() {
		setSeeding(true);
		try {
			const result = await seedDefault({});
			toast.success(`Checklist padrão carregado (${result.created} itens)`);
		} catch (error) {
			notifyError(error, "Não foi possível carregar o checklist padrão");
		} finally {
			setSeeding(false);
		}
	}

	async function handleRemove(id: Id<"checklistTemplate">, itemTitle: string) {
		try {
			await removeItem({ id });
			toast.success(`"${itemTitle}" removido do checklist padrão`);
		} catch (error) {
			notifyError(error, "Não foi possível remover o item");
		}
	}

	// Group the (already sorted) items by their months-before bucket so the
	// editor reads like the couple's own checklist.
	const groups: { label: string; items: NonNullable<typeof items> }[] = [];
	if (items) {
		for (const item of items) {
			const label = monthsBeforeLabel(item.monthsBefore);
			const last = groups.at(-1);
			if (last && last.label === label) last.items.push(item);
			else groups.push({ label, items: [item] });
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Checklist padrão</CardTitle>
				<CardDescription>
					As tarefas que todo casal recebe ao ser cadastrado. Edite aqui e cada
					novo casamento — ou qualquer um recriado acima — nasce com esta lista.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{items === undefined ? (
					<Skeleton className="h-40 rounded-2xl" />
				) : items.length === 0 ? (
					<div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-4">
						<p className="text-sm text-muted-foreground">
							Ainda usando o checklist embutido no sistema. Carregue-o para
							começar a editar; nada muda para os casais até você ajustar algum
							item.
						</p>
						<Button onClick={handleSeed} disabled={seeding}>
							<ListChecks data-icon="inline-start" aria-hidden />
							{seeding ? "Carregando..." : "Carregar checklist padrão"}
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						{groups.map((group) => (
							<div key={group.label} className="flex flex-col gap-1.5">
								<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									{group.label}
								</p>
								{group.items.map((item) => (
									<div
										key={item._id}
										className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/55 px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												{item.title}
											</p>
											<p className="text-xs text-muted-foreground">
												{PRIORITY_LABELS[item.priority]}
												{item.category
													? ` · ${CATEGORY_LABELS[item.category]}`
													: ""}
											</p>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemove(item._id, item.title)}
											aria-label={`Remover "${item.title}" do checklist padrão`}
										>
											<Trash2 aria-hidden />
										</Button>
									</div>
								))}
							</div>
						))}
					</div>
				)}

				<form
					onSubmit={handleAdd}
					className="flex flex-col gap-3 border-t border-border/60 pt-4"
				>
					<p className="text-sm font-medium">Adicionar item</p>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="tmpl-title">Título</Label>
						<Input
							id="tmpl-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ex.: Contratar cerimonialista"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="tmpl-months">Antecedência</Label>
							<select
								id="tmpl-months"
								className={TEMPLATE_FIELD_CLASS}
								value={monthsBefore}
								onChange={(e) => setMonthsBefore(Number(e.target.value))}
							>
								{MONTH_OPTIONS.map((n) => (
									<option key={n} value={n}>
										{monthsBeforeLabel(n)}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="tmpl-priority">Prioridade</Label>
							<select
								id="tmpl-priority"
								className={TEMPLATE_FIELD_CLASS}
								value={priority}
								onChange={(e) =>
									setPriority(
										e.target.value as (typeof TASK_PRIORITIES)[number],
									)
								}
							>
								{TASK_PRIORITIES.map((p) => (
									<option key={p} value={p}>
										{PRIORITY_LABELS[p]}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="tmpl-category">Categoria (opcional)</Label>
							<select
								id="tmpl-category"
								className={TEMPLATE_FIELD_CLASS}
								value={category}
								onChange={(e) => setCategory(e.target.value)}
							>
								<option value="">— nenhuma —</option>
								{VENDOR_CATEGORIES.map((c) => (
									<option key={c} value={c}>
										{CATEGORY_LABELS[c]}
									</option>
								))}
							</select>
						</div>
					</div>
					<Button type="submit" disabled={saving} className="self-start">
						<Plus data-icon="inline-start" aria-hidden />
						{saving ? "Adicionando..." : "Adicionar item"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
