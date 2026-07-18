"use client";

import { useState } from "react";
import Link from "next/link";
import { TopNavbar } from "@/components/TopNavbar";
import { MeetingTable } from "@/components/MeetingTable";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useMeetings } from "@/hooks/useMeetings";
import { MeetingStatus } from "@/lib/types";
import { statusLabels } from "@/lib/format";

const statusOptions: (MeetingStatus | "")[] = ["", "scheduled", "waiting", "active", "completed", "cancelled", "expired"];

export default function MeetingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MeetingStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useMeetings({ search, status, page });

  return (
    <>
      <TopNavbar title="Jadwal Verifikasi" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kode meeting atau nasabah..."
              className="w-64 rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as MeetingStatus | "");
                setPage(1);
              }}
              className="rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s ? statusLabels[s] : "Semua Status"}
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/meetings/create"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
          >
            Buat Meeting
          </Link>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {data && (
          <>
            <MeetingTable meetings={data.items} variant="recent" />
            {data.meta.last_page > 1 && (
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>
                  Halaman {data.meta.current_page} dari {data.meta.last_page} ({data.meta.total} meeting)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border border-gray-border px-3 py-1.5 disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page >= data.meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border border-gray-border px-3 py-1.5 disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
