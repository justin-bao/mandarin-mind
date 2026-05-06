import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/queryClient";
import AuthPage from "./AuthPage";

function renderAuthPage() {
  render(createElement(QueryClientProvider, { client: queryClient }, createElement(AuthPage)));
  return queryClient;
}

describe("AuthPage", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("logs in and populates the current-user query cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "user-1", email: "user@example.com", createdAt: null }),
      })
    );
    const queryClient = renderAuthPage();

    await userEvent.type(screen.getByTestId("input-login-email"), "user@example.com");
    await userEvent.type(screen.getByTestId("input-login-password"), "correct-password");
    await userEvent.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(queryClient.getQueryData(["/api/auth/me"])).toEqual({
        id: "user-1",
        email: "user@example.com",
        createdAt: null,
      });
    });
    expect(fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
  });

  it("shows a Google sign-in option", () => {
    renderAuthPage();

    expect(screen.getByTestId("button-google-login")).toHaveTextContent("Continue with Google");
  });

  it("prevents registration when password confirmation does not match", async () => {
    vi.stubGlobal("fetch", vi.fn());
    renderAuthPage();

    await userEvent.click(screen.getByRole("tab", { name: "Create Account" }));
    await userEvent.type(screen.getByTestId("input-register-email"), "user@example.com");
    await userEvent.type(screen.getByTestId("input-register-password"), "correct-password");
    await userEvent.type(screen.getByTestId("input-register-confirm"), "different-password");
    await userEvent.click(screen.getByTestId("button-register"));

    expect(fetch).not.toHaveBeenCalled();
  });
});
