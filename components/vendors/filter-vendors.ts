import type { VendorCategory, VendorStatus } from "@/lib/domain/categories";

interface VendorFilterInput {
	name: string;
	category: VendorCategory | string;
	status: VendorStatus | string;
}

export interface VendorFilters {
	search?: string;
	category?: VendorCategory | "todas";
	status?: VendorStatus | "todos";
}

function normalize(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filterVendors<T extends VendorFilterInput>(
	vendors: T[],
	{ search, category, status }: VendorFilters,
): T[] {
	const needle = search ? normalize(search) : null;
	return vendors.filter((vendor) => {
		if (needle && !normalize(vendor.name).includes(needle)) return false;
		if (category && category !== "todas" && vendor.category !== category)
			return false;
		if (status && status !== "todos" && vendor.status !== status) return false;
		return true;
	});
}
