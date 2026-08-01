"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { notifyError } from "@/lib/notify";

/** Per-user switches for the daily reminder e-mails. */
export function NotificationsCard() {
	const prefs = useQuery(api.notifications.myPrefs, {});
	const savePrefs = useMutation(api.notifications.savePrefs);

	if (prefs === undefined) return null;

	async function toggle(key: "paymentReminders" | "subscriptionReminders") {
		if (prefs === undefined) return;
		try {
			await savePrefs({ ...prefs, [key]: !prefs[key] });
		} catch (error) {
			notifyError(error, "Não foi possível salvar a preferência");
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">
					Notificações por e-mail
				</CardTitle>
				<CardDescription>
					A gente avisa na véspera dos vencimentos para nada passar batido.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col">
						<Label htmlFor="prefs-payments">Lembretes de pagamento</Label>
						<span className="text-xs text-muted-foreground">
							Resumo quando uma parcela está perto de vencer ou atrasou.
						</span>
					</div>
					<Switch
						id="prefs-payments"
						checked={prefs.paymentReminders}
						onCheckedChange={() => toggle("paymentReminders")}
					/>
				</div>
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col">
						<Label htmlFor="prefs-subscription">Avisos da assinatura</Label>
						<span className="text-xs text-muted-foreground">
							Alerta quando o período de acesso estiver acabando.
						</span>
					</div>
					<Switch
						id="prefs-subscription"
						checked={prefs.subscriptionReminders}
						onCheckedChange={() => toggle("subscriptionReminders")}
					/>
				</div>
				<TestEmailSection />
			</CardContent>
		</Card>
	);
}

/** Proves the deployment can actually deliver — sends only to the caller. */
function TestEmailSection() {
	const sendTestEmail = useAction(api.notifications.sendTestEmail);
	const [sending, setSending] = useState(false);

	async function handleClick() {
		setSending(true);
		try {
			const { to, delivered } = await sendTestEmail({});
			if (delivered) {
				toast.success(`E-mail de teste enviado para ${to}`);
			} else {
				toast.warning("Nenhum serviço de e-mail configurado neste ambiente");
			}
		} catch (error) {
			notifyError(error, "Não foi possível enviar o e-mail de teste");
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
			<span className="text-xs text-muted-foreground">
				Quer conferir se está tudo certo? Mandamos um e-mail de teste para você.
			</span>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleClick}
				disabled={sending}
			>
				<Send className="size-4" aria-hidden />
				{sending ? "Enviando..." : "Enviar teste"}
			</Button>
		</div>
	);
}
