import type {
  ExtractedNutritionField,
  NutritionFieldBasis,
  NutritionFieldKey,
} from "./types";

/**
 * Deterministic (non-AI) parser for English nutrition label OCR text. Runs
 * line by line and never invents a basis it cannot see evidence for: a
 * heading like "Per 100g" / "Amount Per Serving" sets the basis for
 * subsequent lines, and a line with more than one plausible value for the
 * same nutrient (a flattened two-column table) is flagged `basis: "unknown"`
 * with low confidence rather than guessed at.
 *
 * Note: the number matcher treats `.` and `,` as decimal separators, not
 * thousands separators (e.g. "1,680" is misread as 1.68). Real labels in
 * this value range essentially never use a thousands separator here, so
 * this is an accepted limitation rather than something worth the added
 * complexity to special-case.
 */

const VALUE_UNIT_PATTERN = /(\d+(?:[.,]\d+)?)\s*(kcal|kj|mg|ml|g)\b/gi;

const NO_HEADING_WARNING =
  "Could not detect a 'per 100g' or 'per serving' heading before this value; basis is unconfirmed.";

type ValueUnitMatch = { raw: string; value: number; unit: string };

function findValueUnitMatches(segment: string): ValueUnitMatch[] {
  const matches: ValueUnitMatch[] = [];
  for (const match of segment.matchAll(VALUE_UNIT_PATTERN)) {
    const numberText = match[1];
    const unitText = match[2];
    if (!numberText || !unitText) continue;
    const value = Number(numberText.replace(",", "."));
    if (!Number.isFinite(value)) continue;
    matches.push({ raw: match[0].trim(), value, unit: unitText.toLowerCase() });
  }
  return matches;
}

function detectSectionBasis(line: string): NutritionFieldBasis | null {
  const lower = line.toLowerCase();
  const hasPer100 = /per\s*100\s*(g|ml)\b|\/\s*100\s*(g|ml)\b/.test(lower);
  const hasPerServing = /per\s*serving\b|amount\s*per\s*serving\b/.test(lower);
  if (hasPer100 && !hasPerServing) return "per_100g";
  if (hasPerServing && !hasPer100) return "per_serving";
  // Both or neither: an ambiguous/absent heading. Line-level dual-value
  // detection below is what actually protects against guessing.
  return null;
}

