import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeetingNotes } from "@/components/MeetingNotes";
import { Meeting } from "@/lib/types";

const baseMeeting: Meeting = {
  uuid: "meeting-1",
  meeting_code: "SVV-ABC123",
  title: "Verifikasi Nasabah",
  description: null,
  customer: { uuid: "c1", full_name: "Nasabah Demo", phone: "081234567890" },
  staff: { uuid: "s1", name: "WPB Demo" },
  scheduled_at: "2026-01-01T00:00:00Z",
  started_at: null,
  ended_at: null,
  duration_seconds: null,
  status: "active",
  result: "pending",
  staff_notes: null,
  recording_status: "none",
  recording_url: null,
  invitation_expires_at: null,
};

describe("MeetingNotes", () => {
  it("saves the entered notes and selected result", async () => {
    const onSave = vi.fn();
    render(<MeetingNotes meeting={baseMeeting} onSave={onSave} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/catatan petugas/i), "Identitas sesuai KTP.");
    await user.selectOptions(screen.getByLabelText(/hasil verifikasi/i), "verified");
    await user.click(screen.getByRole("button", { name: /simpan catatan/i }));

    expect(onSave).toHaveBeenCalledWith({ staff_notes: "Identitas sesuai KTP.", result: "verified" });
  });

  it("pre-fills existing notes and result", () => {
    render(
      <MeetingNotes
        meeting={{ ...baseMeeting, staff_notes: "Catatan lama", result: "follow_up" }}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/catatan petugas/i)).toHaveValue("Catatan lama");
    expect(screen.getByLabelText(/hasil verifikasi/i)).toHaveValue("follow_up");
  });
});
