import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaitingRoom } from "@/components/WaitingRoom";

describe("WaitingRoom", () => {
  it("shows the assigned staff name and meeting title", () => {
    render(<WaitingRoom staffName="WPB Demo" meetingTitle="Verifikasi Pembukaan Rekening" />);

    expect(screen.getByText(/menunggu petugas/i)).toBeInTheDocument();
    expect(screen.getByText(/wpb demo/i)).toBeInTheDocument();
    expect(screen.getByText(/verifikasi pembukaan rekening/i)).toBeInTheDocument();
  });
});
