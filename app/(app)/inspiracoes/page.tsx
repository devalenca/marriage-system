import type { Metadata } from "next";
import { InspirationContent } from "@/components/inspiration/inspiration-content";

export const metadata: Metadata = { title: "Inspirações — Nosso Casamento" };

export default function InspirationPage() {
	return <InspirationContent />;
}
