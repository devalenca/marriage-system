"use client";

import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

/**
 * A quiet daily verse on the home screen — one motivational passage about
 * love, union and perseverance, the same for everyone each day. Renders
 * nothing until it loads (and if the verse base hasn't been seeded).
 */
export function DailyVerseCard() {
	const verse = useQuery(api.verses.daily, {});
	if (!verse) return null;

	return (
		<Card className="overflow-hidden">
			<CardContent className="flex gap-4 py-5">
				<span
					aria-hidden
					className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"
				>
					<Sparkles className="size-5" />
				</span>
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
						Versículo do dia
					</p>
					<blockquote className="mt-2 font-display text-lg leading-snug text-pretty text-foreground">
						“{verse.text}”
					</blockquote>
					<cite className="mt-2 block text-sm font-medium text-primary not-italic">
						{verse.reference}
					</cite>
				</div>
			</CardContent>
		</Card>
	);
}
