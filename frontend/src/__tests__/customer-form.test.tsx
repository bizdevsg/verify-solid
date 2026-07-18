import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerForm } from "@/components/CustomerForm";

describe("CustomerForm", () => {
  it("validates required fields before submitting", async () => {
    const onSubmit = vi.fn();
    render(<CustomerForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText(/nama lengkap wajib diisi/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normalized values", async () => {
    const onSubmit = vi.fn();
    render(<CustomerForm onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/nama lengkap/i), "Budi Santoso");
    await user.type(screen.getByLabelText(/nomor telepon/i), "081234567890");
    await user.type(screen.getByLabelText(/nomor identitas/i), "3271010101990001");
    await user.click(screen.getByRole("button", { name: /simpan/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Budi Santoso",
        phone: "081234567890",
        identity_number: "3271010101990001",
        email: null,
      })
    );
  });
});
