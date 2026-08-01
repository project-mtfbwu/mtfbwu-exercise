"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  captureFrameFromVideo,
  enumerateProgressVideoDevices,
  isSecureCameraContext,
  ProgressCameraInsecureContext,
  ProgressCameraPermissionDenied,
  ProgressCameraUnavailable,
  requestProgressCamera,
  stopProgressCamera,
  type ProgressVideoDevice,
} from "@/modules/progress-photos/camera/managed-camera";

export type ProgressCameraPanelProps = {
  onFrameCaptured: (blob: Blob) => void;
  onClose: () => void;
  onPickFile: () => void;
};

export function ProgressCameraPanel({
  onFrameCaptured,
  onClose,
  onPickFile,
}: ProgressCameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<ProgressVideoDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [previewReady, setPreviewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [opening, setOpening] = useState(false);

  const closeCamera = useCallback(() => {
    stopProgressCamera(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewReady(false);
  }, []);

  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, [closeCamera]);

  const openCamera = useCallback(async () => {
    setError(null);
    setOpening(true);
    try {
      if (!isSecureCameraContext()) {
        throw new ProgressCameraInsecureContext();
      }
      closeCamera();
      const stream = await requestProgressCamera({ deviceId, facingMode: "environment" });
      streamRef.current = stream;
      const list = await enumerateProgressVideoDevices();
      setDevices(list);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
        setPreviewReady(videoRef.current.videoWidth > 0);
      }
    } catch (err) {
      if (err instanceof ProgressCameraPermissionDenied) {
        setError("Camera permission denied. Use file picker instead.");
      } else if (err instanceof ProgressCameraInsecureContext) {
        setError("Camera requires HTTPS or localhost. Use file picker instead.");
      } else if (err instanceof ProgressCameraUnavailable) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Could not open camera.");
      }
      closeCamera();
    } finally {
      setOpening(false);
    }
  }, [closeCamera, deviceId]);

  async function switchCamera(nextDeviceId: string) {
    setDeviceId(nextDeviceId);
    closeCamera();
    setOpening(true);
    try {
      const stream = await requestProgressCamera({ deviceId: nextDeviceId });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
        setPreviewReady(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch camera.");
    } finally {
      setOpening(false);
    }
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    setCapturing(true);
    setError(null);
    try {
      const frame = await captureFrameFromVideo(video);
      closeCamera();
      onFrameCaptured(frame);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed.");
    } finally {
      setCapturing(false);
    }
  }

  function handleClose() {
    closeCamera();
    onClose();
  }

  return (
    <div className="space-y-3 border-2 border-[var(--mt-ink)] bg-[var(--mt-surface)] p-3">
      <p className="text-sm font-bold">Camera capture (video never uploaded)</p>
      {error ? (
        <p className="text-sm font-bold text-[var(--mt-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="relative aspect-[3/4] max-h-72 overflow-hidden border-2 border-[var(--mt-ink)] bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          muted
          autoPlay
          onLoadedData={() => setPreviewReady(true)}
          aria-label="Camera preview"
        />
        {!previewReady ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            {opening ? "Opening camera…" : "Open camera to preview"}
          </p>
        ) : null}
      </div>
      {devices.length > 1 ? (
        <label className="block text-sm font-bold">
          Camera
          <select
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2"
            value={deviceId ?? ""}
            onChange={(event) => void switchCamera(event.target.value)}
            aria-label="Switch camera"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <PixelButton tone="primary" loading={opening} onClick={() => void openCamera()}>
          Open camera
        </PixelButton>
        <PixelButton
          tone="primary"
          loading={capturing}
          disabled={!previewReady}
          onClick={() => void handleCapture()}
        >
          Capture frame
        </PixelButton>
        <PixelButton tone="neutral" onClick={onPickFile}>
          Choose file
        </PixelButton>
        <PixelButton tone="danger" onClick={handleClose}>
          Close
        </PixelButton>
      </div>
    </div>
  );
}
