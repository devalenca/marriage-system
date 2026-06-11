import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
	title: "Entrar — Nosso Casamento",
};

export default function LoginPage() {
	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-10">
			<section className="w-full max-w-sm rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_24px_60px_oklch(0.32_0.07_132_/_0.22)] backdrop-blur-2xl">
				<header className="mb-7 text-center">
					<h1 className="font-display text-3xl font-semibold text-primary">
						Nosso Casamento
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Um cantinho só nosso — entre para continuar o planejamento.
					</p>
				</header>
				<LoginForm />
			</section>
		</main>
	);
}
