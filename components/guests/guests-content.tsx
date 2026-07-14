"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	Baby,
	CalendarCheck,
	Check,
	CircleDashed,
	Pencil,
	Plus,
	Search,
	Trash2,
	UserPlus,
	X,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useMemo, useState } from "react";
import { GuestExportButton } from "@/components/guests/guest-export-button";
import { GuestFormDialog } from "@/components/guests/guest-form-dialog";
import { GuestPrintSheet } from "@/components/guests/guest-print-sheet";
import { InviteFormDialog } from "@/components/guests/invite-form-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpenOnCreateParam } from "@/components/use-create-param";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
	INVITE_SIDE_LABELS,
	RSVP_STATUS_LABELS,
	RSVP_STATUSES,
	type RsvpStatus,
} from "@/lib/domain/guests";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

type InviteWithGuests = FunctionReturnType<
	typeof api.guests.listInvites
>[number];
type Guest = InviteWithGuests["guests"][number];

const STATUS_STYLES: Record<RsvpStatus, string> = {
	pendente: "text-warning",
	confirmado: "text-success",
	recusado: "text-foreground",
};

const STATUS_ICONS: Record<RsvpStatus, React.ReactNode> = {
	pendente: <CircleDashed className="size-3.5 text-warning" aria-hidden />,
	confirmado: <Check className="size-3.5 text-success" aria-hidden />,
	recusado: <X className="size-3.5 text-muted-foreground" aria-hidden />,
};

const RSVP_FILTER_ITEMS: Record<string, React.ReactNode> = {
	todos: "Todos os status",
	...RSVP_STATUS_LABELS,
};

