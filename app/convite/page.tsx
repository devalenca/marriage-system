import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteAcceptForm } from "@/components/invite-accept-form";

export const metadata: Metadata = {
	title: "Convite — Nosso Casamento",
};

export default function InvitePage() {
	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-10">
			<section className="animate-card-enter w-full max-w-sm rounded-[2rem] border border-border bg-card/80 p-7 shadow-[0_24px_60px_oklch(0.32_0.07_132_/_0.22)] backdrop-blur-2xl sm:p-8">
				<header className="mb-7 text-center">
					<h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-primary">
						Nosso Casamento
					</h1>
					<div
						aria-hidden
						className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent"
					/>
				</header>
				{/* useSearchParams requires a Suspense boundary in the App Router. */}
				<Suspense fallback={null}>
					<InviteAcceptForm />
				</Suspense>
			</section>
		</main>
	);
}
