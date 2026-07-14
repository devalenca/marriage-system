import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata: Metadata = { title: "Administração — Nosso Casamento" };

export default function AdminPage() {
	return <AdminPanel />;
}
