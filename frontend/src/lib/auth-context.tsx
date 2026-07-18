"use client";

import { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiSuccess, ensureCsrfCookie, getApiErrorMessage } from "./api";
import { AppUser } from "./types";

interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

interface AuthContextValue {
  user: AppUser | null | undefined;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = pathname?.startsWith("/join");

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<AppUser>>("/auth/me");
      return data.data;
    },
    retry: false,
    staleTime: 60_000,
    enabled: !isPublicRoute,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      await ensureCsrfCookie();
      const { data } = await api.post<ApiSuccess<AppUser>>("/auth/login", input);
      return data.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      router.replace("/login");
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.isError ? null : meQuery.data,
      isLoading: meQuery.isLoading,
      login: async (input) => {
        await loginMutation.mutateAsync(input);
      },
      loginError: loginMutation.error ? getApiErrorMessage(loginMutation.error, "Email atau kata sandi salah.") : null,
      isLoggingIn: loginMutation.isPending,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meQuery.data, meQuery.isLoading, meQuery.isError, loginMutation.isPending, loginMutation.error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
