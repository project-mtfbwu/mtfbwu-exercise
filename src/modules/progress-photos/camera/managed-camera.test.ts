import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureFrameFromVideo,
  clearActiveProgressCameraStream,
  enumerateProgressVideoDevices,
  getActiveProgressCameraStream,
  isSecureCameraContext,
  ProgressCameraInsecureContext,
  ProgressCameraPermissionDenied,
  requestProgressCamera,
  stopProgressCamera,
} from "./managed-camera";

function mockTrack() {
  return { stop: vi.fn(), kind: "video" as const };
}

function mockStream(tracks = [mockTrack()]): MediaStream {
  return { getTracks: () => tracks } as unknown as MediaStream;
}

describe("isSecureCameraContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires secure context and getUserMedia", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn() },
    });
    expect(isSecureCameraContext()).toBe(true);
  });

  it("returns false when insecure", () => {
    vi.stubGlobal("window", { isSecureContext: false });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn() },
    });
    expect(isSecureCameraContext()).toBe(false);
  });
});

describe("requestProgressCamera", () => {
  beforeEach(() => {
    clearActiveProgressCameraStream();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearActiveProgressCameraStream();
  });

  it("throws when context is insecure", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    await expect(requestProgressCamera()).rejects.toBeInstanceOf(
      ProgressCameraInsecureContext,
    );
  });

  it("requests video-only constraints and stops prior stream", async () => {
    const firstTrack = mockTrack();
    const secondTrack = mockTrack();
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(mockStream([firstTrack]))
      .mockResolvedValueOnce(mockStream([secondTrack]));

    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await requestProgressCamera({ facingMode: "environment" });
    expect(firstTrack.stop).not.toHaveBeenCalled();
    await requestProgressCamera({ facingMode: "user" });
    expect(firstTrack.stop).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenLastCalledWith({
      audio: false,
      video: { facingMode: "user" },
    });
    expect(getActiveProgressCameraStream()).toBeDefined();
  });

  it("maps permission denial", async () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException("", "NotAllowedError")),
      },
    });
    await expect(requestProgressCamera()).rejects.toBeInstanceOf(
      ProgressCameraPermissionDenied,
    );
  });
});

describe("stopProgressCamera", () => {
  it("stops active stream tracks", async () => {
    const track = mockTrack();
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream([track])),
      },
    });
    await requestProgressCamera();
    stopProgressCamera();
    expect(track.stop).toHaveBeenCalled();
    expect(getActiveProgressCameraStream()).toBeNull();
  });
});

describe("enumerateProgressVideoDevices", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists videoinput devices", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: "videoinput", deviceId: "cam1", label: "Back camera" },
          { kind: "audioinput", deviceId: "mic", label: "Mic" },
        ]),
      },
    });
    await expect(enumerateProgressVideoDevices()).resolves.toEqual([
      { deviceId: "cam1", label: "Back camera" },
    ]);
  });
});

describe("captureFrameFromVideo", () => {
  it("rejects when video dimensions are zero", async () => {
    const video = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement;
    await expect(captureFrameFromVideo(video)).rejects.toThrow(/not ready/i);
  });
});
