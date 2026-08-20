import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
	useMutation: () => mutationMock,
}));

// The task dialog drags in the whole form stack; the list is what is under test.
vi.mock("@/components/checklist/task-dialog", () => ({
	TaskDialog: () => null,
}));

import { ChecklistContent } from "@/components/checklist/checklist-content";

function makeTask(overrides: Record<string, unknown> = {}) {
	return {
		_id: "t1",
		_creationTime: 0,
		title: "Provar o vestido",
		dueDate: "2026-06-20",
		priority: "media",
		status: "pendente",
		isGenerated: false,
		...overrides,
	};
}

/** Alpha of the `bg-card/NN` utility on an element, as a 0–1 number. */
function cardBackgroundAlpha(element: HTMLElement): number {
	const match = element.className.match(/(?:^|\s)bg-card(?:\/(\d+))?(?:\s|$)/);
	if (!match) return 0;
	return match[1] === undefined ? 1 : Number(match[1]) / 100;
}

describe("ChecklistContent month groups", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		mutationMock.mockReset();
	});

	it("shows a loading skeleton while the tasks query resolves", () => {
		useQueryMock.mockReturnValue(undefined);
		const { container } = render(<ChecklistContent />);
		expect(container.querySelector("[aria-busy]")).toBeInTheDocument();
	});

	it("labels every month group, including the tasks without a due date", () => {
		useQueryMock
			.mockReturnValueOnce([
				makeTask({ _id: "t1", dueDate: "2026-06-20" }),
				makeTask({ _id: "t2", dueDate: "2026-06-28", title: "Fechar buffet" }),
				makeTask({
					_id: "t3",
					dueDate: "2026-07-05",
					title: "Enviar convites",
				}),
				makeTask({ _id: "t4", dueDate: undefined, title: "Escolher música" }),
			])
			.mockReturnValueOnce([]);

		render(<ChecklistContent />);

		expect(
			screen.getByRole("heading", { name: "junho de 2026" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "julho de 2026" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Sem prazo" }),
		).toBeInTheDocument();
	});

	it("groups each task under its own month label", () => {
		useQueryMock
			.mockReturnValueOnce([
				makeTask({ _id: "t1", dueDate: "2026-06-20" }),
				makeTask({
					_id: "t3",
					dueDate: "2026-07-05",
					title: "Enviar convites",
				}),
			])
			.mockReturnValueOnce([]);

		const { container } = render(<ChecklistContent />);

		const sections = container.querySelectorAll("section");
		expect(sections).toHaveLength(2);

		const [june, july] = [...sections];
		if (!june || !july) throw new Error("expected one section per month");
		expect(within(june).getByText("junho de 2026")).toBeInTheDocument();
		expect(within(june).getByText("Provar o vestido")).toBeInTheDocument();
		expect(within(july).getByText("julho de 2026")).toBeInTheDocument();
		expect(within(july).getByText("Enviar convites")).toBeInTheDocument();
	});

	/* Those labels sit on the field photograph: the same six of them measured
	   from 1.92:1 to 15.28:1 depending only on what part of the image they
	   landed on. What is asserted is the threshold the detector uses — an
	   opaque-enough surface — never a particular colour value. */
	it("gives each month label a surface the photograph cannot reach through", () => {
		useQueryMock
			.mockReturnValueOnce([makeTask({ dueDate: "2026-06-20" })])
			.mockReturnValueOnce([]);

		render(<ChecklistContent />);

		const label = screen.getByRole("heading", { name: "junho de 2026" });
		expect(cardBackgroundAlpha(label)).toBeGreaterThanOrEqual(0.85);
		// Width of the content, left-aligned with the cards below it.
		expect(label.className).toContain("w-fit");
	});

	it("renders the empty state when there is no task at all", () => {
		useQueryMock.mockReturnValueOnce([]).mockReturnValueOnce([]);
		render(<ChecklistContent />);
		expect(screen.getByText(/Nenhuma tarefa por aqui/)).toBeInTheDocument();
	});
});
