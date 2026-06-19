import type { Metadata } from "next";
import { AgendaContent } from "@/components/agenda/agenda-content";

export const metadata: Metadata = { title: "Agenda — Nosso Casamento" };

export default function AgendaPage() {
	return <AgendaContent />;
}
