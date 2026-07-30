import { describe, expect, it } from "vitest";
import {
  LABEL_IMAGE_JPEG_QUALITY,
  MAX_LABEL_IMAGE_BYTES,
  MAX_LABEL_IMAGE_DIMENSION,
  scaleDimension,
} from "./preprocess";

describe("scaleDimension", () => {
  it("leaves dimensions untouched when already within the max", () => {
    expect(scaleDimension(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("leaves dimensions untouched when exactly at the max", () => {
    expect(scaleDimension(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("downscales a landscape image so the width matches the max", () => {
    // 3200x2400 -> longest side 3200 scales by 0.5 -> 1600x1200
    expect(scaleDimension(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("downscales a portrait image so the height matches the max", () => {
    // 2400x3200 -> longest side 3200 scales by 0.5 -> 1200x1600
    expect(scaleDimension(2400, 3200, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("downscales a square image proportionally", () => {
    expect(scaleDimension(4000, 4000, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it("never scales an image up", () => {
    expect(scaleDimension(400, 300, 1600)).toEqual({ width: 400, height: 300 });
  });

  it("rounds fractional results to whole pixels", () => {
    // 1000x777 -> longest side 1000 <= 1600, untouched, exercised for odd height
    expect(scaleDimension(1000, 777, 1600)).toEqual({ width: 1000, height: 777 });
    // 5000x777 -> scale 1600/5000 = 0.32 -> height 248.64 -> rounds to 249
    expect(scaleDimension(5000, 777, 1600)).toEqual({ width: 1600, height: 249 });
  });

  it("returns a zeroed, non-negative size for degenerate input", () => {
    expect(scaleDimension(0, 0, 1600)).toEqual({ width: 0, height: 0 });
    expect(scaleDimension(-10, 500, 1600)).toEqual({ width: 0, height: 500 });
  });
});

describe("preprocessing constants", () => {
  it("caps input size at 5MB", () => {
    expect(MAX_LABEL_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("caps the longest side at 1600px", () => {
    expect(MAX_LABEL_IMAGE_DIMENSION).toBe(1600);
  });

  it("re-encodes at ~0.85 JPEG quality", () => {
    expect(LABEL_IMAGE_JPEG_QUALITY).toBe(0.85);
  });
});
