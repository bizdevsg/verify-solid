import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiSuccess } from "@/lib/api";
import { LiveKitJoinInfo, PublicMeetingSummary } from "@/lib/types";

export function usePublicMeeting(token: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["public-join", token],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<PublicMeetingSummary>>(`/public/join/${token}`);
      return data.data;
    },
    enabled: !!token,
    retry: false,
    refetchInterval: options?.refetchInterval,
  });
}

export function usePublicWaiting(token: string) {
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<ApiSuccess<PublicMeetingSummary>>(`/public/join/${token}/waiting`, { name });
      return data.data;
    },
  });
}

export function usePublicJoinToken(token: string) {
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<ApiSuccess<LiveKitJoinInfo>>(`/public/join/${token}/join-token`, { name });
      return data.data;
    },
  });
}

export const CUSTOMER_NAME_KEY = "solid-video-verification:customer-name";
