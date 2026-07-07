import type { AttachmentKind } from "./categories";

interface AttachmentFilterInput {
	name: string;
	kind: AttachmentKind | string;
	source: { vendorName: string | null; paymentDescription?: string };
}

export interface AttachmentFilters {
	search?: string;
	kind?: AttachmentKind | "todos";
}

function normalize(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filterAttachments<T extends AttachmentFilterInput>(
	items: T[],
	{ search, kind }: AttachmentFilters,
): T[] {
	const needle = search ? normalize(search) : null;
	return items.filter((item) => {
		if (kind && kind !== "todos" && item.kind !== kind) return false;
		if (needle) {
			const haystack = [
				item.name,
				item.source.vendorName ?? "",
				item.source.paymentDescription ?? "",
			]
				.map(normalize)
				.join(" ");
			if (!haystack.includes(needle)) return false;
		}
		return true;
	});
}
