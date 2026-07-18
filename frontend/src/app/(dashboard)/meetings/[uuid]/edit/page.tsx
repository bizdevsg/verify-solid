"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNavbar } from "@/components/TopNavbar";
import { MeetingForm } from "@/components/MeetingForm";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useMeeting, useUpdateMeeting } from "@/hooks/useMeetings";
import { getApiErrorMessage } from "@/lib/api";

export default function EditMeetingPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router = useRouter();
  const { data: meeting, isLoading, isError, refetch } = useMeeting(uuid);
  const updateMeeting = useUpdateMeeting(uuid);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <TopNavbar title="Edit Meeting" />
      <main className="flex-1 space-y-4 p-4 md:max-w-2xl md:p-6">
        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {meeting && meeting.status !== "scheduled" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Hanya meeting berstatus terjadwal yang dapat diubah.
          </p>
        )}

        {meeting && (
          <MeetingForm
            defaultValues={meeting}
            isSubmitting={updateMeeting.isPending}
            submitLabel="Simpan Perubahan"
            onSubmit={(values) => {
              setError(null);
              updateMeeting.mutate(values, {
                onSuccess: () => router.push(`/meetings/${uuid}`),
                onError: (err) => setError(getApiErrorMessage(err, "Gagal memperbarui meeting.")),
              });
            }}
          />
        )}
      </main>
    </>
  );
}
