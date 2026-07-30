/** Reject label photos larger than this before doing any client-side work. */
export const MAX_LABEL_IMAGE_BYTES = 5 * 1024 * 1024;

/** Longest side, in pixels, that a preprocessed label image is scaled down to. */
export const MAX_LABEL_IMAGE_DIMENSION = 1600;

/** JPEG re-encode quality for the preprocessed image sent to OCR. */
export const LABEL_IMAGE_JPEG_QUALITY = 0.85;

/**
 * Blend factor toward grayscale (0 = untouched color, 1 = full grayscale).
 * A light desaturation improves Tesseract's contrast handling on glossy/
 * colorful packaging without discarding color entirely (in case a future
 * step wants it, e.g. logo detection).
 */
const GRAYSCALE_STRENGTH = 0.6;

export class LabelImageTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(
      `Label image is ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB; the maximum is ` +
        `${MAX_LABEL_IMAGE_BYTES / (1024 * 1024)} MB.`,
    );
    this.name = "LabelImageTooLargeError";
  }
}

export type ScaledDimensions = { width: number; height: number };

/**
 * Scales `width`/`height` down (never up) so the longer side is at most
 * `maxDimension`, preserving aspect ratio and rounding to whole pixels.
 * Kept as a pure function, independent of canvas/DOM, so it is unit
 * testable in a plain Node/jsdom environment.
 */
export function scaleDimension(
  width: number,
  height: number,
  maxDimension: number,
): ScaledDimensions {
  if (width <= 0 || height <= 0) {
    return {
      width: Math.max(0, Math.round(width)),
      height: Math.max(0, Math.round(height)),
    };
  }
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxDimension / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export type PreprocessLabelImageResult = {
  blob: Blob;
  width: number;
  height: number;
};

/**
 * Prepares a captured/uploaded label photo for OCR: downsizes to at most
 * `MAX_LABEL_IMAGE_DIMENSION` on the longest side, lightly desaturates for
 * contrast, and re-encodes as JPEG.
 *
 * EXIF orientation: phone cameras commonly write image bytes in landscape
 * with an EXIF `Orientation` tag rather than physically rotating pixels.
 * `createImageBitmap(file, { imageOrientation: "from-image" })` asks the
 * browser to honor that tag and hand back an already-upright bitmap —
 * supported in current Chromium, Firefox, and Safari 16+. No manual EXIF
 * parsing is done here; if a target browser lacks this support, sideways
 * captures would need a dedicated EXIF-reading fallback (not implemented).
 *
 * Browser-only: relies on `createImageBitmap` and `<canvas>`, so this
 * function only runs client-side and is intentionally left out of the
 * unit-testable surface (see `scaleDimension` for the pure/tested part).
 */
export async function preprocessLabelImage(
  file: Blob,
): Promise<PreprocessLabelImageResult> {
  if (file.size > MAX_LABEL_IMAGE_BYTES) {
    throw new LabelImageTooLargeError(file.size);
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = scaleDimension(
      bitmap.width,
      bitmap.height,
      MAX_LABEL_IMAGE_DIMENSION,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.drawImage(bitmap, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    desaturateInPlace(imageData.data, GRAYSCALE_STRENGTH);
    context.putImageData(imageData, 0, 0);

    const blob = await canvasToJpegBlob(canvas, LABEL_IMAGE_JPEG_QUALITY);
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

function desaturateInPlace(pixels: Uint8ClampedArray, strength: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels[i] = r + (luminance - r) * strength;
    pixels[i + 1] = g + (luminance - g) * strength;
    pixels[i + 2] = b + (luminance - b) * strength;
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode label image"));
      },
      "image/jpeg",
      quality,
    );
  });
}
