import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();
const useQueryMock = vi.fn();
const seedMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({ signIn: signInMock, signOut: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const useConvexAuthMock = vi.fn();

vi.mock("convex/react", () => ({
	useQuery: (...args: unknown[]) => useQueryMock(...args),
	useAction: () => seedMock,
	useConvexAuth: () => useConvexAuthMock(),
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
		replaceMock.mockReset();
		useQueryMock.mockReset();
		seedMock.mockReset();
		seedMock.mockResolvedValue(null);
		useConvexAuthMock.mockReset();
		useConvexAuthMock.mockReturnValue({
			isLoading: false,
			isAuthenticated: false,
		});
		useQueryMock.mockReturnValue({ needsBootstrap: false });
	});

	it("redirects to the dashboard when already authenticated", async () => {
		useConvexAuthMock.mockReturnValue({
			isLoading: false,
			isAuthenticated: true,
		});
		render(<LoginForm />);
		await waitFor(() =>
			expect(pushMock.mock.calls.concat(replaceMock.mock.calls)).toContainEqual(
				["/dashboard"],
			),
		);
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

	it("seeds the env-configured admin while no account exists", async () => {
		useQueryMock.mockReturnValue({ needsBootstrap: true });
		render(<LoginForm />);

		await waitFor(() => expect(seedMock).toHaveBeenCalledOnce());
		expect(screen.getByRole("button", { name: /preparando/i })).toBeDisabled();
	});

	it("does not seed when accounts already exist", () => {
		render(<LoginForm />);
		expect(seedMock).not.toHaveBeenCalled();
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
