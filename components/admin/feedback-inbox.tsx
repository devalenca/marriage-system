"use client";

import { useQuery } from "convex/react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { formatDateBR } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
	sugestao: "Sugestão",
	problema: "Problema",
	elogio: "Elogio",
};

const KIND_STYLES: Record<string, string> = {
	sugestao: "bg-primary/10 text-primary",
	problema: "bg-warning/15 text-warning",
	elogio: "bg-success/15 text-success",
};

/** Epoch ms → dd/MM/yyyy, reusing the domain formatter via an ISO date. */
function toISODate(epochMs: number): string {
	return new Date(epochMs).toISOString().slice(0, 10);
}

/** Superadmin inbox for the feedback couples send from Ajustes. */
export function FeedbackInbox() {
	const feedback = useQuery(api.feedback.list, {});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">
					Feedback dos casais
				</CardTitle>
				<CardDescription>
					{feedback === undefined
						? "Carregando o feedback recebido..."
						: feedback.length === 0
							? "Nenhuma mensagem ainda."
							: `${feedback.length} ${feedback.length === 1 ? "mensagem" : "mensagens"} de casais.`}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2.5">
				{feedback === undefined ? (
					<>
						<Skeleton className="h-20 rounded-2xl" />
						<Skeleton className="h-20 rounded-2xl" />
					</>
				) : (
					feedback.map((item) => (
						<div
							key={item._id}
							className="rounded-2xl border border-border bg-card/55 p-4"
						>
							<div className="flex flex-wrap items-center gap-2">
								<span
									className={cn(
										"rounded-full px-2.5 py-0.5 text-xs font-medium",
										KIND_STYLES[item.kind] ?? "bg-muted text-muted-foreground",
									)}
								>
									{KIND_LABELS[item.kind] ?? item.kind}
								</span>
								<span className="text-sm font-medium text-foreground">
									{item.coupleNames ?? item.email ?? "Casal"}
								</span>
								<span className="ml-auto text-xs text-muted-foreground">
									{formatDateBR(toISODate(item.createdAt))}
								</span>
							</div>
							<p className="mt-2 text-sm text-pretty text-foreground/90">
								{item.message}
							</p>
							{item.coupleNames && item.email ? (
								<p className="mt-1.5 text-xs text-muted-foreground">
									{item.email}
								</p>
							) : null}
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}
