"use client";

import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { AttachmentKind } from "@/lib/domain/categories";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface FileUploadProps {
	vendorId?: Id<"vendors">;
	paymentId?: Id<"payments">;
	kind: AttachmentKind;
	/** Button label, e.g. "Anexar contrato" / "Anexar comprovante". */
	label: string;
	className?: string;
}

function formatBytes(bytes: number | undefined): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
	vendorId,
	paymentId,
	kind,
	label,
	className,
}: FileUploadProps) {
	const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
	const createAttachment = useMutation(api.attachments.create);
	const removeAttachment = useMutation(api.attachments.remove);

	const vendorList = useQuery(
		api.attachments.listByVendor,
		vendorId ? { vendorId } : "skip",
	);
	const paymentList = useQuery(
		api.attachments.listByPayment,
		paymentId ? { paymentId } : "skip",
	);
	const attachments = vendorId ? vendorList : paymentList;

	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
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
				await createAttachment({
					storageId,
					name: file.name,
					kind,
					mimeType: file.type || undefined,
					sizeBytes: file.size,
					...(vendorId ? { vendorId } : {}),
					...(paymentId ? { paymentId } : {}),
				});
			}
			toast.success(files.length > 1 ? "Arquivos anexados" : "Arquivo anexado");
		} catch (error) {
			notifyError(error, "Não foi possível anexar");
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	async function handleRemove(id: Id<"attachments">) {
		try {
			await removeAttachment({ id });
			toast.success("Anexo removido");
		} catch (error) {
			notifyError(error, "Não foi possível remover");
		}
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{attachments && attachments.length > 0 ? (
				<ul className="flex flex-col gap-1.5">
					{attachments.map((file) => (
						<li
							key={file._id}
							className="flex items-center gap-2 rounded-xl bg-card/50 px-3 py-2 ring-1 ring-border/60"
						>
							<FileText className="size-4 shrink-0 text-primary" aria-hidden />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{file.name}</p>
								{file.sizeBytes ? (
									<p className="text-[11px] text-muted-foreground">
										{formatBytes(file.sizeBytes)}
									</p>
								) : null}
							</div>
							{file.url ? (
								<a
									href={file.url}
									target="_blank"
									rel="noreferrer"
									aria-label={`Baixar ${file.name}`}
									className="text-muted-foreground transition-colors hover:text-primary"
								>
									<Download className="size-4" aria-hidden />
								</a>
							) : null}
							<button
								type="button"
								aria-label={`Remover ${file.name}`}
								onClick={() => handleRemove(file._id)}
								className="text-muted-foreground transition-colors hover:text-destructive"
							>
								<Trash2 className="size-4" aria-hidden />
							</button>
						</li>
					))}
				</ul>
			) : null}

			<input
				ref={inputRef}
				type="file"
				multiple
				className="hidden"
				onChange={(e) => handleFiles(e.target.files)}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={uploading}
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
				{uploading ? "Enviando..." : label}
			</Button>
		</div>
	);
}
