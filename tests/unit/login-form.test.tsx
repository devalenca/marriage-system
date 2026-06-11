import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
const pushMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: signInMock, signOut: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import { LoginForm } from "@/components/login-form";

async function fillAndSubmit(email: string, password: string, button: RegExp) {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText(/e-mail/i), email);
	await user.type(screen.getByLabelText(/senha/i), password);
	await user.click(screen.getByRole("button", { name: button }));
	return user;
}

describe("LoginForm", () => {
	beforeEach(() => {
		signInMock.mockReset();
		pushMock.mockReset();
		useQueryMock.mockReset();
		useQueryMock.mockReturnValue({ needsBootstrap: false });
	});

	it("disables submission while the backend connection is pending", () => {
		useQueryMock.mockReturnValue(undefined);
		render(<LoginForm />);
		const button = screen.getByRole("button", { name: /conectando/i });
		expect(button).toBeDisabled();
	});

	it("offers no self sign-up", () => {
		render(<LoginForm />);
		expect(
			screen.queryByRole("button", { name: /criar conta/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/primeiro acesso/i)).not.toBeInTheDocument();
	});

	it("submits credentials with the sign-in flow and redirects", async () => {
		signInMock.mockResolvedValue({ signingIn: true });
		render(<LoginForm />);

		await fillAndSubmit("ana@example.com", "segredo123", /entrar/i);

		await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
		const [provider, formData] = signInMock.mock.calls[0] as [string, FormData];
		expect(provider).toBe("password");
		expect(formData.get("email")).toBe("ana@example.com");
		expect(formData.get("password")).toBe("segredo123");
		expect(formData.get("flow")).toBe("signIn");
		await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
	});

	it("becomes the admin bootstrap form when no account exists yet", async () => {
		useQueryMock.mockReturnValue({ needsBootstrap: true });
		signInMock.mockResolvedValue({ signingIn: true });
		render(<LoginForm />);

		expect(
			screen.getByText(/crie a conta do administrador/i),
		).toBeInTheDocument();

		await fillAndSubmit(
			"admin@example.com",
			"segredo123",
			/criar conta do administrador/i,
		);

		await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
		const [, formData] = signInMock.mock.calls[0] as [string, FormData];
		expect(formData.get("flow")).toBe("signUp");
	});

	it("shows a pt-BR error message when sign-in fails", async () => {
		signInMock.mockRejectedValue(new Error("InvalidSecret"));
		render(<LoginForm />);

		await fillAndSubmit("ana@example.com", "errada", /entrar/i);

		expect(
			await screen.findByText(/e-mail ou senha incorretos/i),
		).toBeInTheDocument();
		expect(pushMock).not.toHaveBeenCalled();
	});
});
