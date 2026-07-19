import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@livekit/components-styles", () => ({}));

vi.mock("livekit-client", () => ({
  Track: { Source: { Camera: "camera", Microphone: "microphone" } },
  ConnectionState: {
    Connecting: "connecting",
    Reconnecting: "reconnecting",
    Connected: "connected",
    Disconnected: "disconnected",
  },
  VideoPresets: {
    h360: { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 450_000, maxFramerate: 24 } },
  },
}));

vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children, onError }: { children: React.ReactNode; onError?: (e: Error) => void }) => {
    React.useEffect(() => {
      onError?.(new Error("Gagal terhubung ke server LiveKit."));
    }, [onError]);
    return <div>{children}</div>;
  },
  RoomAudioRenderer: () => null,
  TrackToggle: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  DisconnectButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  VideoTrack: () => <div data-testid="video-track" />,
  useConnectionState: () => "disconnected",
  useTracks: () => [],
}));

import { VideoRoom } from "@/components/VideoRoom";

describe("VideoRoom", () => {
  it("shows a connection error banner when the room fails to connect", async () => {
    render(
      <VideoRoom url="ws://localhost:7880" token="fake-token" title="Verifikasi Nasabah" startedAt={null} onLeave={vi.fn()} />
    );

    expect(await screen.findByText(/gagal terhubung ke server livekit/i)).toBeInTheDocument();
  });

  it("shows a waiting placeholder when no customer video track is available", () => {
    render(
      <VideoRoom url="ws://localhost:7880" token="fake-token" title="Verifikasi Nasabah" startedAt={null} onLeave={vi.fn()} />
    );

    expect(screen.getByText(/menunggu video nasabah/i)).toBeInTheDocument();
  });
});
