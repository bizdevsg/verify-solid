import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockJoin = vi.fn();
const mockClient = {
  join: mockJoin,
  publish: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
  leave: vi.fn().mockResolvedValue(undefined),
  remoteUsers: [] as unknown[],
};

vi.mock("agora-rtc-sdk-ng", () => ({
  default: {
    createClient: vi.fn(() => mockClient),
    createMicrophoneAudioTrack: vi.fn().mockResolvedValue({ close: vi.fn(), setEnabled: vi.fn() }),
    createCameraVideoTrack: vi.fn().mockResolvedValue({
      close: vi.fn(),
      setEnabled: vi.fn(),
      play: vi.fn(),
      stop: vi.fn(),
    }),
  },
}));

import { VideoRoom } from "@/components/VideoRoom";

describe("VideoRoom", () => {
  beforeEach(() => {
    mockJoin.mockReset();
    mockClient.remoteUsers = [];
  });

  it("shows a connection error banner when the room fails to connect", async () => {
    mockJoin.mockRejectedValue(new Error("connect failed"));

    render(
      <VideoRoom
        appId="test-app"
        channel="test-channel"
        token="fake-token"
        uid={1}
        title="Verifikasi Nasabah"
        startedAt={null}
        onLeave={vi.fn()}
      />
    );

    expect(await screen.findByText(/gagal terhubung ke ruang meeting/i)).toBeInTheDocument();
  });

  it("shows a waiting placeholder when no customer video track is available", async () => {
    mockJoin.mockResolvedValue(undefined);

    render(
      <VideoRoom
        appId="test-app"
        channel="test-channel"
        token="fake-token"
        uid={1}
        title="Verifikasi Nasabah"
        startedAt={null}
        onLeave={vi.fn()}
      />
    );

    expect(await screen.findByText(/menunggu video nasabah/i)).toBeInTheDocument();
  });
});
