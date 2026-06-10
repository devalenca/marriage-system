import type { Metadata } from "next";
import { SettingsContent } from "@/components/settings/settings-content";

export const metadata: Metadata = { title: "Configurações — Nosso Casamento" };

export default function SettingsPage() {
	return <SettingsContent />;
}
