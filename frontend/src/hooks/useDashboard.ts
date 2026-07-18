import { useQuery } from "@tanstack/react-query";
import { api, ApiSuccess } from "@/lib/api";
import { DashboardData } from "@/lib/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<DashboardData>>("/dashboard");
      return data.data;
    },
  });
}
