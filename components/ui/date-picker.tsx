"use client";

import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Styled stand-in for `<input type="date">`, which renders the browser's own
 * widget — English month names, mm/dd/yyyy ghost text — in the middle of an
 * otherwise pt-BR form. Displays dd/MM/yyyy, speaks pt-BR in the calendar,
 * and reports ISO yyyy-MM-dd upward, the format the whole domain stores.
 */
export function DatePicker({
	id,
	value,
	onChange,
	placeholder = "Escolha uma data",
	className,
}: {
	id?: string;
	/** ISO yyyy-MM-dd, or "" while unset. */
	value: string;
	onChange: (iso: string) => void;
	placeholder?: string;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = value
		? parse(value, "yyyy-MM-dd", new Date())
		: undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						id={id}
						type="button"
						variant="outline"
						className={cn(
							"h-11 w-full justify-start bg-field text-left font-normal",
							!value && "text-muted-foreground",
							className,
						)}
					/>
				}
			>
				<CalendarIcon
					className="size-4 text-muted-foreground"
					data-icon="inline-start"
					aria-hidden
				/>
				{selected ? format(selected, "dd/MM/yyyy") : placeholder}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					mode="single"
					locale={ptBR}
					selected={selected}
					defaultMonth={selected}
					onSelect={(day) => {
						if (day) onChange(format(day, "yyyy-MM-dd"));
						setOpen(false);
					}}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
