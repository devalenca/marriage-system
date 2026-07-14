"use client";

import { useMutation } from "convex/react";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

const KINDS = [
	{ id: "sugestao", label: "Sugestão" },
	{ id: "problema", label: "Problema" },
	{ id: "elogio", label: "Elogio" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

/** Lets the couple tell us what they need — feedback the superadmin reads. */
export function FeedbackCard() {
	const submit = useMutation(api.feedback.submit);
	const [kind, setKind] = useState<Kind>("sugestao");
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (message.trim().length < 3) {
			toast.error("Escreva um pouco mais para a gente entender.");
			return;
		}
		setSending(true);
		try {
			await submit({ kind, message: message.trim() });
			toast.success("Recebemos! Obrigado por ajudar a melhorar o app.");
			setMessage("");
			setKind("sugestao");
		} catch (error) {
			notifyError(error, "Não foi possível enviar");
		} finally {
			setSending(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 font-display text-lg">
					<MessagesSquare data-icon="inline-start" aria-hidden />
					Fale com a gente
				</CardTitle>
				<CardDescription>
					Conte o que está faltando ou o que atrapalha no seu planejamento. A
					gente lê tudo — sua ideia pode virar a próxima novidade.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-wrap gap-2">
						{KINDS.map((option) => {
							const selected = option.id === kind;
							return (
								<button
									key={option.id}
									type="button"
									aria-pressed={selected}
									onClick={() => setKind(option.id)}
									className={cn(
										"min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
										selected
											? "border-primary bg-primary/10 text-foreground"
											: "border-border text-muted-foreground hover:bg-card/50",
									)}
								>
									{option.label}
								</button>
							);
						})}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="feedback-message" className="sr-only">
							Sua mensagem
						</Label>
						<Textarea
							id="feedback-message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={4}
							maxLength={4000}
							placeholder="Ex.: adoraria um mapa de mesas para organizar os convidados…"
						/>
					</div>
					<Button type="submit" disabled={sending} className="self-end">
						{sending ? "Enviando..." : "Enviar"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
