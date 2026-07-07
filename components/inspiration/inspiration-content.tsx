"use client";

import { useMutation, useQuery } from "convex/react";
import { Images, Loader2, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function InspirationContent() {
	const galleries = useQuery(api.inspiration.listGalleries);
	const createGallery = useMutation(api.inspiration.createGallery);
	const renameGallery = useMutation(api.inspiration.renameGallery);
	const removeGallery = useMutation(api.inspiration.removeGallery);
	const generateUploadUrl = useMutation(api.inspiration.generateUploadUrl);
	const addImage = useMutation(api.inspiration.addImage);
	const removeImage = useMutation(api.inspiration.removeImage);

	const [activeGalleryId, setActiveGalleryId] =
		useState<Id<"galleries"> | null>(null);
	const [creatingName, setCreatingName] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [renaming, setRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	// Keep an active gallery selected: default to first, drop stale selections.
	useEffect(() => {
		if (!galleries) return;
		const first = galleries[0];
		if (!first) {
			if (activeGalleryId !== null) setActiveGalleryId(null);
			return;
		}
		const stillExists = galleries.some((g) => g._id === activeGalleryId);
		if (!stillExists) setActiveGalleryId(first._id);
	}, [galleries, activeGalleryId]);

	const activeGallery =
		galleries?.find((g) => g._id === activeGalleryId) ?? null;

	async function handleCreateGallery() {
		const name = creatingName.trim();
		if (name.length === 0) return;
		try {
			const id = await createGallery({ name });
			setActiveGalleryId(id);
			setCreatingName("");
			setShowCreate(false);
			toast.success("Galeria criada");
		} catch (error) {
			notifyError(error, "Não foi possível criar a galeria");
		}
	}

	async function handleRename() {
		if (!activeGallery) return;
		const name = renameValue.trim();
		if (name.length === 0) return;
		try {
			await renameGallery({ id: activeGallery._id, name });
			setRenaming(false);
			toast.success("Galeria renomeada");
		} catch (error) {
			notifyError(error, "Não foi possível renomear");
		}
	}

	async function handleRemoveGallery() {
		if (!activeGallery) return;
		try {
			await removeGallery({ id: activeGallery._id });
			setConfirmingDelete(false);
			toast.success("Galeria excluída");
		} catch (error) {
			notifyError(error, "Não foi possível excluir");
		}
	}

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0 || !activeGalleryId) return;
		setUploading(true);
		try {
			for (const file of Array.from(files)) {
				const uploadUrl = await generateUploadUrl();
				const result = await fetch(uploadUrl, {
					method: "POST",
					headers: file.type ? { "Content-Type": file.type } : undefined,
					body: file,
				});
				if (!result.ok) throw new Error("Falha no upload");
				const { storageId } = (await result.json()) as {
					storageId: Id<"_storage">;
				};
				await addImage({ galleryId: activeGalleryId, storageId });
			}
			toast.success(
				files.length > 1 ? "Imagens adicionadas" : "Imagem adicionada",
			);
		} catch (error) {
			notifyError(error, "Não foi possível adicionar");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	async function handleRemoveImage(id: Id<"inspirationImages">) {
		try {
			await removeImage({ id });
			toast.success("Imagem removida");
		} catch (error) {
			notifyError(error, "Não foi possível remover");
		}
	}

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Inspirações"
				subtitle={
					galleries
						? `${galleries.length} galeria${galleries.length === 1 ? "" : "s"}`
						: undefined
				}
				action={
					<Button
						onClick={() => {
							setShowCreate(true);
							setCreatingName("");
						}}
					>
						<Plus data-icon="inline-start" aria-hidden />
						Nova galeria
					</Button>
				}
			/>

			{showCreate ? (
				<Card className="mb-4">
					<CardContent className="flex flex-col gap-2 py-4 sm:flex-row">
						<Input
							autoFocus
							aria-label="Nome da nova galeria"
							placeholder="Nome da galeria"
							value={creatingName}
							onChange={(e) => setCreatingName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCreateGallery();
								if (e.key === "Escape") setShowCreate(false);
							}}
						/>
						<div className="flex gap-2">
							<Button onClick={handleCreateGallery}>Criar</Button>
							<Button variant="outline" onClick={() => setShowCreate(false)}>
								Cancelar
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			{galleries === undefined ? (
				<div className="flex flex-col gap-3" aria-busy>
					<Skeleton className="h-10 rounded-2xl" />
					<Skeleton className="h-48 rounded-2xl" />
				</div>
			) : galleries.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<Images className="size-8 text-muted-foreground" aria-hidden />
						<p className="text-sm text-muted-foreground">
							Crie sua primeira galeria de inspirações.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap gap-2">
						{galleries.map((gallery) => {
							const active = gallery._id === activeGalleryId;
							return (
								<button
									key={gallery._id}
									type="button"
									onClick={() => {
										setActiveGalleryId(gallery._id);
										setRenaming(false);
										setConfirmingDelete(false);
									}}
									className={cn(
										"inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors",
										active
											? "bg-primary text-primary-foreground"
											: "bg-card/55 text-muted-foreground ring-1 ring-border/60 hover:text-foreground",
									)}
								>
									{gallery.name}
								</button>
							);
						})}
					</div>

					{activeGallery ? (
						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								{renaming ? (
									<div className="flex flex-1 flex-wrap gap-2">
										<Input
											autoFocus
											aria-label="Novo nome da galeria"
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleRename();
												if (e.key === "Escape") setRenaming(false);
											}}
											className="max-w-xs"
										/>
										<Button size="sm" onClick={handleRename}>
											Salvar
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setRenaming(false)}
										>
											Cancelar
										</Button>
									</div>
								) : (
									<h2 className="font-display text-xl font-semibold text-primary">
										{activeGallery.name}
									</h2>
								)}

								{!renaming ? (
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												setRenameValue(activeGallery.name);
												setRenaming(true);
											}}
										>
											<Pencil data-icon="inline-start" aria-hidden />
											Renomear
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setConfirmingDelete(true)}
										>
											<Trash2 data-icon="inline-start" aria-hidden />
											Excluir galeria
										</Button>
									</div>
								) : null}
							</div>

							{confirmingDelete ? (
								<Card>
									<CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
										<p className="text-sm text-muted-foreground">
											Excluir “{activeGallery.name}” e todas as suas imagens?
										</p>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="destructive"
												onClick={handleRemoveGallery}
											>
												Excluir
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => setConfirmingDelete(false)}
											>
												Cancelar
											</Button>
										</div>
									</CardContent>
								</Card>
							) : null}

							<input
								ref={inputRef}
								type="file"
								accept="image/*"
								multiple
								className="hidden"
								onChange={(e) => handleFiles(e.target.files)}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={uploading || !activeGalleryId}
								onClick={() => inputRef.current?.click()}
								className="self-start"
							>
								{uploading ? (
									<Loader2
										className="animate-spin"
										data-icon="inline-start"
										aria-hidden
									/>
								) : (
									<Paperclip data-icon="inline-start" aria-hidden />
								)}
								{uploading ? "Enviando..." : "Adicionar imagens"}
							</Button>

							{activeGallery.images.length === 0 ? (
								<Card>
									<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
										<Images
											className="size-8 text-muted-foreground"
											aria-hidden
										/>
										<p className="text-pretty text-sm text-muted-foreground">
											Nenhuma imagem ainda. Adicione fotos que inspiram o seu
											casamento.
										</p>
									</CardContent>
								</Card>
							) : (
								<div className="columns-2 gap-3 md:columns-3 lg:columns-4">
									{activeGallery.images.map((image, index) =>
										image.url ? (
											<figure
												key={image._id}
												className="group animate-card-enter relative mb-3 break-inside-avoid overflow-hidden rounded-xl ring-1 ring-border/60"
												style={{
													animationDelay: `${Math.min(index, 8) * 40}ms`,
												}}
											>
												{/* biome-ignore lint/performance/noImgElement: Convex storage URLs are not statically known. */}
												<img
													src={image.url}
													alt={image.caption ?? "Inspiração"}
													className="h-auto w-full"
												/>
												<button
													type="button"
													aria-label="Remover imagem"
													onClick={() => handleRemoveImage(image._id)}
													className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-opacity hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
												>
													<Trash2 className="size-4" aria-hidden />
												</button>
												{image.caption ? (
													<figcaption className="px-3 py-2 text-xs text-muted-foreground">
														{image.caption}
													</figcaption>
												) : null}
											</figure>
										) : null,
									)}
								</div>
							)}
						</div>
					) : null}
				</div>
			)}
		</div>
	);
}
