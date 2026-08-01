/** Exact international avoirdupois pound-to-kilogram factor. */
export const KG_PER_LB = 0.45359237;

/** Exact inch-to-centimeter factor. */
export const CM_PER_IN = 2.54;

export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";
export type PercentUnit = "percent";
export type MeasurementUnit = WeightUnit | LengthUnit | PercentUnit;

export function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number.`);
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function kgToLb(kg: number): number {
  assertFiniteNonNegative(kg, "kg");
  return roundTo(kg / KG_PER_LB, 2);
}

export function lbToKg(lb: number): number {
  assertFiniteNonNegative(lb, "lb");
  return roundTo(lb * KG_PER_LB, 2);
}

export function cmToIn(cm: number): number {
  assertFiniteNonNegative(cm, "cm");
  return roundTo(cm / CM_PER_IN, 2);
}

export function inToCm(inches: number): number {
  assertFiniteNonNegative(inches, "in");
  return roundTo(inches * CM_PER_IN, 2);
}

/** Normalizes a weight reading to kilograms. */
export function normalizeWeightToKg(value: number, unit: WeightUnit): number {
  assertFiniteNonNegative(value, "weight");
  if (unit === "kg") {
    if (value > 500) throw new RangeError("weight exceeds maximum kg (500).");
    return roundTo(value, 2);
  }
  if (value > 1100) throw new RangeError("weight exceeds maximum lb (1100).");
  return lbToKg(value);
}

/** Normalizes a length reading to centimeters. */
export function normalizeLengthToCm(value: number, unit: LengthUnit): number {
  assertFiniteNonNegative(value, "length");
  const normalized = unit === "cm" ? value : inToCm(value);
  if (normalized > 300) throw new RangeError("length exceeds maximum cm (300).");
  return roundTo(normalized, 2);
}

/** Percent values are stored as-is (0–100). */
export function normalizePercent(value: number): number {
  assertFiniteNonNegative(value, "percent");
  if (value > 100) throw new RangeError("percent exceeds maximum (100).");
  return roundTo(value, 2);
}

export function normalizeMeasurementValue(value: number, unit: MeasurementUnit): number {
  switch (unit) {
    case "kg":
    case "lb":
      return normalizeWeightToKg(value, unit);
    case "cm":
    case "in":
      return normalizeLengthToCm(value, unit);
    case "percent":
      return normalizePercent(value);
    default: {
      const _exhaustive: never = unit;
      throw new RangeError(`Unsupported unit: ${_exhaustive}`);
    }
  }
}

export function displayWeight(kg: number, unitsSystem: "metric" | "imperial"): string {
  if (unitsSystem === "imperial") return `${kgToLb(kg)} lb`;
  return `${roundTo(kg, 1)} kg`;
}

export function displayLength(cm: number, unitsSystem: "metric" | "imperial"): string {
  if (unitsSystem === "imperial") return `${cmToIn(cm)} in`;
  return `${roundTo(cm, 1)} cm`;
}
