"use client";

import { useMutation, useQuery } from "convex/react";
import { ImageUp, RotateCcw } from "lucide-react";
import { type ChangeEvent, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { notifyError } from "@/lib/notify";

const MAX_BYTES = 8 * 1024 * 1024;

/** Lets the couple swap the app's background photo for one of their own. */
export function BackgroundCard() {
	const backgroundUrl = useQuery(api.weddings.background, {});
	const generateUploadUrl = useMutation(
		api.weddings.generateBackgroundUploadUrl,
	);
	const setBackground = useMutation(api.weddings.setBackground);
	const clearBackground = useMutation(api.weddings.clearBackground);
	const inputId = useId();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const hasCustom =
		typeof backgroundUrl === "string" && backgroundUrl.length > 0;

	async function handleFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setError(null);

		if (!file.type.startsWith("image/")) {
			setError("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
			return;
		}
		if (file.size > MAX_BYTES) {
			setError("A imagem precisa ter até 8 MB.");
			return;
		}

		setBusy(true);
		try {
			const uploadUrl = await generateUploadUrl({});
			const response = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!response.ok) throw new Error("upload falhou");
			const { storageId } = (await response.json()) as {
				storageId: Id<"_storage">;
			};
			await setBackground({ storageId });
			toast.success("Foto de fundo atualizada");
		} catch (uploadError) {
			notifyError(uploadError, "Não foi possível enviar a foto");
		} finally {
			setBusy(false);
		}
	}

	async function handleReset() {
		setBusy(true);
		try {
			await clearBackground({});
			toast.success("Foto padrão restaurada");
		} catch (resetError) {
			notifyError(resetError, "Não foi possível restaurar a foto");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Foto de fundo</CardTitle>
				<CardDescription>
					A imagem que aparece atrás do app inteiro. Use uma foto de vocês —
					paisagens horizontais funcionam melhor.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div
					className="h-32 rounded-2xl bg-cover bg-center ring-1 ring-border"
					style={{
						backgroundImage: `url("${hasCustom ? backgroundUrl : "/wedding-field-hero.png"}")`,
					}}
					role="img"
					aria-label={
						hasCustom ? "Foto de fundo do casal" : "Foto de fundo padrão"
					}
				/>

				{error ? (
					<p role="alert" className="text-sm font-medium text-destructive">
						{error}
					</p>
				) : null}

				<div className="flex flex-wrap items-center gap-2">
					{/* The input is the labelled control; the button is its visual. */}
					<input
						id={inputId}
						type="file"
						accept="image/*"
						aria-label="Escolher foto"
						onChange={handleFile}
						disabled={busy}
						className="sr-only"
					/>
					<Button
						render={
							// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor points at the input above
							<label htmlFor={inputId} />
						}
						nativeButton={false}
						variant="outline"
					>
						<ImageUp data-icon="inline-start" aria-hidden />
						{busy ? "Enviando..." : "Escolher foto"}
					</Button>
					{hasCustom ? (
						<Button variant="ghost" onClick={handleReset} disabled={busy}>
							<RotateCcw data-icon="inline-start" aria-hidden />
							Voltar ao padrão
						</Button>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
