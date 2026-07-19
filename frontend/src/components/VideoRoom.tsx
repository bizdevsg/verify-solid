"use client";

import "@livekit/components-styles";
import { useCallback, useState } from "react";
import {
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  VideoTrack,
  useConnectionState,
  useTracks,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-core";
import { ConnectionState, MediaDeviceFailure, Track, VideoPresets } from "livekit-client";
import { MeetingTimer } from "@/components/MeetingTimer";

// Verification calls just need a clear-enough view of a face, not HD — capping
// resolution/bitrate here keeps bandwidth demand low so the call stays smooth
// on modest connections instead of the encoder fighting for bandwidth and
// dropping frames (choppy video). adaptiveStream lets LiveKit lower quality
// automatically under network pressure instead of stalling.
const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h360.resolution,
  },
  publishDefaults: {
    videoEncoding: VideoPresets.h360.encoding,
  },
};

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

  // LiveKitRoom re-runs its connect effect whenever onError's identity
  // changes (it's a real dependency inside the SDK, not just an event
  // listener) — an inline arrow function here would recreate itself on
  // every re-render of a parent (e.g. a page polling meeting status every
  // few seconds), silently reconnecting the call over and over and looking
  // like random disconnects/stutter. useCallback keeps the reference stable.
  const handleError = useCallback((error: Error) => {
    setRoomError(error.message || "Gagal terhubung ke ruang meeting.");
  }, []);

  const handleMediaDeviceFailure = useCallback((failure?: MediaDeviceFailure) => {
    if (failure) {
      setMediaError("Tidak dapat mengakses kamera atau mikrofon. Periksa izin perangkat Anda.");
    }
  }, []);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      options={ROOM_OPTIONS}
      connect
      video
      audio
      onDisconnected={onLeave}
      onError={handleError}
      onMediaDeviceFailure={handleMediaDeviceFailure}
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
  const isConnected = connectionState === ConnectionState.Connected;

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 bg-charcoal px-4 py-3 text-sm">
        <span className="font-medium">{title}</span>
        {startedAt && <MeetingTimer startedAt={startedAt} />}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isConnected ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
          {connectionLabel[connectionState] ?? connectionState}
        </span>
      </header>

      <div className="relative flex-1 bg-charcoal p-2 sm:p-4">
        {(mediaError || roomError) && (
          <div className="absolute inset-x-2 top-2 z-20 rounded-md bg-red-600/90 px-4 py-2 text-center text-sm sm:inset-x-4 sm:top-4">
            {mediaError || roomError}
          </div>
        )}

        <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
          {customerTrack ? (
            <>
              <VideoTrack trackRef={customerTrack} className="h-full w-full object-cover" />
              <ParticipantBadge trackRef={customerTrack} fallbackName="Nasabah" />
            </>
          ) : (
            <PlaceholderTile label="Menunggu video nasabah..." name="Nasabah" />
          )}

          <div className="absolute bottom-4 right-4 aspect-video w-28 overflow-hidden rounded-lg border-2 border-white/30 shadow-xl sm:w-44">
            {staffTrack ? (
              <>
                <VideoTrack trackRef={staffTrack} className="h-full w-full object-cover" />
                <ParticipantBadge trackRef={staffTrack} fallbackName="Petugas" compact />
              </>
            ) : (
              <PlaceholderTile label="" name="Petugas" compact />
            )}
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 bg-charcoal px-4 py-3">
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

function ParticipantBadge({ trackRef, fallbackName, compact }: { trackRef: TrackReference; fallbackName: string; compact?: boolean }) {
  const name = trackRef.participant.name || fallbackName;

  return (
    <div
      className={`absolute bottom-2 left-2 max-w-[80%] truncate rounded-md bg-black/60 text-white backdrop-blur-sm ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs font-medium"
      }`}
    >
      {name}
    </div>
  );
}

function PlaceholderTile({ label, name, compact }: { label: string; name: string; compact?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-charcoal-light">
      <div
        className={`flex items-center justify-center rounded-full bg-white/10 font-semibold text-white/70 ${
          compact ? "h-7 w-7 text-xs" : "h-16 w-16 text-2xl"
        }`}
      >
        {initial}
      </div>
      {label && !compact && <span className="text-sm text-zinc-400">{label}</span>}
    </div>
  );
}
