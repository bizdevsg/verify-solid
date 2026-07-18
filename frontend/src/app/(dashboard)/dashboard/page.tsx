"use client";

import Link from "next/link";
import { TopNavbar } from "@/components/TopNavbar";
import { StatCard } from "@/components/StatCard";
import { MeetingTable } from "@/components/MeetingTable";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <>
      <TopNavbar title="Dashboard" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">Ringkasan aktivitas verifikasi video.</p>
          <div className="flex gap-2">
            <Link
              href="/customers/create"
              className="rounded-md border border-gray-border bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-gray-light"
            >
              Buat Nasabah
            </Link>
            <Link
              href="/meetings/create"
              className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
            >
              Buat Meeting
            </Link>
          </div>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total Nasabah" value={data.stats.total_customers} accent />
              <StatCard label="Meeting Hari Ini" value={data.stats.meetings_today} />
              <StatCard label="Meeting Mendatang" value={data.stats.upcoming_meetings} />
              <StatCard label="Sedang Berlangsung" value={data.stats.active_meetings} />
              <StatCard label="Selesai" value={data.stats.completed_meetings} />
              <StatCard label="Dibatalkan" value={data.stats.cancelled_meetings} />
            </div>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Jadwal Verifikasi Mendatang
              </h2>
              <MeetingTable meetings={data.upcoming_meetings} variant="upcoming" />
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Riwayat Meeting</h2>
              <MeetingTable meetings={data.recent_meetings} variant="recent" />
            </section>
          </>
        )}
      </main>
    </>
  );
}
