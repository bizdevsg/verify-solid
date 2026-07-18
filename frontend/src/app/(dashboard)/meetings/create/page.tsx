"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopNavbar } from "@/components/TopNavbar";
import { MeetingForm } from "@/components/MeetingForm";
import { useCreateMeeting } from "@/hooks/useMeetings";
import { getApiErrorMessage } from "@/lib/api";

export default function CreateMeetingPage() {
  const router = useRouter();
  const createMeeting = useCreateMeeting();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <TopNavbar title="Buat Meeting" />
      <main className="flex-1 space-y-4 p-4 md:max-w-2xl md:p-6">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <MeetingForm
          isSubmitting={createMeeting.isPending}
          submitLabel="Buat Meeting"
          onSubmit={(values) => {
            setError(null);
            createMeeting.mutate(values, {
              onSuccess: (meeting) => router.push(`/meetings/${meeting.uuid}`),
              onError: (err) => setError(getApiErrorMessage(err, "Gagal membuat meeting.")),
            });
          }}
        />
      </main>
    </>
  );
}
