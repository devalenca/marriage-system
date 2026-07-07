import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
	useMutation: () => mutationMock,
}));

import { DashboardContent } from "@/components/dashboard/dashboard-content";

const EMPTY_FINANCE = {
	goalCents: 0,
	plannedCents: 0,
	contractedCents: 0,
	paidCents: 0,
	pendingCents: 0,
	remainingCents: 0,
	percentConsumed: 0,
	remainingInstallments: 0,
	overdueCount: 0,
	dueSoonCount: 0,
};

function makeSummary(overrides: Record<string, unknown> = {}) {
	return {
		settings: {
			_id: "settings1",
			_creationTime: 0,
			coupleNames: "Gabriel & Alice",
			weddingDate: "2027-06-12",
			budgetGoalCents: 5500000,
		},
		countdownDays: 368,
		finance: {
			...EMPTY_FINANCE,
			goalCents: 5500000,
			plannedCents: 2600000,
			contractedCents: 1800000,
			paidCents: 600000,
			pendingCents: 1200000,
			remainingCents: 3700000,
			percentConsumed: 1800000 / 5500000,
			remainingInstallments: 2,
		},
		categories: [
			{
				category: "espaco",
				plannedCents: 1800000,
				contractedCents: 1800000,
				paidCents: 600000,
				vendorCount: 1,
			},
		],
		overdue: [
			{
				_id: "p1",
				_creationTime: 0,
				vendorId: "v1",
				vendorName: "Espaço Jardim",
				description: "Entrada",
				amountCents: 600000,
				dueDate: "2026-05-01",
				status: "pendente",
			},
		],
		dueSoon: [],
		monthTasks: [
			{
				_id: "t1",
				_creationTime: 0,
				title: "Tarefa deste mês",
				dueDate: "2026-06-20",
				priority: "alta",
				status: "pendente",
				isGenerated: false,
			},
		],
		...overrides,
	};
}

// Intl pt-BR uses a non-breaking space between "R$" and the number.
const NBSP = " ";

describe("DashboardContent", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		mutationMock.mockReset();
	});

	it("shows a loading skeleton while the query resolves", () => {
		useQueryMock.mockReturnValue(undefined);
		const { container } = render(<DashboardContent />);
		expect(container.querySelector("[aria-busy]")).toBeInTheDocument();
	});

	it("shows onboarding when settings are missing", () => {
		useQueryMock.mockReturnValue(
			makeSummary({ settings: null, countdownDays: null }),
		);
		render(<DashboardContent />);
		expect(screen.getByText("Vamos nos casar!")).toBeInTheDocument();
	});

	it("renders countdown, budget KPIs, alerts and month tasks", () => {
		useQueryMock.mockReturnValueOnce(makeSummary()).mockReturnValueOnce([]);
		render(<DashboardContent />);

		// countdown
		expect(screen.getByText("368")).toBeInTheDocument();
		expect(screen.getByText("Gabriel & Alice")).toBeInTheDocument();

		// budget overview card (paid / contracted bar + forecast)
		expect(screen.getByText("Orçamento")).toBeInTheDocument();
		expect(screen.getByText("33% comprometido")).toBeInTheDocument();
		expect(screen.getByText(`Pago R$${NBSP}6.000,00`)).toBeInTheDocument();
		expect(screen.getByText(`Fechado R$${NBSP}18.000,00`)).toBeInTheDocument();
		expect(screen.getByText("Previsão dos próximos meses")).toBeInTheDocument();

		// overdue alert with quick pay action
		expect(screen.getByText("Pagamentos atrasados")).toBeInTheDocument();
		expect(screen.getByText("Espaço Jardim")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();

		// month tasks
		expect(screen.getByText("Tarefa deste mês")).toBeInTheDocument();
	});
});
