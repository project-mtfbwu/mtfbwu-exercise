import {
  clampCropRect,
  cropOutputDimensions,
  fullImageCrop,
  type CropRect,
  type RotationQuarterTurns,
  rotatedDisplaySize,
} from "./crop-rotate";
import { renderCroppedLabelImage, type CroppedLabelImage } from "./crop-render";
import { preprocessLabelImage, type PreprocessLabelImageResult } from "./preprocess";

export type LabelCropSession = {
  /** EXIF-upright natural size of the session source. */
  sourceWidth: number;
  sourceHeight: number;
  rotation: RotationQuarterTurns;
  crop: CropRect;
};

/**
 * Builds the image that OCR + private upload must use: crop/rotate first,
 * then preprocess. Never returns the raw camera/upload blob.
 */
export async function buildOcrInputFromCropSession(options: {
  source: Blob;
  session: LabelCropSession;
}): Promise<{
  cropped: CroppedLabelImage;
  preprocessed: PreprocessLabelImageResult;
  /** Alias of preprocessed.blob — the only bytes suitable for upload/OCR. */
  ocrBlob: Blob;
}> {
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
  });
  const preprocessed = await preprocessLabelImage(cropped.blob);
  return { cropped, preprocessed, ocrBlob: preprocessed.blob };
}

/** Default session: no rotation, full-frame crop. */
export function initialCropSession(
  sourceWidth: number,
  sourceHeight: number,
): LabelCropSession {
  return {
    sourceWidth,
    sourceHeight,
    rotation: 0,
    crop: fullImageCrop(sourceWidth, sourceHeight),
  };
}

export function assertUploadIsProcessedCrop(image: { isProcessedCrop?: boolean }): void {
  if (!image.isProcessedCrop) {
    throw new Error("Refusing to upload an uncropped original label image.");
  }
}

export { cropOutputDimensions, clampCropRect, fullImageCrop };
