"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoRoom } from "@/components/VideoRoom";
import { DeviceCheck } from "@/components/DeviceCheck";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useEndMeeting, useMeeting, useMeetingJoinToken } from "@/hooks/useMeetings";
import { MeetingResult } from "@/lib/types";
import { resultLabels } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";

const resultOptions: MeetingResult[] = ["verified", "not_verified", "follow_up"];

export default function StaffMeetingRoomPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router = useRouter();
  const { data: meeting, isLoading, isError } = useMeeting(uuid);
  const joinToken = useMeetingJoinToken(uuid);
  const endMeeting = useEndMeeting(uuid);

  const [deviceReady, setDeviceReady] = useState(false);
  const [positionConfirmed, setPositionConfirmed] = useState(false);
  const [enteredRoom, setEnteredRoom] = useState(false);
  const [showEndForm, setShowEndForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<MeetingResult>("verified");
  const [endError, setEndError] = useState<string | null>(null);

  useEffect(() => {
    if (meeting && !joinToken.data && !joinToken.isPending) {
      joinToken.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  const openEndForm = () => {
    setNotes(meeting?.staff_notes ?? "");
    setResult(meeting?.result && meeting.result !== "pending" ? meeting.result : "verified");
    setShowEndForm(true);
  };

  // Stable reference — an inline arrow here would change identity on every
  // re-render and needlessly re-trigger VideoRoom's connect effect.
  const handleLeave = useCallback(() => {
    router.push(`/meetings/${uuid}`);
  }, [router, uuid]);

  if (isLoading || joinToken.isPending || !joinToken.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-charcoal">
        <LoadingState label="Menyiapkan ruang meeting..." />
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="flex h-screen items-center justify-center bg-charcoal p-6">
        <ErrorState message="Gagal memuat data meeting." />
      </div>
    );
  }

  if (meeting.status === "completed" || meeting.status === "cancelled") {
    router.replace(`/meetings/${uuid}`);
    return null;
  }

  if (!enteredRoom) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-charcoal p-4">
        <div className="w-full max-w-lg space-y-4 rounded-xl border border-white/10 bg-charcoal-light p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Periksa Kamera &amp; Posisi Anda</h2>
            <p className="mt-1 text-sm text-white/60">
              Pastikan wajah Anda pas di dalam bingkai sebelum masuk ke ruang meeting.
            </p>
          </div>

          <DeviceCheck onReady={setDeviceReady} />

          {deviceReady && (
            <label className="flex items-start gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={positionConfirmed}
                onChange={(e) => setPositionConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-white/30"
              />
              <span className="text-white/80">
                Saya sudah memastikan wajah saya masuk ke dalam bingkai dan HP/kamera dipegang sejajar mata
              </span>
            </label>
          )}

          <button
            disabled={!deviceReady || !positionConfirmed}
            onClick={() => setEnteredRoom(true)}
            className="w-full rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light disabled:opacity-50"
          >
            Masuk ke Ruang Meeting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-charcoal">
      <VideoRoom
        appId={joinToken.data.app_id}
        channel={joinToken.data.channel}
        token={joinToken.data.token}
        uid={joinToken.data.uid}
        title={meeting.title}
        startedAt={meeting.started_at ? new Date(meeting.started_at) : null}
        onLeave={handleLeave}
        endAction={
          <button
            onClick={openEndForm}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
          >
            Selesaikan Meeting
          </button>
        }
      />

      {showEndForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5">
            <h3 className="text-base font-semibold text-zinc-900">Selesaikan Meeting</h3>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Hasil Verifikasi</span>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as MeetingResult)}
                className="w-full rounded-md border border-gray-border px-3 py-2 text-sm"
              >
                {resultOptions.map((r) => (
                  <option key={r} value={r}>
                    {resultLabels[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Catatan</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-border px-3 py-2 text-sm"
              />
            </label>
            {endError && <p className="text-sm text-red-600">{endError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEndForm(false)}
                disabled={endMeeting.isPending}
                className="rounded-md border border-gray-border px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setEndError(null);
                  endMeeting.mutate(
                    { staff_notes: notes, result },
                    {
                      onSuccess: () => router.push(`/meetings/${uuid}`),
                      onError: (err) => setEndError(getApiErrorMessage(err, "Gagal mengakhiri meeting.")),
                    }
                  );
                }}
                disabled={endMeeting.isPending}
                className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal"
              >
                {endMeeting.isPending ? "Memproses..." : "Akhiri Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
