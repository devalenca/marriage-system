import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeBootstrap } from "@/components/theme-bootstrap";
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
		<html
			lang="pt-BR"
			// next-themes writes `class` and `style` on <html> before paint.
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<ThemeBootstrap />
				<AppThemeProvider>
					<ConvexClientProvider>{children}</ConvexClientProvider>
					<Toaster position="top-center" richColors />
				</AppThemeProvider>
			</body>
		</html>
	);
}
