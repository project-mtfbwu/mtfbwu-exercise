import { normalizeBarcode } from "./normalize";
import type {
  BarcodeFormat,
  BarcodeScanResult,
  BarcodeScannerAdapter,
  CameraDevice,
  ScannerOptions,
} from "./types";

// `typeof import(...)` is a type-only construct erased at compile time, so
// referencing it here does not pull `@zxing/browser` into this module's
// runtime graph. The actual package is only loaded via the dynamic
// `import()` calls inside the methods below.
type ZxingModule = typeof import("@zxing/browser");
type ZxingReader = InstanceType<ZxingModule["BrowserMultiFormatReader"]>;
type ZxingControls = Awaited<ReturnType<ZxingReader["decodeFromVideoDevice"]>>;
type ZxingResult = Awaited<ReturnType<ZxingReader["decodeFromImageUrl"]>>;
type ZxingBarcodeFormatName =
  "EAN_13" | "EAN_8" | "UPC_A" | "UPC_E" | "CODE_128" | "DATA_MATRIX" | "QR_CODE";

const FORMAT_TO_ZXING_NAME: Record<
  Exclude<BarcodeFormat, "unknown">,
  ZxingBarcodeFormatName
> = {
  ean_13: "EAN_13",
  ean_8: "EAN_8",
  upc_a: "UPC_A",
  upc_e: "UPC_E",
  code_128: "CODE_128",
  data_matrix: "DATA_MATRIX",
  qr_code: "QR_CODE",
};

const ZXING_NAME_TO_FORMAT: Record<string, BarcodeFormat> = {
  EAN_13: "ean_13",
  EAN_8: "ean_8",
  UPC_A: "upc_a",
  UPC_E: "upc_e",
  CODE_128: "code_128",
  DATA_MATRIX: "data_matrix",
  QR_CODE: "qr_code",
};

function guessFacing(label: string): CameraDevice["facing"] {
  const lower = label.toLowerCase();
  if (lower.includes("back") || lower.includes("rear") || lower.includes("environment"))
    return "environment";
  if (lower.includes("front") || lower.includes("user") || lower.includes("face"))
    return "user";
  return "unknown";
}

function zxingFormatToBarcodeFormat(zxing: ZxingModule, value: number): BarcodeFormat {
  const name = (zxing.BarcodeFormat as unknown as Record<number, string>)[value];
  return (name && ZXING_NAME_TO_FORMAT[name]) || "unknown";
}

function toZxingFormatValues(zxing: ZxingModule, formats: BarcodeFormat[]): number[] {
  const enumRecord = zxing.BarcodeFormat as unknown as Record<string, number>;
  return formats
    .filter((format): format is Exclude<BarcodeFormat, "unknown"> => format !== "unknown")
    .map((format) => enumRecord[FORMAT_TO_ZXING_NAME[format]])
    .filter((value): value is number => typeof value === "number");
}

function toScanResult(zxing: ZxingModule, result: ZxingResult): BarcodeScanResult {
  const format = zxingFormatToBarcodeFormat(zxing, result.getBarcodeFormat());
  const rawValue = result.getText();
  const normalized = normalizeBarcode(rawValue, format);
  return {
    rawValue,
    normalizedValue: normalized.ok ? normalized.normalized : rawValue,
    format,
    source: "zxing",
  };
}

function getStreamFromVideo(video: HTMLVideoElement): MediaStream | null {
  return video.srcObject instanceof MediaStream ? video.srcObject : null;
}

/**
 * Barcode scanner backed by the pure-JS `@zxing/browser` decoder, used as a
 * fallback when the native `BarcodeDetector` API is unavailable (e.g.
 * Safari, Firefox). The package is only ever loaded via dynamic `import()`
 * so it never ends up in bundles/pages that don't need it.
 */
export class ZxingBarcodeScannerAdapter implements BarcodeScannerAdapter {
  readonly engine = "zxing" as const;

  private zxingModule: ZxingModule | null = null;
  private controls: ZxingControls | null = null;
  private stream: MediaStream | null = null;

  private async loadModule(): Promise<ZxingModule> {
    if (!this.zxingModule) {
      this.zxingModule = await import("@zxing/browser");
    }
    return this.zxingModule;
  }

  async isSupported(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
      return false;
    try {
      await this.loadModule();
      return true;
    } catch {
      return false;
    }
  }

  async listCameras(): Promise<CameraDevice[]> {
    const zxing = await this.loadModule();
    const devices = await zxing.BrowserCodeReader.listVideoInputDevices();
    return devices.map((device) => ({
      deviceId: device.deviceId,
      label: device.label || "Camera",
      facing: guessFacing(device.label),
    }));
  }

  async start(options: ScannerOptions): Promise<void> {
    const zxing = await this.loadModule();
    const reader = new zxing.BrowserMultiFormatReader();
    if (options.formats && options.formats.length > 0) {
      const values = toZxingFormatValues(zxing, options.formats);
      if (values.length > 0) {
        reader.possibleFormats = values as unknown as ZxingReader["possibleFormats"];
      }
    }

    this.controls = await reader.decodeFromVideoDevice(
      options.deviceId,
      options.videoElement,
      (result, error) => {
        if (result) {
          options.onResult(toScanResult(zxing, result));
        } else if (error && error.name !== "NotFoundException") {
          options.onError?.(new Error(error.message || "Barcode decode failed"));
        }
      },
    );
    this.stream = getStreamFromVideo(options.videoElement);
  }

  async stop(): Promise<void> {
    this.controls?.stop();
    this.controls = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
  }

  async setTorch(on: boolean): Promise<boolean> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return false;
    const zxing = await this.loadModule();
    if (!zxing.BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(track)) return false;
    try {
      await zxing.BrowserCodeReader.mediaStreamSetTorch(track, on);
      return true;
    } catch {
      return false;
    }
  }

  async scanImage(file: Blob): Promise<BarcodeScanResult | null> {
    const zxing = await this.loadModule();
    const reader = new zxing.BrowserMultiFormatReader();
    const url = URL.createObjectURL(file);
    try {
      const result = await reader.decodeFromImageUrl(url);
      return toScanResult(zxing, result);
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
