import { describe, expect, it } from "vitest";
import {
  energyConsistencyDiffRatio,
  macroEnergyApprox,
  parseLabelText,
} from "./parse-label";
import type { ExtractedNutritionField, NutritionFieldKey } from "./types";

function byField(fields: ExtractedNutritionField[], key: NutritionFieldKey) {
  return fields.find((f) => f.field === key);
}

// US-style "Nutrition Facts" panel: a single per-serving column, no
// explicit "per 100g" heading anywhere.
const US_STYLE_LABEL = `
Nutrition Facts
Serving Size 30 g
Servings Per Container 12
Amount Per Serving
Calories 120
Total Fat 4g
Saturated Fat 0.5g
Sodium 140mg
Total Carbohydrate 18g
Dietary Fiber 2g
Sugars 6g
Protein 3g
`;

// EU-style panel: single "Per 100g" column, kcal and kJ both printed for
// energy, sodium printed in grams (needs mg conversion).
const EU_STYLE_LABEL = `
Nutrition Information
Typical Values Per 100g
Energy 1680kJ / 402kcal
Fat 20.0g
of which saturates 12.5g
Carbohydrate 56.0g
of which sugars 50.0g
Fibre 2.5g
Protein 6.0g
Sodium 0.5g
`;

// Per-100g panel where energy is only printed in kJ, requiring conversion.
// Macros are chosen to be roughly consistent with the converted calories.
const KJ_ONLY_LABEL = `
Per 100g
Energy 1046kJ
Protein 10g
Carbohydrate 40g
Fat 5g
`;

// Per-100g panel with a printed energy value that is wildly inconsistent
// with the macros (simulating an OCR misread of the calorie figure).
const INCONSISTENT_ENERGY_LABEL = `
Per 100g
Energy 100kcal
Protein 20g
Carbohydrate 20g
Fat 20g
`;

// A flattened two-column table (per-100g and per-serving side by side) —
// OCR often loses the column structure and prints both numbers on one line.
const DUAL_COLUMN_LABEL = `
Nutrition Information
Per 100g Per Serving (30g)
Energy 1680kJ 402kcal 504kJ 120kcal
Protein 6.5g 2.0g
Carbohydrate 56.0g 16.8g
Fat 20.0g 6.0g
`;

describe("parseLabelText - US-style per-serving label", () => {
  const fields = parseLabelText(US_STYLE_LABEL);

  it("extracts serving size", () => {
    const serving = byField(fields, "serving_size_g");
    expect(serving).toMatchObject({ value: 30, unit: "g" });
  });

  it("resolves basis to per_serving from the 'Amount Per Serving' heading", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.basis).toBe("per_serving");
    expect(energy?.value).toBe(120);
    expect(energy?.confidence).toBeGreaterThan(0.8);
  });

  it("extracts all core macros at high confidence", () => {
    expect(byField(fields, "fat_g")).toMatchObject({ value: 4, basis: "per_serving" });
    expect(byField(fields, "saturated_fat_g")).toMatchObject({
      value: 0.5,
      basis: "per_serving",
    });
    expect(byField(fields, "sodium_mg")).toMatchObject({
      value: 140,
      basis: "per_serving",
    });
    expect(byField(fields, "carbohydrate_g")).toMatchObject({
      value: 18,
      basis: "per_serving",
    });
    expect(byField(fields, "fiber_g")).toMatchObject({ value: 2, basis: "per_serving" });
    expect(byField(fields, "sugar_g")).toMatchObject({ value: 6, basis: "per_serving" });
    expect(byField(fields, "protein_g")).toMatchObject({
      value: 3,
      basis: "per_serving",
    });
  });

  it("does not flag an energy consistency warning when macros agree", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.warnings).toHaveLength(0);
  });
});

describe("parseLabelText - EU-style per-100g label", () => {
  const fields = parseLabelText(EU_STYLE_LABEL);

  it("resolves basis to per_100g from the heading", () => {
    expect(byField(fields, "protein_g")?.basis).toBe("per_100g");
  });

  it("prefers the printed kcal value over converting the kJ value", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.value).toBe(402);
    expect(energy?.warnings).toHaveLength(0);
  });

  it("extracts 'of which' sub-nutrients", () => {
    expect(byField(fields, "saturated_fat_g")).toMatchObject({ value: 12.5 });
    expect(byField(fields, "sugar_g")).toMatchObject({ value: 50.0 });
  });

  it("converts sodium given in grams to milligrams", () => {
    expect(byField(fields, "sodium_mg")).toMatchObject({ value: 500, unit: "mg" });
  });
});

