"use client";

import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { WEDDING_THEMES } from "@/lib/domain/themes";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

/** Lets the couple pick the accent colour their whole space wears. */
export function ThemeCard({ current }: { current: string }) {
	const setTheme = useMutation(api.weddings.setTheme);
	const [pending, setPending] = useState<string | null>(null);

	async function choose(id: string) {
		if (id === current || pending !== null) return;
		setPending(id);
		try {
			await setTheme({ theme: id });
		} catch (error) {
			notifyError(error, "Não foi possível trocar o tema");
		} finally {
			setPending(null);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Tema do casal</CardTitle>
				<CardDescription>
					A cor de destaque do app inteiro. Escolha a que combina com o
					casamento de vocês.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-2.5">
					{WEDDING_THEMES.map((theme) => {
						const selected = theme.id === current;
						return (
							<button
								key={theme.id}
								type="button"
								onClick={() => choose(theme.id)}
								aria-pressed={selected}
								disabled={pending !== null}
								className={cn(
									"flex min-h-11 items-center gap-2.5 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-70",
									selected
										? "border-primary bg-card/70 text-foreground ring-1 ring-primary/25"
										: "border-border text-muted-foreground hover:bg-card/50 hover:text-foreground",
								)}
							>
								<span
									className="flex size-6 items-center justify-center rounded-full ring-1 ring-black/10"
									style={{ backgroundColor: theme.swatch }}
								>
									{selected ? (
										<Check className="size-4 text-white" aria-hidden />
									) : null}
								</span>
								{theme.label}
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
