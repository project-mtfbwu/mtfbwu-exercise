import { describe, expect, it } from "vitest";
import { KG_PER_LB, kgToLb, lbToKg, normalizeLoadToKg } from "./index";

describe("unit conversion", () => {
  it("converts kilograms to pounds", () => {
    expect(kgToLb(100)).toBe(220.46);
    expect(kgToLb(1)).toBe(2.2);
  });

  it("converts pounds to kilograms", () => {
    expect(lbToKg(225)).toBe(102.06);
    expect(lbToKg(1)).toBe(0.45);
  });

  it("round-trips within rounding tolerance", () => {
    expect(lbToKg(kgToLb(100))).toBeCloseTo(100, 1);
    expect(kgToLb(lbToKg(225))).toBeCloseTo(225, 1);
  });

  it("uses the exact avoirdupois pound factor", () => {
    expect(KG_PER_LB).toBe(0.45359237);
  });

  it("rejects non-finite or negative values", () => {
    expect(() => kgToLb(-1)).toThrow(RangeError);
    expect(() => kgToLb(NaN)).toThrow(RangeError);
    expect(() => lbToKg(-1)).toThrow(RangeError);
    expect(() => lbToKg(Infinity)).toThrow(RangeError);
  });
});

describe("normalizeLoadToKg", () => {
  it("passes kilogram loads through unchanged", () => {
    expect(normalizeLoadToKg(100, "kg")).toBe(100);
  });

  it("converts pound loads to kilograms", () => {
    expect(normalizeLoadToKg(225, "lb")).toBe(102.06);
  });

  it("returns null for bodyweight units so the caller supplies bodyweight", () => {
    expect(normalizeLoadToKg(0, "bodyweight")).toBeNull();
    expect(normalizeLoadToKg(20, "assisted_bodyweight")).toBeNull();
  });

  it("rejects invalid numeric values for absolute units", () => {
    expect(() => normalizeLoadToKg(-10, "kg")).toThrow(RangeError);
    expect(() => normalizeLoadToKg(NaN, "lb")).toThrow(RangeError);
  });
});
