/**
 * Pure crop/rotate geometry for nutrition-label capture.
 * Coordinates are always in the *currently displayed* (rotated) pixel space.
 * No Canvas dependency — safe for Node/jsdom unit tests.
 */

export const MIN_CROP_SIZE_PX = 32;

/** Clockwise quarter-turns from the EXIF-upright source (0, 90, 180, 270). */
export type RotationQuarterTurns = 0 | 1 | 2 | 3;

export type ImageSize = { width: number; height: number };

/** Axis-aligned crop in displayed (rotated) image pixel coordinates. */
export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizeRotation(turns: number): RotationQuarterTurns {
  const mod = ((Math.trunc(turns) % 4) + 4) % 4;
  return mod as RotationQuarterTurns;
}

export function rotateClockwise(turns: RotationQuarterTurns): RotationQuarterTurns {
  return normalizeRotation(turns + 1);
}

export function rotateCounterClockwise(
  turns: RotationQuarterTurns,
): RotationQuarterTurns {
  return normalizeRotation(turns - 1);
}

/** Display size of a source image after `turns` clockwise quarter-turns. */
export function rotatedDisplaySize(
  sourceWidth: number,
  sourceHeight: number,
  turns: RotationQuarterTurns,
): ImageSize {
  return turns % 2 === 0
    ? { width: sourceWidth, height: sourceHeight }
    : { width: sourceHeight, height: sourceWidth };
}

export function fullImageCrop(width: number, height: number): CropRect {
  return {
    x: 0,
    y: 0,
    width: Math.max(0, Math.round(width)),
    height: Math.max(0, Math.round(height)),
  };
}

/**
 * Clamps a crop so it stays inside the image and meets the minimum size.
 * When the image itself is smaller than the minimum on an axis, the crop
 * spans that entire axis (best effort — caller should reject tiny sources).
 */
export function clampCropRect(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
  minSize: number = MIN_CROP_SIZE_PX,
): CropRect {
  const maxW = Math.max(0, Math.floor(imageWidth));
  const maxH = Math.max(0, Math.floor(imageHeight));
  const minW = Math.min(minSize, maxW);
  const minH = Math.min(minSize, maxH);

  let width = Math.round(crop.width);
  let height = Math.round(crop.height);
  width = Math.min(maxW, Math.max(minW, width));
  height = Math.min(maxH, Math.max(minH, height));

  let x = Math.round(crop.x);
  let y = Math.round(crop.y);
  x = Math.min(Math.max(0, x), Math.max(0, maxW - width));
  y = Math.min(Math.max(0, y), Math.max(0, maxH - height));

  return { x, y, width, height };
}

/**
 * Maps a crop rectangle from one display rotation to another so the same
 * source pixels remain selected (crop “stays on” the label content).
 */
export function transformCropForRotation(
  crop: CropRect,
  sourceWidth: number,
  sourceHeight: number,
  fromTurns: RotationQuarterTurns,
  toTurns: RotationQuarterTurns,
): CropRect {
  const from = normalizeRotation(fromTurns);
  const to = normalizeRotation(toTurns);
  if (from === to) {
    const size = rotatedDisplaySize(sourceWidth, sourceHeight, from);
    // Preserve geometry on no-op; do not expand to MIN_CROP_SIZE here.
    return clampCropRect(crop, size.width, size.height, 1);
  }

  let current = { ...crop };
  let turns = from;
  // Walk the shorter direction (at most 2 steps either way).
  const forward = (to - from + 4) % 4;
  const steps = forward <= 2 ? forward : forward - 4;
  const stepDir = steps >= 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(steps); i += 1) {
    const display = rotatedDisplaySize(sourceWidth, sourceHeight, turns);
    current =
      stepDir === 1
        ? rotateCropClockwise(current, display.width, display.height)
        : rotateCropCounterClockwise(current, display.width, display.height);
    turns = normalizeRotation(turns + stepDir);
  }
  const finalSize = rotatedDisplaySize(sourceWidth, sourceHeight, to);
  // Keep transformed geometry exact; UI clamps to MIN_CROP_SIZE_PX on edit.
  return clampCropRect(current, finalSize.width, finalSize.height, 1);
}

/** 90° CW: (x,y,w,h) on W×H → (H-y-h, x, h, w) on H×W. */
export function rotateCropClockwise(
  crop: CropRect,
  displayWidth: number,
  displayHeight: number,
): CropRect {
  void displayWidth;
  return {
    x: displayHeight - crop.y - crop.height,
    y: crop.x,
    width: crop.height,
    height: crop.width,
  };
}

/** 90° CCW: (x,y,w,h) on W×H → (y, W-x-w, h, w) on H×W. */
export function rotateCropCounterClockwise(
  crop: CropRect,
  displayWidth: number,
  displayHeight: number,
): CropRect {
  void displayHeight;
  return {
    x: crop.y,
    y: displayWidth - crop.x - crop.width,
    width: crop.height,
    height: crop.width,
  };
}

export function cropOutputDimensions(crop: CropRect): ImageSize {
  return {
    width: Math.max(0, Math.round(crop.width)),
    height: Math.max(0, Math.round(crop.height)),
  };
}

/**
 * Maps a point from displayed (rotated) space back to source (unrotated) space.
 * Used when rendering the crop with Canvas.
 */
export function displayPointToSource(
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
  turns: RotationQuarterTurns,
): { x: number; y: number } {
  switch (normalizeRotation(turns)) {
    case 0:
      return { x, y };
    case 1:
      // display (x,y) came from source (y, W-1-x) under CW rotation of the image
      return { x: y, y: sourceWidth - x };
    case 2:
      return { x: sourceWidth - x, y: sourceHeight - y };
    case 3:
      return { x: sourceHeight - y, y: x };
  }
}

/**
 * Source-space axis-aligned bounding box covering the display-space crop
 * after accounting for rotation. For 90° multiples the AABB equals the
 * rotated rectangle’s exact bounds.
 */
export function cropInSourceSpace(
  crop: CropRect,
  sourceWidth: number,
  sourceHeight: number,
  turns: RotationQuarterTurns,
): CropRect {
  const corners = [
    displayPointToSource(crop.x, crop.y, sourceWidth, sourceHeight, turns),
    displayPointToSource(crop.x + crop.width, crop.y, sourceWidth, sourceHeight, turns),
    displayPointToSource(crop.x, crop.y + crop.height, sourceWidth, sourceHeight, turns),
    displayPointToSource(
      crop.x + crop.width,
      crop.y + crop.height,
      sourceWidth,
      sourceHeight,
      turns,
    ),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return clampCropRect(
    {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    sourceWidth,
    sourceHeight,
    1,
  );
}
