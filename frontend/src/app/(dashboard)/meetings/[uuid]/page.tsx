"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNavbar } from "@/components/TopNavbar";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { MeetingResultBadge, MeetingStatusBadge } from "@/components/MeetingStatusBadge";
import { MeetingNotes } from "@/components/MeetingNotes";
import { CustomerSummary } from "@/components/CustomerSummary";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useCancelMeeting,
  useDeleteMeeting,
  useMeeting,
  useRegenerateInvitation,
  useSaveMeetingNotes,
  useStartMeeting,
} from "@/hooks/useMeetings";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { Meeting } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function MeetingDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data: meeting, isLoading, isError, refetch } = useMeeting(uuid, {
    refetchInterval: 5000,
  });
  const startMeeting = useStartMeeting(uuid);
  const cancelMeeting = useCancelMeeting(uuid);
  const deleteMeeting = useDeleteMeeting(uuid);
  const saveNotes = useSaveMeetingNotes(uuid);
  const regenerateInvitation = useRegenerateInvitation(uuid);

  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = meeting && !["completed", "cancelled", "expired"].includes(meeting.status);
  // Active/waiting is a live call in progress — deleting the row out from
  // under it would orphan the LiveKit room/participants mid-session, so
  // that stays blocked. Every other status (including completed) is
  // deletable by admins.
  const canDelete = meeting && user?.role === "admin" && !["waiting", "active"].includes(meeting.status);

  return (
    <>
      <TopNavbar title="Detail Meeting" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {actionError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}

        {meeting && (
          <>
            <div className="rounded-lg border border-gray-border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono uppercase text-zinc-400">{meeting.meeting_code}</p>
                  <h2 className="text-lg font-semibold text-zinc-900">{meeting.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{formatDateTime(meeting.scheduled_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <MeetingStatusBadge status={meeting.status} />
                  <MeetingResultBadge result={meeting.result} />
                </div>
              </div>

              {meeting.description && <p className="mt-3 text-sm text-zinc-600">{meeting.description}</p>}

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-zinc-400">Mulai</dt>
                  <dd className="text-zinc-700">{formatDateTime(meeting.started_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Selesai</dt>
                  <dd className="text-zinc-700">{formatDateTime(meeting.ended_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Durasi</dt>
                  <dd className="text-zinc-700">{formatDuration(meeting.duration_seconds)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Rekaman</dt>
                  <dd className="text-zinc-700">
                    <RecordingStatusValue meeting={meeting} />
                  </dd>
                </div>
              </dl>

              {canManage && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-border pt-4">
                  {meeting.status === "scheduled" && (
                    <Link
                      href={`/meetings/${uuid}/edit`}
                      className="rounded-md border border-gray-border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-gray-light"
                    >
                      Edit Meeting
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setActionError(null);
                      regenerateInvitation.mutate(undefined, {
                        onSuccess: (data) => {
                          setInvitationUrl(data.invitation_url ?? null);
                          setLinkCopied(false);
                        },
                        onError: (err) => setActionError(getApiErrorMessage(err, "Gagal membuat tautan undangan.")),
                      });
                    }}
                    disabled={regenerateInvitation.isPending}
                    className="rounded-md border border-gray-border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-gray-light disabled:opacity-60"
                  >
                    {regenerateInvitation.isPending ? "Membuat Link..." : "Buat Link Undangan"}
                  </button>

                  {(meeting.status === "scheduled" || meeting.status === "waiting") && (
                    <button
                      onClick={() => {
                        setActionError(null);
                        startMeeting.mutate(undefined, {
                          onSuccess: () => router.push(`/meetings/${uuid}/room`),
                          onError: (err) => setActionError(getApiErrorMessage(err, "Gagal memulai meeting.")),
                        });
                      }}
                      disabled={startMeeting.isPending}
                      className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light disabled:opacity-60"
                    >
                      {startMeeting.isPending ? "Memulai..." : "Mulai Meeting"}
                    </button>
                  )}

                  {meeting.status === "active" && (
                    <button
                      onClick={() => router.push(`/meetings/${uuid}/room`)}
                      className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
                    >
                      Gabung Meeting
                    </button>
                  )}

                  {meeting.status !== "active" && (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Batalkan
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Hapus Meeting
                    </button>
                  )}
                </div>
              )}

              {!canManage && canDelete && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-gray-border pt-4">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Hapus Meeting
                  </button>
                </div>
              )}

              {invitationUrl && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-gray-light px-3 py-2 text-sm">
                  <span className="truncate font-mono text-zinc-600">{invitationUrl}</span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(invitationUrl);
                      setLinkCopied(true);
                    }}
                    className="rounded-md bg-charcoal px-3 py-1 text-xs font-medium text-white hover:bg-charcoal-light"
                  >
                    {linkCopied ? "Tersalin!" : "Salin Link"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MeetingNotes
                  meeting={meeting}
                  isSaving={saveNotes.isPending}
                  onSave={(values) => {
                    setActionError(null);
                    saveNotes.mutate(values, {
                      onError: (err) => setActionError(getApiErrorMessage(err, "Gagal menyimpan catatan.")),
                    });
                  }}
                />
              </div>
              <CustomerSummary meeting={meeting} />
            </div>

            {meeting.events && meeting.events.length > 0 && (
              <div className="rounded-lg border border-gray-border bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Riwayat Aktivitas</h3>
                <ul className="space-y-2 text-sm">
                  {meeting.events.map((event, idx) => (
                    <li key={idx} className="flex justify-between gap-4 border-b border-gray-border pb-2 last:border-0">
                      <span className="text-zinc-700">{event.description ?? event.event_type}</span>
                      <span className="whitespace-nowrap text-xs text-zinc-400">{formatDateTime(event.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmCancel}
        title="Batalkan Meeting?"
        description="Nasabah tidak akan dapat bergabung ke meeting ini setelah dibatalkan."
        confirmLabel="Ya, Batalkan"
        destructive
        isLoading={cancelMeeting.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          cancelMeeting.mutate(undefined, {
            onSuccess: () => setConfirmCancel(false),
            onError: (err) => {
              setActionError(getApiErrorMessage(err, "Gagal membatalkan meeting."));
              setConfirmCancel(false);
            },
          });
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus Meeting Ini?"
        description="Tindakan ini tidak dapat dibatalkan. Data hasil verifikasi dan rekaman (jika ada) akan ikut terhapus permanen."
        confirmLabel="Ya, Hapus"
        destructive
        isLoading={deleteMeeting.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteMeeting.mutate(undefined, {
            onSuccess: () => router.push("/meetings"),
            onError: (err) => {
              setActionError(getApiErrorMessage(err, "Gagal menghapus meeting."));
              setConfirmDelete(false);
            },
          });
        }}
      />
    </>
  );
}

const recordingStatusLabels: Record<Meeting["recording_status"], string> = {
  none: "Tidak direkam",
  recording: "Sedang merekam...",
  processing: "Sedang diproses...",
  ready: "Tersedia",
  failed: "Gagal diproses",
};

function RecordingStatusValue({ meeting }: { meeting: Meeting }) {
  if (meeting.recording_status === "ready" && meeting.recording_download_url) {
    return (
      <a
        href={meeting.recording_download_url}
        className="inline-flex items-center gap-1 font-medium text-gold hover:underline"
      >
        Unduh Rekaman
      </a>
    );
  }

  return <span className="text-zinc-500">{recordingStatusLabels[meeting.recording_status]}</span>;
}
