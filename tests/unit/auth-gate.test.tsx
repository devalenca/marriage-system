import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const useConvexAuthMock = vi.fn();

vi.mock("convex/react", () => ({
	useConvexAuth: () => useConvexAuthMock(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

import { AuthGate } from "@/components/auth-gate";

describe("AuthGate", () => {
	beforeEach(() => {
		replaceMock.mockReset();
		useConvexAuthMock.mockReset();
	});

	it("renders children once authenticated", () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: false,
			isAuthenticated: true,
		});
		render(
			<AuthGate>
				<p>conteúdo protegido</p>
			</AuthGate>,
		);
		expect(screen.getByText("conteúdo protegido")).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it("shows a placeholder and does not redirect while loading", () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: true,
			isAuthenticated: false,
		});
		render(
			<AuthGate>
				<p>conteúdo protegido</p>
			</AuthGate>,
		);
		expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it("redirects to /login when unauthenticated", async () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: false,
			isAuthenticated: false,
		});
		render(
			<AuthGate>
				<p>conteúdo protegido</p>
			</AuthGate>,
		);
		expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
	});
});
