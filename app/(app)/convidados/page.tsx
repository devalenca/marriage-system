import type { Metadata } from "next";
import { GuestsContent } from "@/components/guests/guests-content";

export const metadata: Metadata = { title: "Convidados — Nosso Casamento" };

export default function GuestsPage() {
	return <GuestsContent />;
}