function matchServingSize(line: string): ExtractedNutritionField | null {
  const match = line.match(/serving\s*size\D{0,20}?(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  const numberText = match?.[1];
  const unitText = match?.[2];
  if (!numberText || !unitText) return null;
  return {
    field: "serving_size_g",
    value: Number(numberText.replace(",", ".")),
    unit: unitText.toLowerCase(),
    basis: "unknown",
    sourceText: line,
    confidence: 0.85,
    warnings: [],
  };
}

function matchEnergyField(
  line: string,
  basis: NutritionFieldBasis,
  basisKnown: boolean,
): ExtractedNutritionField | null {
  if (!/energy|calories/i.test(line)) return null;

  const allMatches = findValueUnitMatches(line);
  const kcalMatches = allMatches.filter((m) => m.unit === "kcal");
  const kjMatches = allMatches.filter((m) => m.unit === "kj");

  if (kcalMatches.length > 1 || kjMatches.length > 1) {
    const allRaw = [...kcalMatches, ...kjMatches].map((m) => m.raw).join(", ");
    const first = kcalMatches[0] ?? kjMatches[0];
    if (!first) return null;
    const value = first.unit === "kcal" ? first.value : kjToKcal(first.value);
    return {
      field: "energy_kcal",
      value,
      unit: "kcal",
      basis: "unknown",
      sourceText: line,
      confidence: 0.25,
      warnings: [
        `Multiple energy values found (${allRaw}); could not determine which column is per 100g vs per serving. Please verify manually.`,
      ],
    };
  }

  if (kcalMatches.length === 1) {
    const match = kcalMatches[0]!;
    return {
      field: "energy_kcal",
      value: match.value,
      unit: "kcal",
      basis: basisKnown ? basis : "unknown",
      sourceText: line,
      confidence: basisKnown ? 0.9 : 0.6,
      warnings: basisKnown ? [] : [NO_HEADING_WARNING],
    };
  }

  if (kjMatches.length === 1) {
    const match = kjMatches[0]!;
    return {
      field: "energy_kcal",
      value: kjToKcal(match.value),
      unit: "kcal",
      basis: basisKnown ? basis : "unknown",
      sourceText: line,
      confidence: basisKnown ? 0.7 : 0.5,
      warnings: [
        `Energy given only in kJ (${match.raw}); kcal estimated by dividing by 4.184 — verify against the printed label.`,
        ...(basisKnown ? [] : [NO_HEADING_WARNING]),
      ],
    };
  }

  // Common US "Calories 120" format with no explicit unit token.
  const bareMatch = line.match(/calories\D{0,10}?(\d+(?:[.,]\d+)?)/i);
  const bareValue = bareMatch?.[1];
  if (bareValue) {
    return {
      field: "energy_kcal",
      value: Number(bareValue.replace(",", ".")),
      unit: "kcal",
      basis: basisKnown ? basis : "unknown",
      sourceText: line,
      confidence: basisKnown ? 0.85 : 0.6,
      warnings: basisKnown ? [] : [NO_HEADING_WARNING],
    };
  }

  return null;
}

function kjToKcal(kj: number): number {
  return Math.round((kj / 4.184) * 10) / 10;
}

type AcceptedUnit = { toCanonical: (value: number) => number };
type AcceptUnit = (unit: string) => AcceptedUnit | null;

const gramsOnly: AcceptUnit = (unit) => (unit === "g" ? { toCanonical: (v) => v } : null);

const sodiumUnit: AcceptUnit = (unit) => {
  if (unit === "mg") return { toCanonical: (v) => v };
  if (unit === "g") return { toCanonical: (v) => v * 1000 };
  return null;
};

type NutrientSpec = {
  field: Exclude<NutritionFieldKey, "serving_size_g" | "energy_kcal">;
  displayUnit: string;
  namePattern: RegExp;
  acceptUnit: AcceptUnit;
};

const NUTRIENT_SPECS: NutrientSpec[] = [
  // Checked before `fat_g` so "Saturated Fat"/"of which saturates" lines
  // aren't also swallowed by the more general fat pattern.
  {
    field: "saturated_fat_g",
    displayUnit: "g",
    namePattern: /saturat(?:ed|es)(?:\s+fat)?/i,
    acceptUnit: gramsOnly,
  },
  {
    field: "fat_g",
    displayUnit: "g",
    namePattern: /total\s+fat|\bfat\b/i,
    acceptUnit: gramsOnly,
  },
  {
    field: "fiber_g",
    displayUnit: "g",
    namePattern: /diet(?:ary)?\s*fib(?:er|re)|\bfib(?:er|re)\b/i,
    acceptUnit: gramsOnly,
  },
  { field: "sugar_g", displayUnit: "g", namePattern: /sugars?/i, acceptUnit: gramsOnly },
  {
    field: "protein_g",
    displayUnit: "g",
    namePattern: /proteins?/i,
    acceptUnit: gramsOnly,
  },
  {
    field: "carbohydrate_g",
    displayUnit: "g",
    namePattern: /total\s+carbohydrates?|carbohydrates?|\bcarbs?\b/i,
    acceptUnit: gramsOnly,
  },
  {
    field: "sodium_mg",
    displayUnit: "mg",
    namePattern: /sodium/i,
    acceptUnit: sodiumUnit,
  },
];

function fieldDisplayName(field: string): string {
  return field.replace(/_(g|mg)$/, "").replace(/_/g, " ");
}

function matchNutrientLine(
  line: string,
  spec: NutrientSpec,
  basis: NutritionFieldBasis,
  basisKnown: boolean,
): ExtractedNutritionField | null {
  const nameMatch = line.match(spec.namePattern);
  if (!nameMatch || nameMatch.index === undefined) return null;
  const remainder = line.slice(nameMatch.index + nameMatch[0].length);

  const candidates = findValueUnitMatches(remainder)
    .map((match) => {
      const accepted = spec.acceptUnit(match.unit);
      return accepted
        ? { ...match, canonicalValue: accepted.toCanonical(match.value) }
        : null;
    })
    .filter(
      (match): match is ValueUnitMatch & { canonicalValue: number } => match !== null,
    );

  if (candidates.length === 0) return null;

  if (candidates.length > 1) {
    const allRaw = candidates.map((c) => c.raw).join(", ");
    return {
      field: spec.field,
      value: candidates[0]!.canonicalValue,
      unit: spec.displayUnit,
      basis: "unknown",
      sourceText: line,
      confidence: 0.25,
      warnings: [
        `Multiple values found for ${fieldDisplayName(spec.field)} (${allRaw}); could not determine which column is per 100g vs per serving. Please verify manually.`,
      ],
    };
  }

  const only = candidates[0]!;
  return {
    field: spec.field,
    value: only.canonicalValue,
    unit: spec.displayUnit,
    basis: basisKnown ? basis : "unknown",
    sourceText: line,
    confidence: basisKnown ? 0.9 : 0.6,
    warnings: basisKnown ? [] : [NO_HEADING_WARNING],
  };
}

/** Rough Atwater-factor calorie estimate from macros, for consistency checks. */
export function macroEnergyApprox(
  proteinG: number,
  carbohydrateG: number,
  fatG: number,
): number {
  return proteinG * 4 + carbohydrateG * 4 + fatG * 9;
}

/**
 * Relative difference between the printed energy value and the
 * macro-derived estimate. Returns `Infinity` when `printedKcal` is not a
 * usable positive number (avoids a misleading divide-by-zero result).
 */
export function energyConsistencyDiffRatio(
  printedKcal: number,
  proteinG: number,
  carbohydrateG: number,
  fatG: number,
): number {
  if (!(printedKcal > 0)) return Infinity;
  const approxKcal = macroEnergyApprox(proteinG, carbohydrateG, fatG);
  return Math.abs(approxKcal - printedKcal) / printedKcal;
}

const ENERGY_CONSISTENCY_THRESHOLD = 0.2;

function applyEnergyConsistencyWarning(fields: ExtractedNutritionField[]): void {
  const firstByField = new Map<NutritionFieldKey, ExtractedNutritionField>();
  for (const field of fields) {
    if (!firstByField.has(field.field)) firstByField.set(field.field, field);
  }
  const energy = firstByField.get("energy_kcal");
  const protein = firstByField.get("protein_g");
  const carbs = firstByField.get("carbohydrate_g");
  const fat = firstByField.get("fat_g");
  if (!energy || !protein || !carbs || !fat) return;
  // Only compare values known to share the same basis — comparing an
  // ambiguous/unknown-basis value against another basis is meaningless.
  if (energy.basis === "unknown") return;
  if (
    energy.basis !== protein.basis ||
    energy.basis !== carbs.basis ||
    energy.basis !== fat.basis
  ) {
    return;
  }

  const diffRatio = energyConsistencyDiffRatio(
    energy.value,
    protein.value,
    carbs.value,
    fat.value,
  );
  if (diffRatio > ENERGY_CONSISTENCY_THRESHOLD) {
    const approxKcal = macroEnergyApprox(protein.value, carbs.value, fat.value);
    energy.warnings.push(
      `Printed energy (${energy.value} kcal) differs from the macro-based estimate ` +
        `(${Math.round(approxKcal)} kcal) by ${Math.round(diffRatio * 100)}% — check for an OCR misread.`,
    );
    energy.confidence = Math.round(energy.confidence * 0.8 * 100) / 100;
  }
}

/**
 * Parses raw OCR'd nutrition label text into a flat list of extracted
 * fields. Safe to call with messy/partial OCR output — unmatched lines are
 * silently skipped rather than throwing.
 */
export function parseLabelText(rawText: string): ExtractedNutritionField[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fields: ExtractedNutritionField[] = [];
  let currentBasis: NutritionFieldBasis = "per_100g";
  let basisKnown = false;

  for (const line of lines) {
    const heading = detectSectionBasis(line);
    if (heading) {
      currentBasis = heading;
      basisKnown = true;
    }

    const serving = matchServingSize(line);
    if (serving) {
      fields.push(serving);
      continue;
    }

    const energy = matchEnergyField(line, currentBasis, basisKnown);
    if (energy) {
      fields.push(energy);
      continue;
    }

    for (const spec of NUTRIENT_SPECS) {
      const field = matchNutrientLine(line, spec, currentBasis, basisKnown);
      if (field) {
        fields.push(field);
        break;
      }
    }
  }

  applyEnergyConsistencyWarning(fields);
  return fields;
}
