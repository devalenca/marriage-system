"use client";

import { useQuery } from "convex/react";
import { AlertTriangle, Clock } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatDateBR } from "@/lib/domain/dates";

/**
 * App-wide subscription signal. When the wedding's subscription has lapsed the
 * backend blocks writes and this banner is the user-facing read-only notice.
 * While active it stays out of the way, only surfacing a gentle heads-up in the
 * final days before expiry. Renders nothing while the query is loading.
 */
export function SubscriptionBanner() {
	const status = useQuery(api.weddings.subscriptionStatus, {});

	if (status === undefined) return null;

	if (!status.active) {
		return (
			<div
				role="alert"
				className="mb-6 flex animate-card-enter items-start gap-3 rounded-2xl border border-warning/40 bg-warning/12 px-4 py-3.5 text-warning"
			>
				<AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
				<div className="min-w-0 text-sm">
					<p className="font-medium">
						Assinatura expirada — o acesso está em modo somente leitura.
					</p>
					<p className="mt-1 text-warning/80">
						{status.activeUntil
							? `Sua assinatura venceu em ${formatDateBR(status.activeUntil)}. `
							: ""}
						Fale com quem administra o app para renovar e voltar a editar.
					</p>
				</div>
			</div>
		);
	}

	if (status.daysLeft !== null && status.daysLeft <= 3) {
		const days = Math.max(status.daysLeft, 0);
		return (
			<div className="mb-6 flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning/8 px-3.5 py-2.5 text-sm text-muted-foreground">
				<Clock className="size-4 shrink-0 text-warning" aria-hidden />
				<p>
					Seu período expira em{" "}
					<span className="font-medium text-warning">
						{days} {days === 1 ? "dia" : "dias"}
					</span>
					{status.activeUntil ? ` (${formatDateBR(status.activeUntil)})` : ""}.
				</p>
			</div>
		);
	}

	return null;
}
