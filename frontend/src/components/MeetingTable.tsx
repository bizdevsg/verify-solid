"use client";

import Link from "next/link";
import { Meeting } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { MeetingResultBadge, MeetingStatusBadge } from "@/components/MeetingStatusBadge";
import { EmptyState } from "@/components/EmptyState";

export function MeetingTable({
  meetings,
  variant = "recent",
}: {
  meetings: Meeting[];
  variant?: "recent" | "upcoming";
}) {
  if (meetings.length === 0) {
    return <EmptyState title="Belum ada meeting" description="Meeting yang dibuat akan muncul di sini." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gray-border bg-gray-light text-xs uppercase text-zinc-500">
          <tr>
            {variant === "recent" ? (
              <>
                <th className="px-4 py-3">Kode Meeting</th>
                <th className="px-4 py-3">Nasabah</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Durasi</th>
                <th className="px-4 py-3">Hasil</th>
                <th className="px-4 py-3">Status</th>
              </>
            ) : (
              <>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Nasabah</th>
                <th className="px-4 py-3">Petugas</th>
                <th className="px-4 py-3">Status</th>
              </>
            )}
            <th className="px-4 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-border">
          {meetings.map((meeting) => (
            <tr key={meeting.uuid} className="hover:bg-gray-light/60">
              {variant === "recent" ? (
                <>
                  <td className="px-4 py-3 font-medium text-zinc-800">{meeting.meeting_code}</td>
                  <td className="px-4 py-3">{meeting.customer.full_name}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDateTime(meeting.scheduled_at)}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDuration(meeting.duration_seconds)}</td>
                  <td className="px-4 py-3">
                    <MeetingResultBadge result={meeting.result} />
                  </td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={meeting.status} />
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 text-zinc-700">{formatDateTime(meeting.scheduled_at)}</td>
                  <td className="px-4 py-3">{meeting.customer.full_name}</td>
                  <td className="px-4 py-3 text-zinc-500">{meeting.staff.name}</td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={meeting.status} />
                  </td>
                </>
              )}
              <td className="px-4 py-3 text-right">
                <Link href={`/meetings/${meeting.uuid}`} className="text-sm font-medium text-gold hover:underline">
                  Lihat Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
