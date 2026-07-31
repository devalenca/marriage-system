import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const fraunces = Fraunces({
	variable: "--font-display",
	subsets: ["latin"],
	weight: ["500", "600"],
});

export const metadata: Metadata = {
	title: "Nosso Casamento",
	description: "Cockpit de planejamento do casamento",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		// suppressHydrationWarning: next-themes stamps the `dark` class on <html>
		// before hydration, which React would otherwise flag as a mismatch.
		<html
			lang="pt-BR"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				{/* Light is canonical (DESIGN.md); dark is opt-in via the landing
				    toggle and persisted by next-themes. */}
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem={false}
					disableTransitionOnChange
				>
					<ConvexClientProvider>{children}</ConvexClientProvider>
					<Toaster position="top-center" richColors />
				</ThemeProvider>
			</body>
		</html>
	);
}
