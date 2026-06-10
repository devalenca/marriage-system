import type { Metadata } from "next";
import { ChecklistContent } from "@/components/checklist/checklist-content";

export const metadata: Metadata = { title: "Checklist — Nosso Casamento" };

export default function ChecklistPage() {
	return <ChecklistContent />;
}
