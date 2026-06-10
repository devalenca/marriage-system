import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata: Metadata = { title: "Início — Nosso Casamento" };

export default function DashboardPage() {
	return <DashboardContent />;
}
