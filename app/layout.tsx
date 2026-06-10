import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
		<ConvexAuthNextjsServerProvider>
			<html
				lang="pt-BR"
				className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
			>
				<body className="min-h-full flex flex-col">
					<ConvexClientProvider>{children}</ConvexClientProvider>
					<Toaster position="top-center" richColors />
				</body>
			</html>
		</ConvexAuthNextjsServerProvider>
	);
}
