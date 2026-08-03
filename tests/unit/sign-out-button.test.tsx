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

	it("signs out and lands on the landing page, not on /login", async () => {
		signOutMock.mockResolvedValue(undefined);
		render(<SignOutButton />);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: /sair/i }));

		await waitFor(() => expect(signOutMock).toHaveBeenCalledOnce());
		await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/"));
		expect(assignMock).not.toHaveBeenCalledWith("/login");
	});

	it("hands the couple's accent back before leaving", async () => {
		// The landing wears the product's own palette; the accent of whoever was
		// signed in must not survive the trip out of the session.
		signOutMock.mockResolvedValue(undefined);
		document.documentElement.setAttribute("data-wedding-theme", "rose");
		render(<SignOutButton />);

		await userEvent
			.setup()
			.click(screen.getByRole("button", { name: /sair/i }));

		await waitFor(() =>
			expect(
				document.documentElement.getAttribute("data-wedding-theme"),
			).toBeNull(),
		);
	});

	it("stays put when signing out fails", async () => {
		signOutMock.mockRejectedValue(new Error("offline"));
		render(<SignOutButton />);

		const button = screen.getByRole("button", { name: /sair/i });
		await userEvent.setup().click(button);

		await waitFor(() => expect(signOutMock).toHaveBeenCalledOnce());
		expect(assignMock).not.toHaveBeenCalled();
		await waitFor(() => expect(button).not.toBeDisabled());
	});
});
