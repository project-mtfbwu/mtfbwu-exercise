import { describe, expect, it } from "vitest";
import { resolveMotionPreference, isMotionPreference } from "@/shared/providers/motion";

describe("motion preference resolution", () => {
  it("uses user override when set", () => {
    const result = resolveMotionPreference({
      userOverride: "off",
      prefersReducedMotion: true,
    });
    expect(result).toEqual({ preference: "off", source: "user" });
  });

  it("maps system reduced motion when no override", () => {
    const result = resolveMotionPreference({
      userOverride: null,
      prefersReducedMotion: true,
    });
    expect(result).toEqual({ preference: "reduced", source: "system" });
  });

  it("defaults to full", () => {
    const result = resolveMotionPreference({
      userOverride: null,
      prefersReducedMotion: false,
    });
    expect(result).toEqual({ preference: "full", source: "default" });
  });

  it("validates preference tokens", () => {
    expect(isMotionPreference("full")).toBe(true);
    expect(isMotionPreference("disabled")).toBe(false);
  });
});
