import {
  clampCropRect,
  cropOutputDimensions,
  type CropRect,
  type RotationQuarterTurns,
  rotatedDisplaySize,
} from "./crop-rotate";
import {
  LABEL_IMAGE_JPEG_QUALITY,
  MAX_LABEL_IMAGE_BYTES,
  LabelImageTooLargeError,
} from "./preprocess";

export type CroppedLabelImage = {
  blob: Blob;
  width: number;
  height: number;
  /** True when the result is the crop/rotate output, never the raw camera file. */
  isProcessedCrop: true;
};

/**
 * Draws the source bitmap into a canvas with the given display rotation and
 * crop, then encodes JPEG (metadata stripped by re-encode).
 *
 * OCR and private Storage must receive this blob — never the uncropped
 * camera original.
 */
export async function renderCroppedLabelImage(options: {
  source: Blob;
  sourceWidth: number;
  sourceHeight: number;
  rotation: RotationQuarterTurns;
  crop: CropRect;
  quality?: number;
}): Promise<CroppedLabelImage> {
  if (options.source.size > MAX_LABEL_IMAGE_BYTES) {
    throw new LabelImageTooLargeError(options.source.size);
  }

  const display = rotatedDisplaySize(
    options.sourceWidth,
    options.sourceHeight,
    options.rotation,
  );
  const crop = clampCropRect(options.crop, display.width, display.height);
  const out = cropOutputDimensions(crop);

  const bitmap = await createImageBitmap(options.source, {
    imageOrientation: "from-image",
  });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = out.width;
    canvas.height = out.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");

    context.save();
    // Map crop display origin → canvas origin, then apply inverse of display rotation.
    context.translate(-crop.x, -crop.y);
    applyDisplayRotationTransform(
      context,
      options.sourceWidth,
      options.sourceHeight,
      options.rotation,
    );
    context.drawImage(bitmap, 0, 0);
    context.restore();

    const blob = await canvasToJpegBlob(
      canvas,
      options.quality ?? LABEL_IMAGE_JPEG_QUALITY,
    );
    // Drop canvas pixel buffer as soon as encoded.
    canvas.width = 0;
    canvas.height = 0;

    return {
      blob,
      width: out.width,
      height: out.height,
      isProcessedCrop: true,
    };
  } finally {
    bitmap.close();
  }
}

function applyDisplayRotationTransform(
  context: CanvasRenderingContext2D,
  sourceWidth: number,
  sourceHeight: number,
  turns: RotationQuarterTurns,
): void {
  switch (turns) {
    case 0:
      break;
    case 1:
      context.translate(sourceHeight, 0);
      context.rotate(Math.PI / 2);
      break;
    case 2:
      context.translate(sourceWidth, sourceHeight);
      context.rotate(Math.PI);
      break;
    case 3:
      context.translate(0, sourceWidth);
      context.rotate(-Math.PI / 2);
      break;
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode cropped label image"));
      },
      "image/jpeg",
      quality,
    );
  });
}
