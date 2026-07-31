import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// "Minha conta" settings card: change own password (stays signed in via a
// silent re-login) and change own e-mail with a code sent to the new address.

const useQueryMock = vi.fn();
const changePasswordMock = vi.fn();
const requestEmailChangeMock = vi.fn();
const confirmEmailChangeMock = vi.fn();
const signInMock = vi.fn();

vi.mock("convex/react", async () => {
	const { getFunctionName } = await import("convex/server");
	return {
		useQuery: (...args: unknown[]) => useQueryMock(...args),
		useAction: (ref: never) => {
			const name = getFunctionName(ref);
			if (name === "account:changePassword") return changePasswordMock;
			if (name === "account:requestEmailChange") return requestEmailChangeMock;
			return confirmEmailChangeMock;
		},
	};
});

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: signInMock }),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

import { AccountCard } from "@/components/settings/account-card";

describe("AccountCard", () => {
	beforeEach(() => {
		useQueryMock.mockReset();
		useQueryMock.mockReturnValue({
			email: "ana@example.com",
			isSuperadmin: false,
		});
		for (const mock of [
			changePasswordMock,
			requestEmailChangeMock,
			confirmEmailChangeMock,
			signInMock,
		]) {
			mock.mockReset();
			mock.mockResolvedValue(undefined);
		}
	});

	it("shows the current e-mail", () => {
		render(<AccountCard />);
		expect(screen.getByText("ana@example.com")).toBeInTheDocument();
	});

	it("changes the password and silently signs back in", async () => {
		const user = userEvent.setup();
		render(<AccountCard />);
		await user.type(screen.getByLabelText(/senha atual/i), "senha-atual-123");
		await user.type(screen.getByLabelText(/nova senha/i), "senha-nova-456");
		await user.click(screen.getByRole("button", { name: /alterar senha/i }));

		await waitFor(() => {
			expect(changePasswordMock).toHaveBeenCalledWith({
				currentPassword: "senha-atual-123",
				newPassword: "senha-nova-456",
			});
		});
		expect(signInMock).toHaveBeenCalledWith("password", {
			email: "ana@example.com",
			password: "senha-nova-456",
			flow: "signIn",
		});
	});

	it("requests an e-mail change code and confirms it", async () => {
		const user = userEvent.setup();
		render(<AccountCard />);
		await user.type(
			screen.getByLabelText(/novo e-mail/i),
			"ana.nova@example.com",
		);
		await user.type(
			screen.getByLabelText(/confirme sua senha/i),
			"senha-atual-123",
		);
		await user.click(screen.getByRole("button", { name: /enviar código/i }));

		await waitFor(() => {
			expect(requestEmailChangeMock).toHaveBeenCalledWith({
				newEmail: "ana.nova@example.com",
				password: "senha-atual-123",
			});
		});

		await user.type(screen.getByLabelText(/código/i), "12345678");
		await user.click(screen.getByRole("button", { name: /confirmar troca/i }));
		await waitFor(() => {
			expect(confirmEmailChangeMock).toHaveBeenCalledWith({
				code: "12345678",
			});
		});
	});

	it("hides the e-mail form for the superadmin", () => {
		useQueryMock.mockReturnValue({
			email: "super@example.com",
			isSuperadmin: true,
		});
		render(<AccountCard />);
		expect(screen.queryByLabelText(/novo e-mail/i)).not.toBeInTheDocument();
		expect(screen.getByText(/configuração do sistema/i)).toBeInTheDocument();
	});
});
