import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: vi.fn(), signOut: signOutMock }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

import { SignOutButton } from "@/components/sign-out-button";

describe("SignOutButton", () => {
	beforeEach(() => {
		signOutMock.mockReset();
		pushMock.mockReset();
	});

	it("signs out and redirects to the login page", async () => {
		signOutMock.mockResolvedValue(undefined);
		render(<SignOutButton />);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: /sair/i }));

		await waitFor(() => expect(signOutMock).toHaveBeenCalledOnce());
		await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
	});
});
