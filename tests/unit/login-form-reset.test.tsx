import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// "Esqueci minha senha" on the login page: request a code by email, then
// exchange code + new password for a session.

const signInMock = vi.fn();
const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: signInMock }),
}));

vi.mock("convex/react", () => ({
	useQuery: () => ({ needsBootstrap: false }),
	useAction: () => vi.fn(),
	useConvexAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

import { LoginForm } from "@/components/login-form";

describe("LoginForm password reset", () => {
	beforeEach(() => {
		signInMock.mockReset();
		signInMock.mockResolvedValue(undefined);
		pushMock.mockReset();
	});

	it("shows a forgot-password link on the sign-in form", () => {
		render(<LoginForm />);
		expect(
			screen.getByRole("button", { name: /esqueci minha senha/i }),
		).toBeInTheDocument();
	});

	it("requests a reset code for the typed e-mail", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);
		await user.click(
			screen.getByRole("button", { name: /esqueci minha senha/i }),
		);
		await user.type(screen.getByLabelText(/e-mail/i), "casal@example.com");
		await user.click(screen.getByRole("button", { name: /enviar código/i }));

		await waitFor(() => {
			expect(signInMock).toHaveBeenCalledWith("password", {
				email: "casal@example.com",
				flow: "reset",
			});
		});
		// Advances to the code + new password step.
		expect(screen.getByLabelText(/código/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
	});

	it("exchanges the code and new password, then goes to the app", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);
		await user.click(
			screen.getByRole("button", { name: /esqueci minha senha/i }),
		);
		await user.type(screen.getByLabelText(/e-mail/i), "casal@example.com");
		await user.click(screen.getByRole("button", { name: /enviar código/i }));
		await waitFor(() => expect(signInMock).toHaveBeenCalled());

		await user.type(screen.getByLabelText(/código/i), "12345678");
		await user.type(screen.getByLabelText(/nova senha/i), "senha-nova-123");
		await user.click(
			screen.getByRole("button", { name: /redefinir e entrar/i }),
		);

		await waitFor(() => {
			expect(signInMock).toHaveBeenLastCalledWith("password", {
				email: "casal@example.com",
				code: "12345678",
				newPassword: "senha-nova-123",
				flow: "reset-verification",
			});
		});
		expect(pushMock).toHaveBeenCalledWith("/dashboard");
	});

	it("shows an error for an invalid code without leaving the step", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);
		await user.click(
			screen.getByRole("button", { name: /esqueci minha senha/i }),
		);
		await user.type(screen.getByLabelText(/e-mail/i), "casal@example.com");
		await user.click(screen.getByRole("button", { name: /enviar código/i }));
		await waitFor(() => expect(signInMock).toHaveBeenCalled());

		signInMock.mockRejectedValueOnce(new Error("Invalid code"));
		await user.type(screen.getByLabelText(/código/i), "00000000");
		await user.type(screen.getByLabelText(/nova senha/i), "senha-nova-123");
		await user.click(
			screen.getByRole("button", { name: /redefinir e entrar/i }),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(/código/i);
		expect(screen.getByLabelText(/código/i)).toBeInTheDocument();
	});

	it("returns to the sign-in form from the reset flow", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);
		await user.click(
			screen.getByRole("button", { name: /esqueci minha senha/i }),
		);
		await user.click(screen.getByRole("button", { name: /voltar/i }));
		expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^entrar$/i }),
		).toBeInTheDocument();
	});
});
