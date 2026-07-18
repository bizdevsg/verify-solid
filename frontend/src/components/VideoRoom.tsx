"use client";

import "@livekit/components-styles";
import { useState } from "react";
import {
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  VideoTrack,
  useConnectionState,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { MeetingTimer } from "@/components/MeetingTimer";

interface VideoRoomProps {
  url: string;
  token: string;
  title: string;
  startedAt: Date | null;
  onLeave: () => void;
  endAction?: React.ReactNode;
}

export function VideoRoom({ url, token, title, startedAt, onLeave, endAction }: VideoRoomProps) {
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      video
      audio
      onDisconnected={onLeave}
      onError={(error) => setRoomError(error.message || "Gagal terhubung ke ruang meeting.")}
      onMediaDeviceFailure={(failure) => {
        if (failure) {
          setMediaError("Tidak dapat mengakses kamera atau mikrofon. Periksa izin perangkat Anda.");
        }
      }}
      className="flex h-full flex-col bg-charcoal text-white"
    >
      <RoomAudioRenderer />
      <RoomContent title={title} startedAt={startedAt} endAction={endAction} mediaError={mediaError} roomError={roomError} />
    </LiveKitRoom>
  );
}

function RoomContent({
  title,
  startedAt,
  endAction,
  mediaError,
  roomError,
}: {
  title: string;
  startedAt: Date | null;
  endAction?: React.ReactNode;
  mediaError: string | null;
  roomError: string | null;
}) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const connectionState = useConnectionState();

  const customerTrack = tracks.find((t) => t.participant.identity.startsWith("customer-"));
  const staffTrack = tracks.find((t) => t.participant.identity.startsWith("staff-"));

  const connectionLabel: Record<string, string> = {
    [ConnectionState.Connecting]: "Menghubungkan...",
    [ConnectionState.Reconnecting]: "Menyambung ulang...",
    [ConnectionState.Connected]: "Terhubung",
    [ConnectionState.Disconnected]: "Terputus",
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm">
        <span className="font-medium">{title}</span>
        {startedAt && <MeetingTimer startedAt={startedAt} />}
        <span className={connectionState === ConnectionState.Connected ? "text-emerald-400" : "text-amber-400"}>
          {connectionLabel[connectionState] ?? connectionState}
        </span>
      </header>

      <div className="relative flex-1 bg-black">
        {(mediaError || roomError) && (
          <div className="absolute inset-x-0 top-0 z-10 bg-red-600/90 px-4 py-2 text-center text-sm">
            {mediaError || roomError}
          </div>
        )}

        {customerTrack ? (
          <VideoTrack trackRef={customerTrack} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">Menunggu video nasabah...</div>
        )}

        <div className="absolute bottom-4 right-4 aspect-video w-32 overflow-hidden rounded-lg border-2 border-white/30 shadow-lg sm:w-48">
          {staffTrack ? (
            <VideoTrack trackRef={staffTrack} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-charcoal-light text-xs text-zinc-400">Petugas</div>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-3">
        <TrackToggle source={Track.Source.Microphone} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Mikrofon
        </TrackToggle>
        <TrackToggle source={Track.Source.Camera} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
          Kamera
        </TrackToggle>
        {endAction ?? (
          <DisconnectButton className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold hover:bg-red-700">
            Keluar
          </DisconnectButton>
        )}
      </footer>
    </>
  );
}
