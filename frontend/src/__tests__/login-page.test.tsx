import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();
const loginMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    login: loginMock,
    isLoggingIn: false,
  }),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    loginMock.mockClear();
  });

  it("shows validation errors when submitted empty", async () => {
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(await screen.findByText(/email wajib diisi/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("submits credentials and redirects to dashboard on success", async () => {
    loginMock.mockResolvedValueOnce(undefined);
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^email$/i), "admin@example.local");
    await user.type(screen.getByLabelText(/kata sandi/i), "password");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        expect.objectContaining({ email: "admin@example.local", password: "password" })
      );
    });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows an error message when login fails", async () => {
    loginMock.mockRejectedValueOnce(new Error("failed"));
    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^email$/i), "admin@example.local");
    await user.type(screen.getByLabelText(/kata sandi/i), "wrong");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(await screen.findByText(/email atau kata sandi salah/i)).toBeInTheDocument();
  });
});
