import { describe, expect, it } from "vitest";
import {
  CM_PER_IN,
  KG_PER_LB,
  cmToIn,
  displayLength,
  displayWeight,
  inToCm,
  kgToLb,
  lbToKg,
  normalizeLengthToCm,
  normalizeMeasurementValue,
  normalizePercent,
  normalizeWeightToKg,
} from "./units";

describe("weight conversion", () => {
  it("converts kilograms to pounds", () => {
    expect(kgToLb(100)).toBe(220.46);
    expect(kgToLb(1)).toBe(2.2);
  });

  it("converts pounds to kilograms", () => {
    expect(lbToKg(225)).toBe(102.06);
    expect(lbToKg(1)).toBe(0.45);
  });

  it("uses the exact avoirdupois pound factor", () => {
    expect(KG_PER_LB).toBe(0.45359237);
  });

  it("rejects non-finite or negative weight values", () => {
    expect(() => kgToLb(-1)).toThrow(RangeError);
    expect(() => lbToKg(NaN)).toThrow(RangeError);
  });
});

describe("length conversion", () => {
  it("converts centimeters to inches", () => {
    expect(cmToIn(2.54)).toBe(1);
    expect(cmToIn(100)).toBe(39.37);
  });

  it("converts inches to centimeters", () => {
    expect(inToCm(1)).toBe(2.54);
    expect(CM_PER_IN).toBe(2.54);
  });

  it("rejects negative length values", () => {
    expect(() => cmToIn(-1)).toThrow(RangeError);
    expect(() => inToCm(-5)).toThrow(RangeError);
  });
});

describe("normalizeWeightToKg", () => {
  it("passes kg through with rounding", () => {
    expect(normalizeWeightToKg(75.555, "kg")).toBe(75.56);
  });

  it("converts lb to kg", () => {
    expect(normalizeWeightToKg(220, "lb")).toBe(99.79);
  });

  it("rejects out-of-range values", () => {
    expect(() => normalizeWeightToKg(600, "kg")).toThrow(RangeError);
    expect(() => normalizeWeightToKg(1200, "lb")).toThrow(RangeError);
  });
});

describe("normalizeLengthToCm", () => {
  it("passes cm through", () => {
    expect(normalizeLengthToCm(80, "cm")).toBe(80);
  });

  it("converts inches to cm", () => {
    expect(normalizeLengthToCm(32, "in")).toBe(81.28);
  });

  it("rejects values above 300 cm normalized", () => {
    expect(() => normalizeLengthToCm(400, "cm")).toThrow(RangeError);
  });
});

describe("normalizePercent", () => {
  it("accepts valid percent", () => {
    expect(normalizePercent(22.5)).toBe(22.5);
  });

  it("rejects above 100", () => {
    expect(() => normalizePercent(101)).toThrow(RangeError);
  });
});

describe("normalizeMeasurementValue", () => {
  it("routes by unit", () => {
    expect(normalizeMeasurementValue(180, "lb")).toBe(81.65);
    expect(normalizeMeasurementValue(30, "in")).toBe(76.2);
    expect(normalizeMeasurementValue(15, "percent")).toBe(15);
  });
});

describe("display helpers", () => {
  it("formats weight for metric and imperial", () => {
    expect(displayWeight(75, "metric")).toBe("75 kg");
    expect(displayWeight(75, "imperial")).toContain("lb");
  });

  it("formats length for metric and imperial", () => {
    expect(displayLength(80, "metric")).toBe("80 cm");
    expect(displayLength(80, "imperial")).toContain("in");
  });
});
