"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { usePublicMeeting, CUSTOMER_NAME_KEY } from "@/hooks/usePublicJoin";
import { formatDateTime } from "@/lib/format";

export default function JoinInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = usePublicMeeting(token);
  const [name, setName] = useState("");

  if (isLoading) return <LoadingState label="Memuat undangan..." />;
  if (isError || !data) {
    return <ErrorState message="Tautan undangan tidak valid atau sudah tidak berlaku." />;
  }

  if (!data.joinable) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-zinc-900">Meeting Tidak Tersedia</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Tautan undangan ini sudah kedaluwarsa atau meeting telah dibatalkan/selesai. Silakan hubungi petugas Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{data.title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{formatDateTime(data.scheduled_at)}</p>
        {data.description && <p className="mt-2 text-sm text-zinc-600">{data.description}</p>}
      </div>

      <dl className="space-y-1 rounded-md bg-gray-light p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Petugas</dt>
          <dd className="font-medium text-zinc-800">{data.staff_name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Nasabah</dt>
          <dd className="font-medium text-zinc-800">{data.customer_name_hint}</dd>
        </div>
      </dl>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          sessionStorage.setItem(CUSTOMER_NAME_KEY, name.trim());
          router.push(`/join/${token}/device-check`);
        }}
        className="space-y-3"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Konfirmasi Nama Anda</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap sesuai identitas"
            required
            className="w-full rounded-md border border-gray-border px-3 py-2 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light"
        >
          Lanjutkan
        </button>
      </form>
    </div>
  );
}
