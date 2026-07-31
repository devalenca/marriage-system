"use client";

import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Paperclip, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { filterAttachments } from "@/lib/domain/attachments-filter";
import {
	ATTACHMENT_KIND_LABELS,
	ATTACHMENT_KINDS,
	type AttachmentKind,
} from "@/lib/domain/categories";
import { notifyError } from "@/lib/notify";

const KIND_FILTER_ITEMS: Record<string, React.ReactNode> = {
	todos: "Todos os tipos",
	...ATTACHMENT_KIND_LABELS,
};

// Intl formatter construction is expensive; build it once per module load.
// `uploadedAt` is epoch ms (Date.now()), NOT an ISO date — formatDateBR does not apply.
const uploadedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

function formatBytes(bytes: number | undefined): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsContent() {
	const files = useQuery(api.attachments.listAll, {});
	const removeAttachment = useMutation(api.attachments.remove);
	const [search, setSearch] = useState("");
	const [kind, setKind] = useState<AttachmentKind | "todos">("todos");
	const [pendingDelete, setPendingDelete] = useState<{
		id: Id<"attachments">;
		name: string;
	} | null>(null);

	const filtered = files ? filterAttachments(files, { search, kind }) : [];

	async function handleDelete() {
		if (pendingDelete === null) return;
		try {
			await removeAttachment({ id: pendingDelete.id });
			toast.success(`${pendingDelete.name} excluído`);
		} catch (error) {
			notifyError(error, "Não foi possível excluir o anexo");
		} finally {
			setPendingDelete(null);
		}
	}

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Anexos"
				subtitle={
					files
						? `${files.length} arquivo${files.length === 1 ? "" : "s"}`
						: undefined
				}
			/>

			<div className="mb-4 flex flex-col gap-2">
				<div className="relative">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						aria-label="Buscar anexo"
						placeholder="Buscar por nome, fornecedor..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={kind}
					onValueChange={(v) => setKind(v as AttachmentKind | "todos")}
					items={KIND_FILTER_ITEMS}
				>
					<SelectTrigger
						aria-label="Filtrar por tipo"
						className="w-full"
						size="sm"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todos">Todos os tipos</SelectItem>
						{ATTACHMENT_KINDS.map((value) => (
							<SelectItem key={value} value={value}>
								{ATTACHMENT_KIND_LABELS[value]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{files === undefined ? (
				<div className="flex flex-col gap-3" aria-busy>
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
				</div>
			) : filtered.length === 0 ? (
				<Card className="animate-card-enter">
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<Paperclip className="size-8 text-muted-foreground" aria-hidden />
						<p className="text-pretty text-sm text-muted-foreground">
							{files.length === 0
								? "Nenhum anexo ainda. Anexe contratos e comprovantes nas páginas de fornecedores e pagamentos."
								: "Nenhum anexo com esses filtros. Ajuste a busca para ver mais."}
						</p>
						{files.length > 0 ? (
							<Button
								variant="outline"
								onClick={() => {
									setSearch("");
									setKind("todos");
								}}
								className="h-11 px-3.5 sm:h-8 sm:px-2.5"
							>
								Limpar filtros
							</Button>
						) : null}
					</CardContent>
				</Card>
			) : (
				<ul className="flex flex-col gap-3">
					{filtered.map((file, index) => {
						const sourceLabel =
							file.source.type === "vendor"
								? (file.source.vendorName ?? "Fornecedor removido")
								: `${file.source.vendorName ?? "Fornecedor"} · ${file.source.paymentDescription ?? "Pagamento"}`;
						const uploadedAt = uploadedAtFormatter.format(
							new Date(file.uploadedAt),
						);
						const size = formatBytes(file.sizeBytes);
						return (
							<li
								key={file._id}
								className="animate-card-enter"
								style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
							>
								<Card>
									<CardContent className="flex items-center gap-3 py-4">
										<FileText
											className="size-5 shrink-0 text-primary"
											aria-hidden
										/>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate font-medium">{file.name}</p>
												<Badge variant="secondary" className="shrink-0">
													{ATTACHMENT_KIND_LABELS[file.kind]}
												</Badge>
											</div>
											{file.source.vendorId ? (
												<Link
													href={`/fornecedores/${file.source.vendorId}`}
													className="text-xs text-muted-foreground transition-colors hover:text-primary"
												>
													{sourceLabel}
												</Link>
											) : (
												<p className="text-xs text-muted-foreground">
													{sourceLabel}
												</p>
											)}
											<p className="text-xs text-muted-foreground tabular-nums">
												{size ? `${size} · ${uploadedAt}` : uploadedAt}
											</p>
										</div>
										{file.url ? (
											<a
												href={file.url}
												target="_blank"
												rel="noreferrer"
												aria-label={`Abrir ${file.name}`}
												className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/40 hover:text-primary sm:size-9"
											>
												<Download className="size-4" aria-hidden />
											</a>
										) : null}
										<Button
											variant="ghost"
											size="icon"
											aria-label={`Excluir ${file.name}`}
											onClick={() =>
												setPendingDelete({ id: file._id, name: file.name })
											}
											className="-mr-1 size-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive sm:size-9"
										>
											<Trash2 aria-hidden />
										</Button>
									</CardContent>
								</Card>
							</li>
						);
					})}
				</ul>
			)}

			<AlertDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-display">
							Excluir anexo?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingDelete?.name} será apagado em definitivo. O fornecedor e o
							pagamento continuam como estão.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleDelete}>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
