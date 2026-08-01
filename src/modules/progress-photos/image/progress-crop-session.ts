import {
  clampCropRect,
  cropOutputDimensions,
  fullImageCrop,
  type CropRect,
  type RotationQuarterTurns,
  rotatedDisplaySize,
} from "@/modules/nutrition/ocr/crop-rotate";
import {
  renderCroppedLabelImage,
  type CroppedLabelImage,
} from "@/modules/nutrition/ocr/crop-render";
import {
  preprocessProgressPhotoWithOptions,
  type PreprocessedProgressPhoto,
} from "@/modules/progress-photos/image/preprocess";

export { ObjectUrlRegistry } from "@/modules/nutrition/ocr/object-url-registry";

/** Same shape as nutrition `LabelCropSession` — crop/rotate before preprocess. */
export type ProgressCropSession = {
  sourceWidth: number;
  sourceHeight: number;
  rotation: RotationQuarterTurns;
  crop: CropRect;
};

export type ProcessedProgressPhotoFromCrop = {
  cropped: CroppedLabelImage;
  preprocessed: PreprocessedProgressPhoto;
  /** Alias of preprocessed.blob — the only bytes suitable for upload. */
  uploadBlob: Blob;
};

/**
 * Builds the image that private upload must use: crop/rotate first, then
 * progress preprocess. Never returns the raw camera/upload blob.
 */
export async function buildProcessedProgressPhotoFromCropSession(options: {
  source: Blob;
  session: ProgressCropSession;
  maxDimension?: number;
  quality?: number;
}): Promise<ProcessedProgressPhotoFromCrop> {
  const { source, session } = options;
  const display = rotatedDisplaySize(
    session.sourceWidth,
    session.sourceHeight,
    session.rotation,
  );
  const crop = clampCropRect(session.crop, display.width, display.height);
  const cropped = await renderCroppedLabelImage({
    source,
    sourceWidth: session.sourceWidth,
    sourceHeight: session.sourceHeight,
    rotation: session.rotation,
    crop,
    quality: options.quality,
  });
  const preprocessed = await preprocessProgressPhotoWithOptions(cropped.blob, {
    maxDimension: options.maxDimension,
    quality: options.quality,
  });
  return { cropped, preprocessed, uploadBlob: preprocessed.blob };
}

/** Default session: no rotation, full-frame crop. */
export function initialProgressCropSession(
  sourceWidth: number,
  sourceHeight: number,
): ProgressCropSession {
  return {
    sourceWidth,
    sourceHeight,
    rotation: 0,
    crop: fullImageCrop(sourceWidth, sourceHeight),
  };
}

export function assertUploadIsProcessedProgressPhoto(image: {
  isProcessedProgressPhoto?: boolean;
}): void {
  if (!image.isProcessedProgressPhoto) {
    throw new Error("Refusing to upload an uncropped original progress photo.");
  }
}

/** SHA-256 hex digest of processed bytes (Web Crypto). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export { cropOutputDimensions, clampCropRect, fullImageCrop };
