import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiSuccess } from "@/lib/api";
import { AppUser, PaginatedResult, UserRole } from "@/lib/types";

export function useUsersList(enabled: boolean) {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<PaginatedResult<AppUser>>>("/users", {
        params: { per_page: 100 },
      });
      return data.data.items;
    },
    enabled,
  });
}

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  is_active?: boolean;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserInput) => {
      const { data } = await api.post<ApiSuccess<AppUser>>("/users", input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(uuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<UserInput>) => {
      const { data } = await api.patch<ApiSuccess<AppUser>>(`/users/${uuid}`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
