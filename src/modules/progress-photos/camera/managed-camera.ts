export class ProgressCameraPermissionDenied extends Error {
  constructor(message = "Camera permission was denied.") {
    super(message);
    this.name = "ProgressCameraPermissionDenied";
  }
}

export class ProgressCameraUnavailable extends Error {
  constructor(message = "Camera is unavailable on this device.") {
    super(message);
    this.name = "ProgressCameraUnavailable";
  }
}

export class ProgressCameraInsecureContext extends Error {
  constructor(message = "Camera requires a secure context (HTTPS or localhost).") {
    super(message);
    this.name = "ProgressCameraInsecureContext";
  }
}

export type ProgressVideoDevice = {
  deviceId: string;
  label: string;
};

let activeStream: MediaStream | null = null;

export function isSecureCameraContext(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function getActiveProgressCameraStream(): MediaStream | null {
  return activeStream;
}

export function clearActiveProgressCameraStream(): void {
  stopProgressCamera();
}

function stopStreamTracks(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

export function stopProgressCamera(stream?: MediaStream | null): void {
  if (stream) {
    stopStreamTracks(stream);
    if (activeStream === stream) activeStream = null;
    return;
  }
  stopStreamTracks(activeStream);
  activeStream = null;
}

export async function requestProgressCamera(options?: {
  deviceId?: string;
  facingMode?: "environment" | "user";
}): Promise<MediaStream> {
  if (!isSecureCameraContext()) {
    throw new ProgressCameraInsecureContext();
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new ProgressCameraUnavailable();
  }

  stopProgressCamera(activeStream);

  const video: MediaTrackConstraints = options?.deviceId
    ? { deviceId: { exact: options.deviceId } }
    : { facingMode: options?.facingMode ?? "environment" };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video,
    });
    activeStream = stream;
    return stream;
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new ProgressCameraPermissionDenied();
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      throw new ProgressCameraUnavailable("No camera device was found.");
    }
    throw new ProgressCameraUnavailable(
      error instanceof Error ? error.message : "Could not open camera.",
    );
  }
}

export async function enumerateProgressVideoDevices(): Promise<ProgressVideoDevice[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device) => ({
      deviceId: device.deviceId,
      label: device.label || "Camera",
    }));
}

/**
 * Captures a single JPEG frame from a live preview element.
 * Never uploads or stores the video stream itself.
 */
export async function captureFrameFromVideo(
  video: HTMLVideoElement,
  quality = 0.92,
): Promise<Blob> {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    throw new ProgressCameraUnavailable("Video preview is not ready.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new ProgressCameraUnavailable("Canvas not available.");
  context.drawImage(video, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Could not encode camera frame.")),
      "image/jpeg",
      quality,
    );
  });
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
