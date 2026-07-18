"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoRoom } from "@/components/VideoRoom";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { CUSTOMER_NAME_KEY, usePublicJoinToken, usePublicMeeting } from "@/hooks/usePublicJoin";

export default function CustomerRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: meeting } = usePublicMeeting(token, { refetchInterval: 5000 });
  const joinToken = usePublicJoinToken(token);
  const [name] = useState<string | null>(() => (typeof window === "undefined" ? null : sessionStorage.getItem(CUSTOMER_NAME_KEY)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      router.replace(`/join/${token}`);
    }
  }, [name, router, token]);

  useEffect(() => {
    if (name && !joinToken.data && !joinToken.isPending && !error) {
      joinToken.mutate(name, {
        onError: () => setError("Meeting belum dimulai atau tautan sudah tidak berlaku."),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    if (meeting && (meeting.status === "completed" || meeting.status === "cancelled")) {
      router.replace(`/join/${token}/completed`);
    }
  }, [meeting, router, token]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-charcoal p-6">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!joinToken.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-charcoal">
        <LoadingState label="Menghubungkan ke ruang meeting..." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-charcoal">
      <VideoRoom
        url={joinToken.data.url}
        token={joinToken.data.token}
        title={meeting?.title ?? "Verifikasi Video"}
        startedAt={null}
        onLeave={() => router.push(`/join/${token}/completed`)}
      />
    </div>
  );
}
