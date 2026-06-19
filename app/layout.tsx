import type { Metadata, Viewport } from "next";
import {
	Cormorant_Garamond,
	Geist_Mono,
	Hanken_Grotesk,
} from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

// "Editorial Sereno" type system: Hanken Grotesk for body/UI, Cormorant
// Garamond for serif display (countdown, headings). Geist Mono stays for
// any monospaced/tabular needs.
const hankenSans = Hanken_Grotesk({
	variable: "--font-sans-base",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
	variable: "--font-mono-base",
	subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
	variable: "--font-display",
	subsets: ["latin"],
	weight: ["500", "600", "700"],
	style: ["normal", "italic"],
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
			className={`${hankenSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<ConvexClientProvider>{children}</ConvexClientProvider>
				<Toaster position="top-center" richColors />
			</body>
		</html>
	);
}
