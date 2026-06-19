import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
	title: "Entrar — Nosso Casamento",
};

const HERO_IMAGE = "/wedding-field-hero.png";

export default function LoginPage() {
	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={HERO_IMAGE}
				alt=""
				aria-hidden
				className="absolute inset-0 h-full w-full object-cover [object-position:center_45%]"
			/>
			<div
				aria-hidden
				className="absolute inset-0 bg-[linear-gradient(180deg,rgba(38,48,38,.28),rgba(38,48,38,.52))]"
			/>

			<section className="animate-fadeup relative w-full max-w-[380px] rounded-[26px] border border-white/60 bg-[rgba(250,248,242,.92)] p-9 shadow-[0_20px_60px_-20px_rgba(30,40,30,.5)] backdrop-blur-md">
				<header className="mb-6 text-center">
					<div className="mx-auto mb-3.5 flex size-[54px] items-center justify-center rounded-2xl bg-[#eef2ec]">
						<span className="size-[18px] rounded-[5px] bg-primary" />
					</div>
					<h1 className="font-display text-[30px] font-bold leading-[1.04] text-[#3c5741]">
						Nosso Casamento
					</h1>
					<p className="mx-auto mt-2 max-w-[16rem] text-[13.5px] leading-relaxed text-muted-foreground">
						Um cantinho só nosso — entre para continuar o planejamento.
					</p>
				</header>
				<LoginForm />
			</section>

			<p className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 text-center text-[11.5px] text-white/80">
				Acesso criado pelo administrador · sem cadastro público
			</p>
		</main>
	);
}
