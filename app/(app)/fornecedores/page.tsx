import type { Metadata } from "next";
import { VendorsContent } from "@/components/vendors/vendors-content";

export const metadata: Metadata = { title: "Fornecedores — Nosso Casamento" };

export default function VendorsPage() {
	return <VendorsContent />;
}
