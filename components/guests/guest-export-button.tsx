"use client";

import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	type GuestExportInvite,
	guestsToCsv,
} from "@/lib/domain/guests-export";

interface GuestExportButtonProps {
	invites: readonly GuestExportInvite[];
}

export function GuestExportButton({ invites }: GuestExportButtonProps) {
	function handleDownload() {
		// The BOM is already the first character of the string, so the Blob
		// content is just the CSV — no extra BOM (unlike the payments export).
		const csv = guestsToCsv(invites);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "convidados.csv";
		link.click();
		URL.revokeObjectURL(url);
		toast.success("Lista exportada");
	}

	function handlePrint() {
		window.print();
	}

	return (
		<div className="flex flex-wrap gap-2">
			<Button variant="outline" size="sm" onClick={handleDownload}>
				<Download data-icon="inline-start" aria-hidden />
				Exportar CSV
			</Button>
			<Button variant="outline" size="sm" onClick={handlePrint}>
				<Printer data-icon="inline-start" aria-hidden />
				Imprimir
			</Button>
		</div>
	);
}
