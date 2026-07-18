import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { name: "Administrator", role: "admin" }, logout: vi.fn() }),
}));

vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      stats: {
        total_customers: 15,
        total_meetings: 9,
        meetings_today: 1,
        upcoming_meetings: 5,
        active_meetings: 0,
        completed_meetings: 1,
        cancelled_meetings: 1,
      },
      upcoming_meetings: [],
      recent_meetings: [],
    },
  }),
}));

import DashboardPage from "@/app/(dashboard)/dashboard/page";

describe("DashboardPage", () => {
  it("renders real stats from the dashboard query", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Total Nasabah")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Meeting Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("Sedang Berlangsung")).toBeInTheDocument();
  });
});
