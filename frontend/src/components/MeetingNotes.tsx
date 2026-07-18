"use client";

import { useState } from "react";
import { Meeting, MeetingResult } from "@/lib/types";
import { resultLabels } from "@/lib/format";

const resultOptions: MeetingResult[] = ["pending", "verified", "not_verified", "follow_up"];

export function MeetingNotes({
  meeting,
  onSave,
  isSaving,
}: {
  meeting: Meeting;
  onSave: (values: { staff_notes: string; result: MeetingResult }) => void;
  isSaving?: boolean;
}) {
  const [notes, setNotes] = useState(meeting.staff_notes ?? "");
  const [result, setResult] = useState<MeetingResult>(meeting.result);

  return (
    <div className="space-y-3 rounded-lg border border-gray-border bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Catatan Verifikasi</h3>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-700">Catatan Petugas</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Catatan verifikasi, respons nasabah, kendala yang ditemui..."
          className="w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-700">Hasil Verifikasi</span>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as MeetingResult)}
          className="w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        >
          {resultOptions.map((r) => (
            <option key={r} value={r}>
              {resultLabels[r]}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => onSave({ staff_notes: notes, result })}
        disabled={isSaving}
        className="rounded-md bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-charcoal-light disabled:opacity-60"
      >
        {isSaving ? "Menyimpan..." : "Simpan Catatan"}
      </button>
    </div>
  );
}
