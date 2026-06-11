import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();
const assignMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: vi.fn(), signOut: signOutMock }),
}));

import { SignOutButton } from "@/components/sign-out-button";

describe("SignOutButton", () => {
	beforeEach(() => {
		signOutMock.mockReset();
		assignMock.mockReset();
		// jsdom's location.assign is not implemented; a full-page navigation
		// is intentional here (crossing the auth boundary resets all state).
		Object.defineProperty(window, "location", {
			value: { ...window.location, assign: assignMock },
			writable: true,
		});
	});

	it("signs out and redirects to the login page", async () => {
		signOutMock.mockResolvedValue(undefined);
		render(<SignOutButton />);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: /sair/i }));

		await waitFor(() => expect(signOutMock).toHaveBeenCalledOnce());
		await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/login"));
	});
});
