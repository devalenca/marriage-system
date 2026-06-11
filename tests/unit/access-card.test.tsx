import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const createMock = vi.fn();
const resetMock = vi.fn();
const removeMock = vi.fn();

vi.mock("convex/react", async () => {
	const { getFunctionName } = await import("convex/server");
	return {
		useQuery: (...args: unknown[]) => useQueryMock(...args),
		useAction: (ref: never) =>
			getFunctionName(ref) === "users:create" ? createMock : resetMock,
		useMutation: () => removeMock,
	};
});

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { getFunctionName } from "convex/server";
import { AccessCard } from "@/components/settings/access-card";

const ADMIN = { _id: "u1", email: "admin@example.com", isAdmin: true };
const MEMBER = { _id: "u2", email: "noiva@example.com", isAdmin: false };

function mockViewer(isAdmin: boolean) {
	useQueryMock.mockImplementation((ref: never) => {
		const name = getFunctionName(ref);
		if (name === "users:viewer") {
			return { email: ADMIN.email, isAdmin };
		}
		if (name === "users:list") {
			return isAdmin ? [ADMIN, MEMBER] : undefined;
		}
		return undefined;
	});
}

describe("AccessCard", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		createMock.mockReset();
		resetMock.mockReset();
		removeMock.mockReset();
	});

	it("renders nothing for a non-admin", () => {
		mockViewer(false);
		const { container } = render(<AccessCard />);
		expect(container).toBeEmptyDOMElement();
	});

	it("lists accesses for the admin", () => {
		mockViewer(true);
		render(<AccessCard />);
		expect(screen.getByText("admin@example.com")).toBeInTheDocument();
		expect(screen.getByText("noiva@example.com")).toBeInTheDocument();
		expect(screen.getByText(/administrador/i)).toBeInTheDocument();
	});

	it("creates a new access", async () => {
		mockViewer(true);
		createMock.mockResolvedValue(null);
		render(<AccessCard />);

		const user = userEvent.setup();
		await user.type(screen.getByLabelText(/e-mail/i), "novo@example.com");
		await user.type(screen.getByLabelText(/^senha$/i), "senha-forte-123");
		await user.click(screen.getByRole("button", { name: /criar acesso/i }));

		await waitFor(() =>
			expect(createMock).toHaveBeenCalledWith({
				email: "novo@example.com",
				password: "senha-forte-123",
			}),
		);
	});

	it("removes an access after confirmation", async () => {
		mockViewer(true);
		removeMock.mockResolvedValue(null);
		render(<AccessCard />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /remover/i }));
		await user.click(
			await screen.findByRole("button", { name: /sim, remover/i }),
		);

		await waitFor(() =>
			expect(removeMock).toHaveBeenCalledWith({ id: MEMBER._id }),
		);
	});
});
