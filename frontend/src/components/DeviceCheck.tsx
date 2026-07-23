"use client";

import { useEffect, useRef, useState } from "react";

type CheckStatus = "checking" | "ready" | "error";

export function DeviceCheck({ onReady }: { onReady: (ready: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>("checking");
  const [micStatus, setMicStatus] = useState<CheckStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runCheck = async () => {
    setCameraStatus("checking");
    setMicStatus("checking");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraStatus(stream.getVideoTracks().length > 0 ? "ready" : "error");
      setMicStatus(stream.getAudioTracks().length > 0 ? "ready" : "error");
    } catch {
      setCameraStatus("error");
      setMicStatus("error");
      setErrorMessage("Izin kamera atau mikrofon ditolak. Klik \"Coba Lagi\" dan izinkan akses perangkat.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async permission check must run on mount
    runCheck();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    onReady(cameraStatus === "ready" && micStatus === "ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus, micStatus]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

        {cameraStatus === "ready" && (
          <>
            {/* Face-positioning guide: helps customers hold the phone at eye
                level and center their face before joining, instead of
                staff having to correct an awkward camera angle live. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[68%] aspect-[3/4] rounded-[50%] border-2 border-dashed border-gold/80" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 text-center text-xs font-medium text-white">
              Posisikan wajah Anda di dalam bingkai — pegang HP sejajar mata
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <StatusRow label="Kamera" status={cameraStatus} readyLabel="Kamera siap" />
        <StatusRow label="Mikrofon" status={micStatus} readyLabel="Mikrofon siap" />
      </div>

      {errorMessage && (
        <div className="space-y-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{errorMessage}</p>
          <button onClick={runCheck} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, status, readyLabel }: { label: string; status: CheckStatus; readyLabel: string }) {
  const color = status === "ready" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-amber-400";
  const text = status === "ready" ? readyLabel : status === "error" ? `${label} bermasalah` : "Memeriksa...";

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-border px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-zinc-700">{text}</span>
    </div>
  );
}
