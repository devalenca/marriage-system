import { AppNav } from "@/components/app-nav";

export default function AppLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className="min-h-screen md:pl-72">
			<AppNav />
			<main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-24 sm:px-6 md:px-8 md:pt-8 md:pb-14">
				{children}
			</main>
		</div>
	);
}
