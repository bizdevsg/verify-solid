"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IRemoteVideoTrack,
  IMicrophoneAudioTrack,
  ConnectionState,
} from "agora-rtc-sdk-ng";

type PlayableVideoTrack = ICameraVideoTrack | IRemoteVideoTrack;
import { MeetingTimer } from "@/components/MeetingTimer";

// Fixed uids assigned by the backend for every meeting — staff always joins
// as 1, the customer always as 2 (see AgoraService::UID_STAFF/UID_CUSTOMER).
// Uniqueness only has to hold within one channel, so this is enough to know
// which tile is "the customer" regardless of which side is watching.
const UID_STAFF = 1;
const UID_CUSTOMER = 2;

// Verification calls just need a clear-enough view of a face, not HD —
// capping resolution/bitrate here keeps bandwidth demand low so the call
// stays smooth on modest connections instead of the encoder fighting for
// bandwidth and dropping frames (choppy video).
const VIDEO_ENCODER_CONFIG = "360p_1";

interface VideoRoomProps {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  title: string;
  startedAt: Date | null;
  onLeave: () => void;
  endAction?: React.ReactNode;
}

const connectionLabel: Record<ConnectionState, string> = {
  DISCONNECTED: "Terputus",
  DISCONNECTING: "Memutuskan...",
  CONNECTING: "Menghubungkan...",
  RECONNECTING: "Menyambung ulang...",
  CONNECTED: "Terhubung",
};

export function VideoRoom({ appId, channel, token, uid, title, startedAt, onLeave, endAction }: VideoRoomProps) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>("DISCONNECTED");
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  useEffect(() => {
    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const handleConnectionStateChange = (cur: ConnectionState) => setConnectionState(cur);
    const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      await client.subscribe(user, mediaType);
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
      setRemoteUsers([...client.remoteUsers]);
    };
    const handleUserUnpublished = () => setRemoteUsers([...client.remoteUsers]);
    const handleUserLeft = () => {
      setRemoteUsers([...client.remoteUsers]);
      // Only two people are ever in a verification call — once the other
      // side leaves, there's nothing left to stay connected for.
      onLeaveRef.current();
    };

    client.on("connection-state-change", handleConnectionStateChange);
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    (async () => {
      try {
        await client.join(appId, channel, token, uid);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: VIDEO_ENCODER_CONFIG });
        if (cancelled) {
          audioTrack.close();
          videoTrack.close();
          return;
        }

        localAudioRef.current = audioTrack;
        localVideoRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);

        await client.publish([audioTrack, videoTrack]);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("device")) {
          setMediaError("Tidak dapat mengakses kamera atau mikrofon. Periksa izin perangkat Anda.");
        } else {
          setRoomError("Gagal terhubung ke ruang meeting.");
        }
      }
    })();

    return () => {
      cancelled = true;
      client.off("connection-state-change", handleConnectionStateChange);
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      client.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, channel, token, uid]);

  const toggleMic = useCallback(() => {
    const track = localAudioRef.current;
    if (!track) return;
    const next = !micEnabled;
    track.setEnabled(next);
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCam = useCallback(() => {
    const track = localVideoRef.current;
    if (!track) return;
    const next = !camEnabled;
    track.setEnabled(next);
    setCamEnabled(next);
  }, [camEnabled]);

  const handleLeave = useCallback(() => {
    onLeaveRef.current();
  }, []);

  const remoteUser = remoteUsers[0];
  const isCustomer = uid === UID_CUSTOMER;
  const customerVideoTrack = isCustomer ? localVideoTrack : remoteUser?.uid === UID_CUSTOMER ? remoteUser.videoTrack : undefined;
  const staffVideoTrack = !isCustomer ? localVideoTrack : remoteUser?.uid === UID_STAFF ? remoteUser.videoTrack : undefined;

  const isConnected = connectionState === "CONNECTED";

  return (
    <div className="flex h-full flex-col bg-charcoal text-white">
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

      {/* min-h-0 overrides the flex item's default min-height:auto. Without
          it, once a real <video> element mounts (with its own intrinsic
          size), flexbox lets its content push this item taller than the
          available space instead of clipping it. */}
      <div className="relative min-h-0 flex-1 bg-charcoal p-2 sm:p-4">
        {(mediaError || roomError) && (
          <div className="absolute inset-x-2 top-2 z-20 rounded-md bg-red-600/90 px-4 py-2 text-center text-sm sm:inset-x-4 sm:top-4">
            {mediaError || roomError}
          </div>
        )}

        <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
          {customerVideoTrack ? (
            <>
              <VideoTile track={customerVideoTrack} />
              <TileBadge label="Nasabah" />
            </>
          ) : (
            <PlaceholderTile label="Menunggu video nasabah..." name="Nasabah" />
          )}

          <div className="absolute bottom-4 right-4 aspect-video w-28 overflow-hidden rounded-lg border-2 border-white/30 shadow-xl sm:w-44">
            {staffVideoTrack ? (
              <>
                <VideoTile track={staffVideoTrack} />
                <TileBadge label="Petugas" compact />
              </>
            ) : (
              <PlaceholderTile label="" name="Petugas" compact />
            )}
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 bg-charcoal px-4 py-3">
        <button
          onClick={toggleMic}
          className={`rounded-full px-4 py-2 text-sm hover:bg-white/20 ${micEnabled ? "bg-white/10" : "bg-red-600/80"}`}
        >
          Mikrofon
        </button>
        <button
          onClick={toggleCam}
          className={`rounded-full px-4 py-2 text-sm hover:bg-white/20 ${camEnabled ? "bg-white/10" : "bg-red-600/80"}`}
        >
          Kamera
        </button>
        {endAction ?? (
          <button
            onClick={handleLeave}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold hover:bg-red-700"
          >
            Keluar
          </button>
        )}
      </footer>
    </div>
  );
}

function VideoTile({ track }: { track: PlayableVideoTrack }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // "cover" crops to fill the tile whenever the camera's aspect ratio
      // doesn't match the tile's — e.g. a portrait phone stream inside this
      // (usually wider) box gets scaled up and its top/bottom sliced off,
      // which looks identical to someone holding the camera too close.
      // "contain" always shows the full frame (letterboxed if needed), so
      // framing in the actual call matches what was seen during device
      // check instead of being re-cropped by whatever shape this tile is.
      track.play(containerRef.current, { fit: "contain" });
    }
    return () => {
      track.stop();
    };
  }, [track]);

  return <div ref={containerRef} className="h-full w-full [&>div]:!h-full [&>div]:!w-full" />;
}

function TileBadge({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <div
      className={`absolute bottom-2 left-2 max-w-[80%] truncate rounded-md bg-black/60 text-white backdrop-blur-sm ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs font-medium"
      }`}
    >
      {label}
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