export function GuestsContent() {
	const invites = useQuery(api.guests.listInvites, {});

	const [search, setSearch] = useState("");
	const [group, setGroup] = useState("todos");
	const [status, setStatus] = useState<RsvpStatus | "todos">("todos");
	const [view, setView] = useState<"convite" | "convidado">("convite");

	const [createInviteOpen, setCreateInviteOpen] = useState(false);
	useOpenOnCreateParam(setCreateInviteOpen);
	const [editingInvite, setEditingInvite] = useState<Doc<"invites"> | null>(
		null,
	);
	const [guestDialog, setGuestDialog] = useState<{
		inviteId: Id<"invites">;
		guest?: Doc<"guests">;
	} | null>(null);

	const groups = useMemo(() => {
		if (!invites) return [];
		return [
			...new Set(
				invites.map((i) => i.group?.trim()).filter((g): g is string => !!g),
			),
		].sort((a, b) => a.localeCompare(b));
	}, [invites]);

	const groupItems = useMemo(
		() => ({
			todos: "Todos os grupos",
			...Object.fromEntries(groups.map((g) => [g, g])),
		}),
		[groups],
	);

	const totals = useMemo(() => {
		const acc = { total: 0, confirmed: 0, pending: 0, declined: 0 };
		for (const invite of invites ?? []) {
			acc.total += invite.counts.total;
			acc.confirmed += invite.counts.confirmed;
			acc.pending += invite.counts.pending;
			acc.declined += invite.counts.declined;
		}
		return acc;
	}, [invites]);

	const term = search.trim().toLowerCase();
	const filteredInvites = (invites ?? []).filter((invite) => {
		if (group !== "todos" && invite.group?.trim() !== group) return false;
		if (term.length === 0) return true;
		if (invite.title.toLowerCase().includes(term)) return true;
		return invite.guests.some((g) => g.name.toLowerCase().includes(term));
	});

	if (invites === undefined) return <GuestsSkeleton />;

	const hasAny = invites.length > 0;

	return (
		<div className="animate-screen-enter">
			<GuestPrintSheet invites={invites} />
			<PageHeader
				title="Convidados"
				subtitle={
					hasAny
						? `${totals.total} convidado${totals.total === 1 ? "" : "s"} em ${invites.length} convite${invites.length === 1 ? "" : "s"}`
						: undefined
				}
				action={
					<div className="flex flex-wrap items-center justify-end gap-2">
						{hasAny ? <GuestExportButton invites={invites} /> : null}
						<Button
							variant="outline"
							render={<Link href="/convidados/check-in" />}
						>
							<CalendarCheck data-icon="inline-start" aria-hidden />
							<span className="hidden sm:inline">Check-in do dia</span>
							<span className="sm:hidden">Check-in</span>
						</Button>
						<Button onClick={() => setCreateInviteOpen(true)}>
							<Plus data-icon="inline-start" aria-hidden />
							Novo convite
						</Button>
					</div>
				}
			/>

			{hasAny ? (
				<div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<SummaryTile label="Convidados" value={totals.total} />
					<SummaryTile
						label="Confirmados"
						value={totals.confirmed}
						tone="text-success"
					/>
					<SummaryTile
						label="Pendentes"
						value={totals.pending}
						tone="text-warning"
					/>
					<SummaryTile label="Não vão" value={totals.declined} />
				</div>
			) : null}

			{hasAny ? (
				<div className="mb-4 flex flex-col gap-2">
					<div className="relative">
						<Search
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							aria-label="Buscar convite ou convidado"
							placeholder="Buscar por nome..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<div className="flex gap-2">
						<Select
							value={view}
							onValueChange={(v) => setView(v as "convite" | "convidado")}
							items={{ convite: "Por convite", convidado: "Por convidado" }}
						>
							<SelectTrigger
								aria-label="Modo de visualização"
								className="flex-1"
								size="sm"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="convite">Por convite</SelectItem>
								<SelectItem value="convidado">Por convidado</SelectItem>
							</SelectContent>
						</Select>
						{groups.length > 0 ? (
							<Select
								value={group}
								onValueChange={(v) => setGroup(v ?? "todos")}
								items={groupItems}
							>
								<SelectTrigger
									aria-label="Filtrar por grupo"
									className="flex-1"
									size="sm"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="todos">Todos os grupos</SelectItem>
									{groups.map((g) => (
										<SelectItem key={g} value={g}>
											{g}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}
						{view === "convidado" ? (
							<Select
								value={status}
								onValueChange={(v) => setStatus(v as RsvpStatus | "todos")}
								items={RSVP_FILTER_ITEMS}
							>
								<SelectTrigger
									aria-label="Filtrar por status"
									className="flex-1"
									size="sm"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="todos">Todos os status</SelectItem>
									{RSVP_STATUSES.map((s) => (
										<SelectItem key={s} value={s}>
											{RSVP_STATUS_LABELS[s]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}
					</div>
				</div>
			) : null}

			{!hasAny ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
							<UserPlus className="size-6" aria-hidden />
						</span>
						<p className="max-w-xs text-sm text-muted-foreground text-balance">
							Nenhum convite ainda. Crie o primeiro e comece a montar sua lista.
						</p>
						<Button onClick={() => setCreateInviteOpen(true)}>
							<Plus data-icon="inline-start" aria-hidden />
							Criar convite
						</Button>
					</CardContent>
				</Card>
			) : filteredInvites.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
							<Search className="size-6" aria-hidden />
						</span>
						<p className="text-sm text-muted-foreground text-balance">
							Nenhum convite encontrado com esses filtros.
						</p>
					</CardContent>
				</Card>
			) : view === "convite" ? (
				<ul className="flex flex-col gap-3">
					{filteredInvites.map((invite, index) => (
						<li
							key={invite._id}
							className="animate-card-enter"
							style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
						>
							<InviteCard
								invite={invite}
								onEdit={() => setEditingInvite(invite)}
								onAddGuest={() => setGuestDialog({ inviteId: invite._id })}
								onEditGuest={(guest) =>
									setGuestDialog({ inviteId: invite._id, guest })
								}
							/>
						</li>
					))}
				</ul>
			) : (
				<GuestFlatList
					invites={filteredInvites}
					status={status}
					onEditGuest={(inviteId, guest) => setGuestDialog({ inviteId, guest })}
				/>
			)}

			<InviteFormDialog
				open={createInviteOpen}
				onOpenChange={setCreateInviteOpen}
			/>
			<InviteFormDialog
				open={editingInvite !== null}
				onOpenChange={(open) => !open && setEditingInvite(null)}
				invite={editingInvite ?? undefined}
			/>
			{guestDialog ? (
				<GuestFormDialog
					open
					onOpenChange={(open) => !open && setGuestDialog(null)}
					inviteId={guestDialog.inviteId}
					guest={guestDialog.guest}
				/>
			) : null}
		</div>
	);
}

function SummaryTile({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone?: string;
}) {
	return (
		<div className="rounded-2xl bg-card/45 p-3 text-center ring-1 ring-border/60 transition-colors">
			<p
				className={cn("font-display text-2xl font-semibold tabular-nums", tone)}
			>
				{value}
			</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

function InviteCard({
	invite,
	onEdit,
	onAddGuest,
	onEditGuest,
}: {
	invite: InviteWithGuests;
	onEdit: () => void;
	onAddGuest: () => void;
	onEditGuest: (guest: Guest) => void;
}) {
	const removeInvite = useMutation(api.guests.removeInvite);

	const meta = [
		invite.group?.trim(),
		invite.side ? INVITE_SIDE_LABELS[invite.side] : null,
		invite.phone?.trim(),
	].filter(Boolean);

	async function handleRemove() {
		if (
			!confirm(
				`Excluir o convite "${invite.title}" e seus ${invite.counts.total} convidado(s)?`,
			)
		)
			return;
		try {
			await removeInvite({ id: invite._id });
		} catch (error) {
			notifyError(error, "Não foi possível excluir");
		}
	}

	return (
		<Card>
			<CardContent className="flex flex-col gap-3 py-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="truncate font-medium">{invite.title}</p>
						{meta.length > 0 ? (
							<p className="truncate text-xs text-muted-foreground">
								{meta.join(" · ")}
							</p>
						) : null}
						<p className="mt-1 text-xs text-muted-foreground">
							<span className="text-success">{invite.counts.confirmed}</span>{" "}
							confirmados ·{" "}
							<span className="text-warning">{invite.counts.pending}</span>{" "}
							pendentes
							{invite.counts.declined > 0
								? ` · ${invite.counts.declined} não vão`
								: ""}
						</p>
					</div>
					<div className="flex shrink-0 gap-1">
						<Button
							variant="ghost"
							size="icon"
							aria-label="Editar convite"
							onClick={onEdit}
							className="size-9 sm:size-8"
						>
							<Pencil aria-hidden />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Excluir convite"
							onClick={handleRemove}
							className="size-9 sm:size-8"
						>
							<Trash2 aria-hidden />
						</Button>
					</div>
				</div>

				{invite.guests.length > 0 ? (
					<ul className="flex flex-col divide-y rounded-2xl bg-card/40 ring-1 ring-border/50">
						{invite.guests.map((guest) => (
							<GuestRow
								key={guest._id}
								guest={guest}
								onEdit={() => onEditGuest(guest)}
							/>
						))}
					</ul>
				) : (
					<p className="text-xs text-muted-foreground">
						Nenhum convidado neste convite ainda.
					</p>
				)}

				<Button
					variant="outline"
					size="sm"
					className="self-start"
					onClick={onAddGuest}
				>
					<UserPlus data-icon="inline-start" aria-hidden />
					Adicionar convidado
				</Button>
			</CardContent>
		</Card>
	);
}

function GuestRow({
	guest,
	onEdit,
	context,
	as = "li",
}: {
	guest: Guest;
	onEdit: () => void;
	/** Optional line under the name (e.g. the invite title in the flat view). */
	context?: string;
	as?: "li" | "div";
}) {
	const updateGuest = useMutation(api.guests.updateGuest);
	const removeGuest = useMutation(api.guests.removeGuest);

	async function handleStatus(value: string | null) {
		if (!value) return;
		try {
			await updateGuest({ id: guest._id, rsvpStatus: value as RsvpStatus });
		} catch (error) {
			notifyError(error, "Não foi possível atualizar");
		}
	}

	async function handleRemove() {
		if (!confirm(`Remover ${guest.name}?`)) return;
		try {
			await removeGuest({ id: guest._id });
		} catch (error) {
			notifyError(error, "Não foi possível remover");
		}
	}

	const Tag = as;

	return (
		<Tag className="flex items-center gap-2 px-3 py-2">
			<div className="min-w-0 flex-1">
				<p className="flex items-center gap-1 truncate text-sm font-medium">
					{guest.name}
					{guest.isChild ? (
						<Baby
							className="size-3.5 text-muted-foreground"
							aria-label="Criança"
						/>
					) : null}
				</p>
				{context ? (
					<p className="truncate text-xs text-muted-foreground">{context}</p>
				) : null}
				{guest.mealNotes ? (
					<p className="truncate text-xs text-muted-foreground">
						{guest.mealNotes}
					</p>
				) : null}
			</div>
			<Select
				value={guest.rsvpStatus}
				onValueChange={handleStatus}
				items={RSVP_STATUS_LABELS}
			>
				<SelectTrigger
					size="sm"
					aria-label={`Status de ${guest.name}`}
					className={cn(
						"w-[8rem] font-medium",
						STATUS_STYLES[guest.rsvpStatus],
					)}
				>
					{STATUS_ICONS[guest.rsvpStatus]}
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{RSVP_STATUSES.map((s) => (
						<SelectItem key={s} value={s}>
							{RSVP_STATUS_LABELS[s]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				variant="ghost"
				size="icon"
				aria-label={`Editar ${guest.name}`}
				onClick={onEdit}
				className="size-9 sm:size-8"
			>
				<Pencil aria-hidden />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				aria-label={`Remover ${guest.name}`}
				onClick={handleRemove}
				className="size-9 sm:size-8"
			>
				<Trash2 aria-hidden />
			</Button>
		</Tag>
	);
}

function GuestFlatList({
	invites,
	status,
	onEditGuest,
}: {
	invites: InviteWithGuests[];
	status: RsvpStatus | "todos";
	onEditGuest: (inviteId: Id<"invites">, guest: Guest) => void;
}) {
	const rows = invites.flatMap((invite) =>
		invite.guests
			.filter((g) => status === "todos" || g.rsvpStatus === status)
			.map((guest) => ({ invite, guest })),
	);

	if (rows.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
					<span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
						<Search className="size-6" aria-hidden />
					</span>
					<p className="text-sm text-muted-foreground">
						Nenhum convidado com esse status.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="flex flex-col divide-y py-1">
				{rows.map(({ invite, guest }) => (
					<GuestRow
						key={guest._id}
						as="div"
						guest={guest}
						context={invite.title}
						onEdit={() => onEditGuest(invite._id, guest)}
					/>
				))}
			</CardContent>
		</Card>
	);
}

function GuestsSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-busy>
			<Skeleton className="h-24 rounded-2xl" />
			<Skeleton className="h-32 rounded-2xl" />
			<Skeleton className="h-32 rounded-2xl" />
		</div>
	);
}
