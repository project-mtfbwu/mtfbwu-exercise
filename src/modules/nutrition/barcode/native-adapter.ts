import { normalizeBarcode } from "./normalize";
import type {
  BarcodeFormat,
  BarcodeScanResult,
  BarcodeScannerAdapter,
  CameraDevice,
  ScannerOptions,
} from "./types";

/**
 * Minimal typings for the experimental W3C Shape Detection API. Not part of
 * `lib.dom.d.ts`, so we declare only what this adapter needs.
 */
interface NativeDetectedBarcode {
  rawValue: string;
  format: string;
}

interface NativeBarcodeDetector {
  detect(source: ImageBitmapSource): Promise<NativeDetectedBarcode[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean };

// The Shape Detection API's format strings are a superset of our own
// BarcodeFormat union and share the same spelling, so no translation table
// is needed beyond filtering to the formats we recognize.
const KNOWN_FORMATS: ReadonlySet<string> = new Set<BarcodeFormat>([
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "data_matrix",
  "qr_code",
]);

const DEFAULT_DETECT_FORMATS: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "data_matrix",
  "qr_code",
];

function getBarcodeDetectorCtor(): NativeBarcodeDetectorConstructor | null {
  const ctor = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorConstructor })
    .BarcodeDetector;
  return ctor ?? null;
}

function toBarcodeFormat(value: string): BarcodeFormat {
  return KNOWN_FORMATS.has(value) ? (value as BarcodeFormat) : "unknown";
}

function toRequestedFormats(formats?: BarcodeFormat[]): string[] {
  const requested = formats && formats.length > 0 ? formats : DEFAULT_DETECT_FORMATS;
  return requested.filter((format) => format !== "unknown");
}

function guessFacing(label: string): CameraDevice["facing"] {
  const lower = label.toLowerCase();
  if (lower.includes("back") || lower.includes("rear") || lower.includes("environment"))
    return "environment";
  if (lower.includes("front") || lower.includes("user") || lower.includes("face"))
    return "user";
  return "unknown";
}

function toScanResult(rawValue: string, nativeFormat: string): BarcodeScanResult {
  const format = toBarcodeFormat(nativeFormat);
  const normalized = normalizeBarcode(rawValue, format);
  return {
    rawValue,
    normalizedValue: normalized.ok ? normalized.normalized : rawValue,
    format,
    source: "native",
  };
}

/**
 * Barcode scanner backed by the native `BarcodeDetector` API where
 * available (Chrome/Edge on Android and desktop). Captures frames from a
 * live video element via `createImageBitmap` and detects on a
 * `requestAnimationFrame` loop.
 */
export class NativeBarcodeScannerAdapter implements BarcodeScannerAdapter {
  readonly engine = "native" as const;

  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private detector: NativeBarcodeDetector | null = null;
  private rafHandle: number | null = null;
  private stopped = true;

  async isSupported(): Promise<boolean> {
    const Ctor = getBarcodeDetectorCtor();
    if (!Ctor) return false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
      return false;
    try {
      const supported = await Ctor.getSupportedFormats();
      return supported.includes("ean_13");
    } catch {
      return false;
    }
  }

  async listCameras(): Promise<CameraDevice[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices)
      return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "videoinput")
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || "Camera",
        facing: guessFacing(device.label),
      }));
  }

  async start(options: ScannerOptions): Promise<void> {
    const Ctor = getBarcodeDetectorCtor();
    if (!Ctor) throw new Error("BarcodeDetector is not supported in this browser");

    this.detector = new Ctor({ formats: toRequestedFormats(options.formats) });
    this.videoElement = options.videoElement;

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: options.deviceId
        ? { deviceId: { exact: options.deviceId } }
        : { facingMode: options.preferredFacingMode ?? "environment" },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoElement.srcObject = this.stream;
    await this.videoElement.play().catch(() => undefined);

    this.stopped = false;
    this.runDetectLoop(options);
  }

  private runDetectLoop(options: ScannerOptions): void {
    const tick = async (): Promise<void> => {
      if (this.stopped || !this.videoElement || !this.detector) return;
      try {
        if (this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const bitmap = await createImageBitmap(this.videoElement);
          try {
            const detections = await this.detector.detect(bitmap);
            const first = detections[0];
            if (first) {
              options.onResult(toScanResult(first.rawValue, first.format));
            }
          } finally {
            bitmap.close();
          }
        }
      } catch (error) {
        options.onError?.(
          error instanceof Error ? error : new Error("Native barcode detection failed"),
        );
      }
      if (!this.stopped) {
        this.rafHandle = requestAnimationFrame(() => void tick());
      }
    };
    this.rafHandle = requestAnimationFrame(() => void tick());
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.detector = null;
  }

  async setTorch(on: boolean): Promise<boolean> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return false;
    const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined;
    if (!capabilities || !("torch" in capabilities)) return false;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as TorchConstraintSet] });
      return true;
    } catch {
      return false;
    }
  }

  async scanImage(file: Blob): Promise<BarcodeScanResult | null> {
    const Ctor = getBarcodeDetectorCtor();
    if (!Ctor) throw new Error("BarcodeDetector is not supported in this browser");
    const detector = new Ctor({ formats: toRequestedFormats() });
    const bitmap = await createImageBitmap(file);
    try {
      const detections = await detector.detect(bitmap);
      const first = detections[0];
      return first ? toScanResult(first.rawValue, first.format) : null;
    } finally {
      bitmap.close();
    }
  }
}
