export type BarcodeFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "data_matrix"
  | "qr_code"
  | "unknown";

export type BarcodeScanSource = "native" | "zxing" | "manual" | "image";

export type BarcodeScanResult = {
  rawValue: string;
  normalizedValue: string;
  format: BarcodeFormat;
  source: BarcodeScanSource;
};

export type CameraDevice = {
  deviceId: string;
  label: string;
  facing: "environment" | "user" | "unknown";
};

export type ScannerOptions = {
  videoElement: HTMLVideoElement;
  preferredFacingMode?: "environment" | "user";
  deviceId?: string;
  formats?: BarcodeFormat[];
  onResult: (result: BarcodeScanResult) => void;
  onError?: (error: Error) => void;
};

export interface BarcodeScannerAdapter {
  readonly engine: "native" | "zxing";
  isSupported(): Promise<boolean>;
  listCameras(): Promise<CameraDevice[]>;
  start(options: ScannerOptions): Promise<void>;
  stop(): Promise<void>;
  setTorch?(on: boolean): Promise<boolean>;
  scanImage(file: Blob): Promise<BarcodeScanResult | null>;
}
