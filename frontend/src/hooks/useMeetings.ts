import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiSuccess } from "@/lib/api";
import { LiveKitJoinInfo, Meeting, MeetingResult, MeetingStatus, PaginatedResult } from "@/lib/types";

export interface MeetingInput {
  customer_uuid: string;
  staff_uuid?: string | null;
  title: string;
  description?: string | null;
  scheduled_at: string;
}

export function useMeetings(params: { search?: string; status?: MeetingStatus | ""; page?: number }) {
  return useQuery({
    queryKey: ["meetings", params],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<PaginatedResult<Meeting>>>("/meetings", {
        params: { search: params.search || undefined, status: params.status || undefined, page: params.page },
      });
      return data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useMeeting(uuid: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["meetings", uuid],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Meeting>>(`/meetings/${uuid}`);
      return data.data;
    },
    enabled: !!uuid,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MeetingInput) => {
      const { data } = await api.post<ApiSuccess<Meeting>>("/meetings", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateMeeting(uuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MeetingInput>) => {
      const { data } = await api.patch<ApiSuccess<Meeting>>(`/meetings/${uuid}`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

function useMeetingAction(uuid: string, action: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: Record<string, unknown>) => {
      const { data } = await api.post<ApiSuccess<Meeting>>(`/meetings/${uuid}/${action}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export const useStartMeeting = (uuid: string) => useMeetingAction(uuid, "start");
export const useCancelMeeting = (uuid: string) => useMeetingAction(uuid, "cancel");
export const useEndMeeting = (uuid: string) => useMeetingAction(uuid, "end");
export const useSaveMeetingNotes = (uuid: string) => useMeetingAction(uuid, "notes");
export const useRegenerateInvitation = (uuid: string) => useMeetingAction(uuid, "regenerate-invitation");

export function useMeetingJoinToken(uuid: string) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiSuccess<LiveKitJoinInfo>>(`/meetings/${uuid}/join-token`);
      return data.data;
    },
  });
}

export interface MeetingNotesInput {
  staff_notes?: string | null;
  result: MeetingResult;
}
