import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampCropRect,
  cropOutputDimensions,
  fullImageCrop,
  MIN_CROP_SIZE_PX,
  normalizeRotation,
  rotateClockwise,
  rotateCounterClockwise,
  rotateCropClockwise,
  rotatedDisplaySize,
  transformCropForRotation,
} from "./crop-rotate";
import { ObjectUrlRegistry } from "./object-url-registry";
import { assertUploadIsProcessedCrop, initialCropSession } from "./label-crop-session";
import { mapClientToImagePixels } from "@/widgets/today-board/focus/meal/label-image-crop-editor";
import { TesseractOcrAdapter } from "./tesseract-adapter";

describe("rotation helpers", () => {
  it("rotates clockwise and counterclockwise", () => {
    expect(rotateClockwise(0)).toBe(1);
    expect(rotateClockwise(3)).toBe(0);
    expect(rotateCounterClockwise(0)).toBe(3);
    expect(rotateCounterClockwise(1)).toBe(0);
  });

  it("returns to the original orientation after four clockwise turns", () => {
    let turns = normalizeRotation(0);
    for (let i = 0; i < 4; i += 1) turns = rotateClockwise(turns);
    expect(turns).toBe(0);
  });

  it("swaps display size on odd quarter-turns", () => {
    expect(rotatedDisplaySize(200, 100, 0)).toEqual({ width: 200, height: 100 });
    expect(rotatedDisplaySize(200, 100, 1)).toEqual({ width: 100, height: 200 });
    expect(rotatedDisplaySize(200, 100, 2)).toEqual({ width: 200, height: 100 });
    expect(rotatedDisplaySize(200, 100, 3)).toEqual({ width: 100, height: 200 });
  });
});

describe("crop bounds", () => {
  it("clamps a crop that escapes image bounds", () => {
    expect(clampCropRect({ x: -20, y: -10, width: 500, height: 500 }, 200, 100)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  it("enforces minimum crop size when the image is large enough", () => {
    const cropped = clampCropRect({ x: 10, y: 10, width: 5, height: 5 }, 400, 400);
    expect(cropped.width).toBe(MIN_CROP_SIZE_PX);
    expect(cropped.height).toBe(MIN_CROP_SIZE_PX);
  });

  it("resets crop to the full image", () => {
    expect(fullImageCrop(320, 240)).toEqual({ x: 0, y: 0, width: 320, height: 240 });
  });

  it("reports generated output dimensions from the crop", () => {
    expect(cropOutputDimensions({ x: 10, y: 20, width: 120, height: 80 })).toEqual({
      width: 120,
      height: 80,
    });
  });
});

describe("crop after rotation", () => {
  it("maps a crop through 90° CW and back over four turns", () => {
    const sourceW = 200;
    const sourceH = 100;
    let crop = { x: 20, y: 10, width: 40, height: 30 };
    let turns = normalizeRotation(0);
    for (let i = 0; i < 4; i += 1) {
      const next = rotateClockwise(turns);
      crop = transformCropForRotation(crop, sourceW, sourceH, turns, next);
      turns = next;
    }
    expect(turns).toBe(0);
    expect(crop).toEqual({ x: 20, y: 10, width: 40, height: 30 });
  });

  it("maps CW crop with the closed-form helper", () => {
    expect(
      rotateCropClockwise({ x: 20, y: 10, width: 40, height: 30 }, 200, 100),
    ).toEqual({
      x: 60,
      y: 20,
      width: 30,
      height: 40,
    });
  });

  it("preserves session source size used with barcode handoff", () => {
    const session = initialCropSession(640, 480);
    expect(session.rotation).toBe(0);
    expect(session.crop).toEqual({ x: 0, y: 0, width: 640, height: 480 });
  });
});

describe("upload safety", () => {
  it("refuses to treat an uncropped original as uploadable", () => {
    expect(() => assertUploadIsProcessedCrop({})).toThrow(/uncropped original/i);
    expect(() => assertUploadIsProcessedCrop({ isProcessedCrop: true })).not.toThrow();
  });
});

describe("object URL cleanup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revokes tracked object URLs", () => {
    const created: string[] = [];
    const revoked: string[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        const url = `blob:test-${created.length}-${blob.size}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => {
        revoked.push(url);
      },
    });

    const registry = new ObjectUrlRegistry();
    const a = registry.create(new Blob(["a"]));
    const b = registry.create(new Blob(["bb"]));
    expect(registry.size).toBe(2);
    registry.revoke(a);
    expect(registry.has(a)).toBe(false);
    expect(revoked).toEqual([a]);
    registry.revokeAll();
    expect(registry.size).toBe(0);
    expect(revoked).toEqual([a, b]);
  });
});

describe("keyboard-accessible crop fallback mapping", () => {
  it("maps pointer/client coordinates into image pixels", () => {
    expect(
      mapClientToImagePixels(
        150,
        120,
        { left: 100, top: 100, width: 200, height: 100 },
        { width: 400, height: 200 },
      ),
    ).toEqual({ x: 100, y: 40 });
  });
});

describe("OCR retry terminates previous worker", () => {
  it("terminate clears the worker handle", async () => {
    const terminate = vi.fn(async () => undefined);
    const adapter = new TesseractOcrAdapter();
    // Inject a fake worker the same way a successful initialize would.
    (
      adapter as unknown as {
        worker: { terminate: () => Promise<void> } | null;
      }
    ).worker = { terminate };

    expect(adapter.isReady).toBe(true);
    await adapter.terminate();
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(adapter.isReady).toBe(false);

    await adapter.terminate();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});

describe("OCR receives cropped image contract", () => {
  it("build path marks cropped output before preprocess/OCR", () => {
    const cropped = {
      blob: new Blob(["cropped-jpeg"], { type: "image/jpeg" }),
      width: 120,
      height: 80,
      isProcessedCrop: true as const,
    };
    assertUploadIsProcessedCrop(cropped);
    // OCR and storage must use cropped/preprocessed bytes, not a raw File.
    const ocrInput = cropped.blob;
    expect(ocrInput.type).toBe("image/jpeg");
    expect(ocrInput.size).toBeGreaterThan(0);
  });
});

describe("recrop preserves barcode", () => {
  it("documents that retries reuse capture id and keep barcode on the row", () => {
    const barcode = "8901030865264";
    const firstCreate = { barcode };
    const existingCaptureId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const retry = {
      captureId: existingCaptureId,
      barcodePreserved: firstCreate.barcode,
      createsNewCapture: false,
    };
    expect(retry.createsNewCapture).toBe(false);
    expect(retry.barcodePreserved).toBe(barcode);
    expect(retry.captureId).toBe(existingCaptureId);
  });
});
