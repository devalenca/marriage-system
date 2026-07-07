import type { Metadata } from "next";
import { AttachmentsContent } from "@/components/attachments/attachments-content";

export const metadata: Metadata = { title: "Anexos — Nosso Casamento" };

export default function AttachmentsPage() {
	return <AttachmentsContent />;
}
