"use client";

import { type ComponentProps, useState } from "react";
import { Input } from "@/components/ui/input";
import { parseBRLInput } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

const displayFormatter = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

function toDisplay(cents: number | null): string {
	return cents === null ? "" : displayFormatter.format(cents / 100);
}

interface CurrencyInputProps
	extends Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
	value: number | null;
	onValueChange: (cents: number | null) => void;
}

/** Text input for BRL amounts; the bound value is integer centavos. */
export function CurrencyInput({
	value,
	onValueChange,
	className,
	...props
}: CurrencyInputProps) {
	const [text, setText] = useState(() => toDisplay(value));

	return (
		<div className="relative">
			<span
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
			>
				R$
			</span>
			<Input
				{...props}
				type="text"
				inputMode="decimal"
				value={text}
				className={cn("pl-9 tabular-nums", className)}
				onChange={(event) => {
					const next = event.target.value;
					setText(next);
					onValueChange(parseBRLInput(next));
				}}
				onBlur={(event) => {
					setText(toDisplay(parseBRLInput(event.target.value)));
					props.onBlur?.(event);
				}}
			/>
		</div>
	);
}
