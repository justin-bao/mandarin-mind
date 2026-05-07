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
  window.history.pushState({}, "", "/auth");
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(AuthPage)));
  return queryClient;
}

function renderLandingPage() {
  window.history.pushState({}, "", "/");
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(AuthPage)));
}

describe("AuthPage", () => {
  beforeEach(() => {
    queryClient.clear();
    window.history.pushState({}, "", "/");
    Object.values(supabaseAuthMock).forEach((mock) => mock.mockReset());
  });

  it("keeps sign-in controls off the landing page", () => {
    renderLandingPage();

    expect(screen.getByRole("heading", { name: "MandarinMind" })).toBeInTheDocument();
    expect(screen.queryByTestId("input-login-email")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Start practicing" })[0]).toHaveAttribute("href", "/auth");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth");
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