describe("parseLabelText - kJ-only energy requires conversion", () => {
  const fields = parseLabelText(KJ_ONLY_LABEL);

  it("converts kJ to kcal by dividing by 4.184 and warns about the estimate", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.value).toBeCloseTo(250, 1);
    expect(energy?.basis).toBe("per_100g");
    expect(energy?.warnings.join(" ")).toMatch(/kJ.*4\.184/);
    expect(energy?.confidence).toBeLessThan(0.9);
  });
});

describe("parseLabelText - printed energy inconsistent with macros", () => {
  const fields = parseLabelText(INCONSISTENT_ENERGY_LABEL);

  it("flags the energy field when the macro estimate differs by more than 20%", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.value).toBe(100);
    expect(
      energy?.warnings.some((w) => /differs from the macro-based estimate/.test(w)),
    ).toBe(true);
  });

  it("lowers confidence once a consistency mismatch is detected", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.confidence).toBeLessThan(0.9);
  });
});

describe("parseLabelText - ambiguous dual-column table", () => {
  const fields = parseLabelText(DUAL_COLUMN_LABEL);

  it("does not guess a basis for a line with two values of the same unit", () => {
    for (const key of ["energy_kcal", "protein_g", "carbohydrate_g", "fat_g"] as const) {
      const field = byField(fields, key);
      expect(field?.basis).toBe("unknown");
      expect(field?.confidence).toBeLessThanOrEqual(0.3);
      expect(field?.warnings.length).toBeGreaterThan(0);
    }
  });

  it("still surfaces a value (the first column) for manual review", () => {
    expect(byField(fields, "energy_kcal")?.value).toBe(402);
    expect(byField(fields, "protein_g")?.value).toBe(6.5);
    expect(byField(fields, "carbohydrate_g")?.value).toBe(56.0);
    expect(byField(fields, "fat_g")?.value).toBe(20.0);
  });

  it("skips the energy consistency check when basis is unknown", () => {
    const energy = byField(fields, "energy_kcal");
    expect(energy?.warnings.some((w) => /macro-based estimate/.test(w))).toBe(false);
  });
});

describe("parseLabelText - no heading present", () => {
  it("marks fields as basis unknown and warns when no heading is detected", () => {
    const fields = parseLabelText("Protein 5g\nFat 2g");
    const protein = byField(fields, "protein_g");
    expect(protein?.basis).toBe("unknown");
    expect(protein?.warnings.join(" ")).toMatch(/could not detect/i);
  });
});

describe("parseLabelText - malformed/empty input", () => {
  it("returns an empty array for text with no recognizable nutrients", () => {
    expect(parseLabelText("Ingredients: sugar, wheat flour, palm oil.")).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseLabelText("")).toEqual([]);
  });
});

describe("macroEnergyApprox", () => {
  it("applies Atwater factors (4/4/9 kcal per gram)", () => {
    expect(macroEnergyApprox(10, 20, 5)).toBe(10 * 4 + 20 * 4 + 5 * 9);
  });

  it("returns 0 for all-zero macros", () => {
    expect(macroEnergyApprox(0, 0, 0)).toBe(0);
  });
});

describe("energyConsistencyDiffRatio", () => {
  it("returns 0 when the printed value exactly matches the estimate", () => {
    expect(energyConsistencyDiffRatio(120, 3, 18, 4)).toBe(0);
  });

  it("returns a positive ratio when values diverge", () => {
    const ratio = energyConsistencyDiffRatio(100, 20, 20, 20);
    expect(ratio).toBeGreaterThan(0.2);
  });

  it("returns Infinity for a non-positive printed value", () => {
    expect(energyConsistencyDiffRatio(0, 10, 10, 10)).toBe(Infinity);
    expect(energyConsistencyDiffRatio(-5, 10, 10, 10)).toBe(Infinity);
  });
});
