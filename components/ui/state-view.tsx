import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Shared centered shell for every state view (empty / all-clear / error). */
function StateShell({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
			{children}
		</div>
	);
}

function StateTitle({ children }: { children: ReactNode }) {
	return (
		<h2 className="font-display text-[23px] font-semibold text-foreground">
			{children}
		</h2>
	);
}

function StateDescription({ children }: { children: ReactNode }) {
	return (
		<p className="mt-2 max-w-[250px] text-[13.5px] leading-relaxed text-muted-foreground">
			{children}
		</p>
	);
}

/** First-use / no-data state with an optional call to action. */
export function EmptyState({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<StateShell>
			<div
				className="mb-[18px] flex size-[76px] items-center justify-center rounded-[22px] bg-[#eef2ec]"
				aria-hidden
			>
				<span className="size-8 rounded-[10px] border-2 border-dashed border-[#9fb09a]" />
			</div>
			<StateTitle>{title}</StateTitle>
			<StateDescription>{description}</StateDescription>
			{action ? <div className="mt-5">{action}</div> : null}
		</StateShell>
	);
}

/** Everything is settled — a reassuring green checkmark. */
export function AllClearState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<StateShell>
			<div
				className="mb-[18px] flex size-[76px] items-center justify-center rounded-full bg-[#4b6b4f] text-white"
				aria-hidden
			>
				<Check className="size-9" strokeWidth={2.5} />
			</div>
			<StateTitle>{title}</StateTitle>
			<StateDescription>{description}</StateDescription>
		</StateShell>
	);
}

/** Load failure with an optional retry. */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
	return (
		<StateShell>
			<div
				className="mb-[18px] flex size-[76px] items-center justify-center rounded-full bg-[#f7e3de] text-[32px] leading-none text-destructive"
				aria-hidden
			>
				!
			</div>
			<StateTitle>Não foi possível carregar</StateTitle>
			<StateDescription>
				Verifique sua conexão e tente novamente. Seus dados estão salvos.
			</StateDescription>
			{onRetry ? (
				<Button
					type="button"
					variant="outline"
					onClick={onRetry}
					className="mt-5 h-11 rounded-full px-6 text-[#3c5741]"
				>
					Tentar novamente
				</Button>
			) : null}
		</StateShell>
	);
}
