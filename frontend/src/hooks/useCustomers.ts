import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiSuccess } from "@/lib/api";
import { Customer, PaginatedResult } from "@/lib/types";

export interface CustomerInput {
  full_name: string;
  email?: string | null;
  phone: string;
  identity_number: string;
  address?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
}

export function useCustomers(params: { search?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<PaginatedResult<Customer>>>("/customers", {
        params: { search: params.search || undefined, page: params.page, per_page: params.per_page },
      });
      return data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(uuid: string) {
  return useQuery({
    queryKey: ["customers", uuid],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Customer>>(`/customers/${uuid}`);
      return data.data;
    },
    enabled: !!uuid,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data } = await api.post<ApiSuccess<Customer>>("/customers", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer(uuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CustomerInput>) => {
      const { data } = await api.patch<ApiSuccess<Customer>>(`/customers/${uuid}`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/customers/${uuid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
