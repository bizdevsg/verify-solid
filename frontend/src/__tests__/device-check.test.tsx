import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeviceCheck } from "@/components/DeviceCheck";

function fakeStream() {
  return {
    getVideoTracks: () => [{ stop: vi.fn() }],
    getAudioTracks: () => [{ stop: vi.fn() }],
    getTracks: () => [{ stop: vi.fn() }],
  } as unknown as MediaStream;
}

describe("DeviceCheck", () => {
  beforeEach(() => {
    Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("shows ready status when camera and microphone permissions succeed", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) },
    });

    const onReady = vi.fn();
    render(<DeviceCheck onReady={onReady} />);

    expect(await screen.findByText(/kamera siap/i)).toBeInTheDocument();
    expect(await screen.findByText(/mikrofon siap/i)).toBeInTheDocument();
    expect(onReady).toHaveBeenCalledWith(true);
  });

  it("shows a retry option when permission is denied", async () => {
    Object.defineProperty(global.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error("Permission denied")) },
    });

    const onReady = vi.fn();
    render(<DeviceCheck onReady={onReady} />);

    expect(await screen.findByRole("button", { name: /coba lagi/i })).toBeInTheDocument();
    expect(onReady).toHaveBeenCalledWith(false);
  });
});
