import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it } from "vitest";

// The forecast columns used a native `title`, which the browser draws as its
// own grey box. They now carry a real tooltip.

import { BudgetOverviewCard } from "@/components/finance/budget-overview-card";

const finance = {
	goalCents: 8_000_000,
	plannedCents: 6_000_000,
	contractedCents: 6_330_000,
	paidCents: 2_065_000,
	pendingCents: 4_265_000,
	remainingCents: 1_670_000,
	percentConsumed: 0.79,
	remainingInstallments: 9,
	overdueCount: 0,
	dueSoonCount: 2,
};

// Convex brands its ids; the chart only reads amounts and dates.
const pending = [
	{
		_id: "p1",
		vendorId: "v1",
		vendorName: "Buffet Sabor",
		description: "Parcela 2/4",
		amountCents: 184_616,
		dueDate: "2026-08-10",
		status: "pendente" as const,
	},
] as unknown as React.ComponentProps<typeof BudgetOverviewCard>["pending"];

describe("BudgetOverviewCard forecast", () => {
	it("does not leave a native tooltip on the columns", () => {
		const { container } = render(
			<BudgetOverviewCard
				finance={finance}
				pending={pending}
				today="2026-08-01"
			/>,
		);

		expect(container.querySelectorAll("[title]")).toHaveLength(0);
	});

	it("keeps the chart described for assistive tech", () => {
		render(
			<BudgetOverviewCard
				finance={finance}
				pending={pending}
				today="2026-08-01"
			/>,
		);

		expect(
			screen.getByRole("img", { name: /previsão de pagamentos por mês/i }),
		).toBeInTheDocument();
	});
});
