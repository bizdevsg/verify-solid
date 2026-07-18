"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WaitingRoom } from "@/components/WaitingRoom";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { usePublicMeeting } from "@/hooks/usePublicJoin";

export default function WaitingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = usePublicMeeting(token, { refetchInterval: 3000 });

  useEffect(() => {
    if (data?.status === "active") {
      router.replace(`/join/${token}/room`);
    }
    if (data && !data.joinable && data.status !== "active") {
      router.replace(`/join/${token}`);
    }
  }, [data, router, token]);

  if (isLoading) return <LoadingState label="Memuat..." />;
  if (isError || !data) return <ErrorState message="Gagal memuat status meeting." />;

  return <WaitingRoom staffName={data.staff_name} meetingTitle={data.title} />;
}
