import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The payment strip on each vendor card: how far along the payments are, and
// what is still owed — the number the couple acts on.

const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
	useMutation: () => vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/fornecedores",
}));

import { VendorsContent } from "@/components/vendors/vendors-content";

function vendor(overrides: Record<string, unknown> = {}) {
	return {
		_id: "v1",
		name: "Fazenda Vista Verde",
		category: "espaco",
		status: "parcialmente_pago",
		contractedCents: 2_400_000,
		financials: {
			paidCents: 720_000,
			pendingCents: 1_680_000,
			scheduledCents: 2_400_000,
			remainingInstallments: 3,
			progress: 0.3,
		},
		...overrides,
	};
}

describe("vendor payment progress", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
	});

	it("shows the percentage and what is still owed", () => {
		useQueryMock.mockReturnValue([vendor()]);
		render(<VendorsContent />);

		expect(screen.getByText("30% pago")).toBeInTheDocument();
		expect(screen.getByText(/faltam/i)).toBeInTheDocument();
		expect(screen.getByText("R$ 16.800,00")).toBeInTheDocument();
	});

	it("celebrates a settled vendor instead of showing a leftover", () => {
		useQueryMock.mockReturnValue([
			vendor({
				status: "pago",
				financials: {
					paidCents: 2_400_000,
					pendingCents: 0,
					scheduledCents: 2_400_000,
					remainingInstallments: 0,
					progress: 1,
				},
			}),
		]);
		render(<VendorsContent />);

		expect(screen.getByText("Tudo pago")).toBeInTheDocument();
		expect(screen.queryByText(/faltam/i)).not.toBeInTheDocument();
	});

	it("exposes the progress to assistive tech", () => {
		useQueryMock.mockReturnValue([vendor()]);
		render(<VendorsContent />);

		expect(screen.getByLabelText("30% pago")).toBeInTheDocument();
	});

	it("omits the strip for a vendor with no contracted value", () => {
		useQueryMock.mockReturnValue([
			vendor({
				status: "pesquisando",
				contractedCents: undefined,
				estimateCents: 500_000,
				financials: {
					paidCents: 0,
					pendingCents: 0,
					scheduledCents: 0,
					remainingInstallments: 0,
					progress: 0,
				},
			}),
		]);
		render(<VendorsContent />);

		expect(screen.queryByText(/% pago/)).not.toBeInTheDocument();
	});
});
