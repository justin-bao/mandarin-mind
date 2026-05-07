import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MobileAppHeader } from "@/App";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

describe("AppSidebar mobile navigation", () => {
  it("opens the side navigation from the signed-in mobile hamburger", async () => {
    const onTabChange = vi.fn();

    render(
      createElement(
        SidebarProvider,
        undefined,
        createElement(MobileAppHeader),
        createElement(AppSidebar, { activeTab: "conversation", onTabChange }),
      ),
    );

    await userEvent.click(screen.getByTestId("button-mobile-menu"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-tab-practice")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("sidebar-tab-practice"));

    expect(onTabChange).toHaveBeenCalledWith("practice");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
