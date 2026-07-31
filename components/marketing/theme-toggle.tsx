"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Light/dark switch for the landing page. Rendered only after mount so the
 * icon never mismatches the persisted theme during hydration.
 */
export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDark = mounted && resolvedTheme === "dark";

	return (
		<Button
			variant="ghost"
			size="icon-lg"
			aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{isDark ? (
				<Sun className="size-4.5" aria-hidden />
			) : (
				<Moon className="size-4.5" aria-hidden />
			)}
		</Button>
	);
}
