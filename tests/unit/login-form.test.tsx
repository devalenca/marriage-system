import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: signInMock, signOut: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

import { LoginForm } from "@/components/login-form";

async function fillAndSubmit(email: string, password: string) {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText(/e-mail/i), email);
	await user.type(screen.getByLabelText(/senha/i), password);
	await user.click(screen.getByRole("button", { name: /entrar/i }));
	return user;
}

describe("LoginForm", () => {
	beforeEach(() => {
		signInMock.mockReset();
		pushMock.mockReset();
	});

	it("submits credentials with the sign-in flow and redirects", async () => {
		signInMock.mockResolvedValue({ signingIn: true });
		render(<LoginForm />);

		await fillAndSubmit("ana@example.com", "segredo123");

		await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
		const [provider, formData] = signInMock.mock.calls[0] as [string, FormData];
		expect(provider).toBe("password");
		expect(formData.get("email")).toBe("ana@example.com");
		expect(formData.get("password")).toBe("segredo123");
		expect(formData.get("flow")).toBe("signIn");
		await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
	});

	it("switches to the first-access flow to create the account", async () => {
		signInMock.mockResolvedValue({ signingIn: true });
		render(<LoginForm />);

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /primeiro acesso/i }));
		await user.type(screen.getByLabelText(/e-mail/i), "ana@example.com");
		await user.type(screen.getByLabelText(/senha/i), "segredo123");
		await user.click(screen.getByRole("button", { name: /criar conta/i }));

		await waitFor(() => expect(signInMock).toHaveBeenCalledOnce());
		const [, formData] = signInMock.mock.calls[0] as [string, FormData];
		expect(formData.get("flow")).toBe("signUp");
	});

	it("shows a pt-BR error message when sign-in fails", async () => {
		signInMock.mockRejectedValue(new Error("InvalidSecret"));
		render(<LoginForm />);

		await fillAndSubmit("ana@example.com", "errada");

		expect(
			await screen.findByText(/e-mail ou senha incorretos/i),
		).toBeInTheDocument();
		expect(pushMock).not.toHaveBeenCalled();
	});
});
