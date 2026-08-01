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
} from "@/modules/nutrition/ocr/crop-rotate";
import {
  assertUploadIsProcessedProgressPhoto,
  initialProgressCropSession,
  ObjectUrlRegistry,
  sha256Hex,
} from "./progress-crop-session";
import { mapClientToImagePixels } from "@/widgets/progress/progress-photo-crop-editor";

describe("rotation helpers (progress crop session)", () => {
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
  });
});

describe("crop bounds (progress crop session)", () => {
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

describe("crop after rotation (progress crop session)", () => {
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

  it("initializes a full-frame session", () => {
    const session = initialProgressCropSession(640, 480);
    expect(session.rotation).toBe(0);
    expect(session.crop).toEqual({ x: 0, y: 0, width: 640, height: 480 });
  });
});

describe("upload safety (progress crop session)", () => {
  it("refuses to treat an uncropped original as uploadable", () => {
    expect(() => assertUploadIsProcessedProgressPhoto({})).toThrow(/uncropped original/i);
    expect(() =>
      assertUploadIsProcessedProgressPhoto({ isProcessedProgressPhoto: true }),
    ).not.toThrow();
  });
});

describe("object URL cleanup (progress crop session)", () => {
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

describe("keyboard-accessible crop fallback mapping (progress)", () => {
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

describe("sha256Hex", () => {
  it("hashes blob bytes", async () => {
    const blob = {
      arrayBuffer: async () => new TextEncoder().encode("hello").buffer,
    } as unknown as Blob;
    const digest = await sha256Hex(blob);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("buildProcessedProgressPhotoFromCropSession", () => {
  it("documents processed marker contract before upload", () => {
    assertUploadIsProcessedProgressPhoto({ isProcessedProgressPhoto: true });
    expect(() => assertUploadIsProcessedProgressPhoto({})).toThrow(/uncropped original/i);
  });
});
