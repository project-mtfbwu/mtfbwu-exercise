import type { BarcodeScannerAdapter } from "./types";

/**
 * Camera access (`getUserMedia`) is only available in secure contexts:
 * HTTPS origins, or `localhost`/`127.0.0.1` during local development.
 */
export function isSecureCameraContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const hostname = window.location?.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Picks the best available barcode scanning engine for this browser: the
 * native `BarcodeDetector` API when supported, otherwise the pure-JS zxing
 * decoder. Both adapters are loaded lazily so unsupported engines never end
 * up in the bundle for browsers that don't need them.
 */
export async function createBarcodeScanner(): Promise<BarcodeScannerAdapter> {
  const { NativeBarcodeScannerAdapter } = await import("./native-adapter");
  const native = new NativeBarcodeScannerAdapter();
  if (await native.isSupported()) {
    return native;
  }

  const { ZxingBarcodeScannerAdapter } = await import("./zxing-adapter");
  const zxing = new ZxingBarcodeScannerAdapter();
  if (await zxing.isSupported()) {
    return zxing;
  }

  throw new Error("No supported barcode scanning engine is available in this browser");
}
