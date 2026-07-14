import { CalendarClock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Illustrative, static preview of the in-app cockpit shown on the marketing
 * hero. Purely decorative — it uses the real design tokens (glass card, the
 * dark premium finance surface, olive→gold progress) so the landing page shows
 * what the product actually looks like without shipping fake user data.
 */
export function CockpitPreview() {
	// Upcoming-installment columns for the little forecast strip.
	const forecast = [
		{ month: "Ago", height: 44 },
		{ month: "Set", height: 72 },
		{ month: "Out", height: 58 },
		{ month: "Nov", height: 88 },
	];

	return (
		<Card
			aria-hidden
			className="animate-card-enter w-full max-w-md gap-0 p-5 sm:p-6"
			style={{ animationDelay: "160ms" }}
		>
			<div className="flex items-center justify-between">
				<span className="font-display text-lg font-semibold text-primary">
					Nosso Casamento
				</span>
				<span className="inline-flex items-center gap-1.5 rounded-full bg-accent/70 px-3 py-1 text-xs font-medium text-accent-foreground ring-1 ring-border">
					<CalendarClock className="size-3.5" />
					<span className="tabular-nums">128</span> dias
				</span>
			</div>

			{/* Premium finance surface, mirrors the real budget forecast card. */}
			<div className="finance-glow-card relative mt-4 overflow-hidden rounded-2xl p-5 text-white">
				<p className="text-xs font-medium tracking-wide text-white/70">
					Orçamento
				</p>
				<p className="mt-1 font-display text-3xl font-semibold tabular-nums">
					R$ 80.000
				</p>
				<div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
					<div
						className="grow-x h-full rounded-full"
						style={{
							width: "62%",
							backgroundImage:
								"linear-gradient(90deg, oklch(0.7 0.11 145), oklch(0.78 0.12 88))",
						}}
					/>
				</div>
				<div className="mt-2.5 flex items-center justify-between text-xs text-white/75">
					<span className="tabular-nums">Pago R$ 49.600</span>
					<span className="tabular-nums">Falta R$ 30.400</span>
				</div>

				<div className="mt-5 flex items-end gap-2.5">
					{forecast.map((column, index) => (
						<div
							key={column.month}
							className="flex flex-1 flex-col items-center gap-1.5"
						>
							<div className="flex h-16 w-full items-end">
								<div
									className="grow-y w-full rounded-md bg-gradient-to-t from-white/25 to-white/55"
									style={{
										height: `${column.height}%`,
										animationDelay: `${index * 90}ms`,
									}}
								/>
							</div>
							<span className="text-[0.65rem] text-white/60">
								{column.month}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* A resolved checklist row + the next pending one. */}
			<div className="mt-4 flex flex-col gap-2">
				<div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
					<span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
						<Check className="size-3.5" />
					</span>
					<span className="text-sm text-foreground/80 line-through">
						Fechar buffet
					</span>
				</div>
				<div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ring-border">
					<span className="flex size-5 items-center justify-center rounded-full border border-warning/50" />
					<span className="text-sm text-foreground">Provar o bolo</span>
					<span className="ml-auto text-xs font-medium text-warning">
						Este mês
					</span>
				</div>
			</div>
		</Card>
	);
}
