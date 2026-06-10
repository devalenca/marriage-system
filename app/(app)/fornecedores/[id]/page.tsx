import type { Metadata } from "next";
import { VendorDetail } from "@/components/vendors/vendor-detail";
import type { Id } from "@/convex/_generated/dataModel";

export const metadata: Metadata = { title: "Fornecedor — Nosso Casamento" };

export default async function VendorPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <VendorDetail vendorId={id as Id<"vendors">} />;
}
