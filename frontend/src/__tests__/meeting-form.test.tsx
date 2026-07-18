import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { role: "staff", uuid: "staff-uuid" } }),
}));

vi.mock("@/hooks/useCustomers", () => ({
  useCustomers: () => ({
    data: {
      items: [{ uuid: "cust-1", full_name: "Nasabah Demo", phone: "081234567890" }],
    },
  }),
}));

vi.mock("@/hooks/useUsers", () => ({
  useUsersList: () => ({ data: [] }),
}));

import { MeetingForm } from "@/components/MeetingForm";

describe("MeetingForm", () => {
  it("requires a customer and title before submitting", async () => {
    const onSubmit = vi.fn();
    render(<MeetingForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText(/pilih nasabah/i, { selector: "span" })).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not show a staff selector for non-admin users", () => {
    render(<MeetingForm onSubmit={vi.fn()} />);
    expect(screen.queryByText(/petugas/i)).not.toBeInTheDocument();
  });

  it("submits the selected customer and title", async () => {
    const onSubmit = vi.fn();
    render(<MeetingForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/nasabah/i), "cust-1");
    await user.type(screen.getByLabelText(/judul meeting/i), "Verifikasi Rekening");
    await user.type(screen.getByLabelText(/jadwal/i), "2030-01-01T10:00");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ customer_uuid: "cust-1", title: "Verifikasi Rekening" })
    );
  });
});
