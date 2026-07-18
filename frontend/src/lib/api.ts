import axios, { AxiosError } from "axios";

export const API_ROOT = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
  },
});

export async function ensureCsrfCookie(): Promise<void> {
  await axios.get(`${API_ROOT}/sanctum/csrf-cookie`, { withCredentials: true });
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  error?: { code?: string; details?: unknown };
}

export function getApiErrorMessage(error: unknown, fallback = "Terjadi kesalahan. Silakan coba lagi."): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<ApiErrorBody>;
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<ApiErrorBody>;
    return err.response?.data?.error?.code;
  }
  return undefined;
}

export function getValidationErrors(error: unknown): Record<string, string[]> | undefined {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { errors?: Record<string, string[]> } | undefined)?.errors;
  }
  return undefined;
}
