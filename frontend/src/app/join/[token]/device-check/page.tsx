"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeviceCheck } from "@/components/DeviceCheck";
import { CUSTOMER_NAME_KEY, usePublicWaiting } from "@/hooks/usePublicJoin";
import { getApiErrorMessage } from "@/lib/api";

export default function DeviceCheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [positionConfirmed, setPositionConfirmed] = useState(false);
  const [name] = useState<string | null>(() => (typeof window === "undefined" ? null : sessionStorage.getItem(CUSTOMER_NAME_KEY)));
  const [error, setError] = useState<string | null>(null);
  const waiting = usePublicWaiting(token);

  useEffect(() => {
    if (!name) {
      router.replace(`/join/${token}`);
    }
  }, [name, router, token]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Periksa Kamera &amp; Mikrofon</h2>
        <p className="mt-1 text-sm text-zinc-500">Pastikan kamera dan mikrofon Anda berfungsi sebelum bergabung.</p>
      </div>

      <DeviceCheck onReady={setReady} />

      {ready && (
        <label className="flex items-start gap-2 rounded-md border border-gray-border bg-gray-light px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={positionConfirmed}
            onChange={(e) => setPositionConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-gray-border"
          />
          <span className="text-zinc-700">
            Saya sudah memastikan wajah saya masuk ke dalam bingkai dan HP dipegang sejajar mata
          </span>
        </label>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        disabled={!ready || !positionConfirmed || !name || waiting.isPending}
        onClick={() => {
          if (!name) return;
          setError(null);
          waiting.mutate(name, {
            onSuccess: () => router.push(`/join/${token}/waiting`),
            onError: (err) => setError(getApiErrorMessage(err, "Gagal bergabung ke meeting.")),
          });
        }}
        className="w-full rounded-md bg-gold px-4 py-2 text-sm font-semibold text-charcoal hover:bg-gold-light disabled:opacity-50"
      >
        {waiting.isPending ? "Memproses..." : "Gabung Meeting"}
      </button>
    </div>
  );
}
