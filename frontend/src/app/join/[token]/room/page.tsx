"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoRoom } from "@/components/VideoRoom";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { CUSTOMER_NAME_KEY, usePublicJoinToken, usePublicMeeting } from "@/hooks/usePublicJoin";

export default function CustomerRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  // No refetchInterval here: this page used to poll every 5s to detect a
  // cancelled/completed meeting, but each refetch re-rendered this page and
  // handed VideoRoom a brand-new inline onLeave/onError closure, which
  // re-triggered LiveKit's connect effect — reconnecting the call over and
  // over (looked like random disconnects + choppy video). Staff ending or
  // cancelling the meeting already closes the LiveKit room server-side,
  // which fires VideoRoom's onDisconnected for us — no polling needed while
  // actually in the call.
  const { data: meeting } = usePublicMeeting(token);
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

  const handleLeave = useCallback(() => {
    router.push(`/join/${token}/completed`);
  }, [router, token]);

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
        onLeave={handleLeave}
      />
    </div>
  );
}
