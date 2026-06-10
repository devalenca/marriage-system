import type { Metadata } from "next";
import { FinanceContent } from "@/components/finance/finance-content";

export const metadata: Metadata = { title: "Financeiro — Nosso Casamento" };

export default function FinancePage() {
	return <FinanceContent />;
}
