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
			getFunctionName(ref) === "access:createMember" ? createMock : resetMock,
		useMutation: () => removeMock,
	};
});

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { getFunctionName } from "convex/server";
import { AccessCard } from "@/components/settings/access-card";

const ADMIN = {
	userId: "u1",
	email: "admin@example.com",
	role: "admin",
	isSelf: true,
};
const MEMBER = {
	userId: "u2",
	email: "membro@example.com",
	role: "member",
	isSelf: false,
};

/** Mocks listMembers from the perspective of `viewerRole`. */
function mockMembers(viewerRole: "admin" | "member") {
	const admin = { ...ADMIN, isSelf: viewerRole === "admin" };
	const member = { ...MEMBER, isSelf: viewerRole === "member" };
	useQueryMock.mockImplementation((ref: never) =>
		getFunctionName(ref) === "access:listMembers" ? [admin, member] : undefined,
	);
}

describe("AccessCard", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		createMock.mockReset();
		resetMock.mockReset();
		removeMock.mockReset();
	});

	it("renders nothing while the member list is loading", () => {
		useQueryMock.mockReturnValue(undefined);
		const { container } = render(<AccessCard />);
		expect(container).toBeEmptyDOMElement();
	});

	it("lists members with role badges", () => {
		mockMembers("admin");
		render(<AccessCard />);
		expect(screen.getByText("admin@example.com")).toBeInTheDocument();
		expect(screen.getByText("membro@example.com")).toBeInTheDocument();
		expect(screen.getByText("Administrador")).toBeInTheDocument();
		expect(screen.getByText("Membro")).toBeInTheDocument();
	});

	it("hides management controls from a plain member", () => {
		mockMembers("member");
		render(<AccessCard />);
		expect(
			screen.queryByRole("button", { name: /criar acesso/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /remover/i }),
		).not.toBeInTheDocument();
	});

	it("lets the admin create a member", async () => {
		mockMembers("admin");
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

	it("removes a member after confirmation", async () => {
		mockMembers("admin");
		removeMock.mockResolvedValue(null);
		render(<AccessCard />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /remover/i }));
		await user.click(
			await screen.findByRole("button", { name: /sim, remover/i }),
		);

		await waitFor(() =>
			expect(removeMock).toHaveBeenCalledWith({ userId: MEMBER.userId }),
		);
	});
});
