import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/queryClient";
import AuthPage from "./AuthPage";

const supabaseAuthMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: supabaseAuthMock },
}));

function renderAuthPage() {
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(AuthPage)));
  return queryClient;
}

describe("AuthPage", () => {
  beforeEach(() => {
    queryClient.clear();
    Object.values(supabaseAuthMock).forEach((mock) => mock.mockReset());
  });

  it("logs in with Supabase Auth and refreshes the current-user query", async () => {
    supabaseAuthMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      error: null,
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderAuthPage();

    await userEvent.type(screen.getByTestId("input-login-email"), "user@example.com");
    await userEvent.type(screen.getByTestId("input-login-password"), "correct-password");
    await userEvent.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(supabaseAuthMock.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "correct-password",
      });
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["/api/auth/me"] });
  });

  it("shows a Google sign-in option", () => {
    renderAuthPage();

    expect(screen.getByTestId("button-google-login")).toHaveTextContent("Continue with Google");
  });

  it("prevents registration when password confirmation does not match", async () => {
    renderAuthPage();

    await userEvent.click(screen.getByRole("tab", { name: "Create Account" }));
    await userEvent.type(screen.getByTestId("input-register-email"), "user@example.com");
    await userEvent.type(screen.getByTestId("input-register-password"), "correct-password");
    await userEvent.type(screen.getByTestId("input-register-confirm"), "different-password");
    await userEvent.click(screen.getByTestId("button-register"));

    expect(supabaseAuthMock.signUp).not.toHaveBeenCalled();
  });
});
