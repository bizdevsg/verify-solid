import { MeetingResult, MeetingStatus } from "./types";

export const statusLabels: Record<MeetingStatus, string> = {
  scheduled: "Terjadwal",
  waiting: "Menunggu",
  active: "Sedang Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export const resultLabels: Record<MeetingResult, string> = {
  pending: "Menunggu Hasil",
  verified: "Terverifikasi",
  not_verified: "Tidak Terverifikasi",
  follow_up: "Perlu Tindak Lanjut",
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds && seconds !== 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
