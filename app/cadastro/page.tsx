import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
	title: "Criar conta — Nosso Casamento",
};

export default function SignupPage() {
	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-10">
			<section className="animate-card-enter w-full max-w-md rounded-[2rem] border border-border bg-card/80 p-7 shadow-[0_24px_60px_oklch(0.32_0.07_132_/_0.22)] backdrop-blur-2xl sm:p-8">
				<header className="mb-7 text-center">
					<h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-primary">
						Nosso Casamento
					</h1>
					<div
						aria-hidden
						className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent"
					/>
					<p className="mt-3 text-pretty text-sm text-muted-foreground">
						Comece grátis por 14 dias. Crie o cockpit do seu casamento em um
						minuto.
					</p>
				</header>
				<SignupForm />
			</section>
		</main>
	);
}
