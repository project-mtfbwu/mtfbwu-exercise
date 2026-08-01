/** Progress photos are downscaled to at most this many pixels on the longest side. */
export const MAX_PROGRESS_PHOTO_DIMENSION = 2048;

/** Reject source files larger than 8 MB (matches Storage bucket limit). */
export const MAX_PROGRESS_PHOTO_BYTES = 8 * 1024 * 1024;

/** JPEG re-encode quality for processed progress photos. */
export const PROGRESS_PHOTO_JPEG_QUALITY = 0.88;

export class ProgressPhotoTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(
      `Photo is ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB; maximum is ` +
        `${MAX_PROGRESS_PHOTO_BYTES / (1024 * 1024)} MB.`,
    );
    this.name = "ProgressPhotoTooLargeError";
  }
}

export { scaleDimension } from "@/modules/nutrition/ocr/preprocess";
export type {
  PreprocessLabelImageResult,
  ScaledDimensions,
} from "@/modules/nutrition/ocr/preprocess";

export type PreprocessedProgressPhoto = {
  blob: Blob;
  width: number;
  height: number;
  /** True when bytes are crop+scale processed, never a raw camera file. */
  isProcessedProgressPhoto: true;
};

/**
 * Prepares a progress photo for private upload: honors EXIF orientation via
 * `createImageBitmap`, scales to `MAX_PROGRESS_PHOTO_DIMENSION`, re-encodes JPEG.
 * Browser-only — mirrors nutrition label preprocess patterns.
 */
export async function preprocessProgressPhoto(
  file: Blob,
): Promise<PreprocessedProgressPhoto> {
  return preprocessProgressPhotoWithOptions(file);
}

/**
 * Adaptive preprocess for quota retry — optional smaller max dimension / quality.
 */
export async function preprocessProgressPhotoWithOptions(
  file: Blob,
  options?: { maxDimension?: number; quality?: number },
): Promise<PreprocessedProgressPhoto> {
  if (file.size > MAX_PROGRESS_PHOTO_BYTES) {
    throw new ProgressPhotoTooLargeError(file.size);
  }

  const maxDimension = options?.maxDimension ?? MAX_PROGRESS_PHOTO_DIMENSION;
  const quality = options?.quality ?? PROGRESS_PHOTO_JPEG_QUALITY;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { scaleDimension } = await import("@/modules/nutrition/ocr/preprocess");
  const { width, height } = scaleDimension(bitmap.width, bitmap.height, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode JPEG"))),
      "image/jpeg",
      quality,
    );
  });

  return { blob, width, height, isProcessedProgressPhoto: true };
}
