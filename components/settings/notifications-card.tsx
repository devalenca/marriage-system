"use client";

import { useMutation, useQuery } from "convex/react";
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
			</CardContent>
		</Card>
	);
}
