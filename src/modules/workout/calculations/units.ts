import type { LoadUnit } from "./types";

/** Exact international avoirdupois pound-to-kilogram factor. */
export const KG_PER_LB = 0.45359237;

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

/**
 * Normalizes a recorded load to kilograms. `bodyweight` and
 * `assisted_bodyweight` carry no absolute load here — the caller must supply
 * the user's bodyweight separately and combine it with any added/assisted
 * weight, so this returns `null` for those units rather than guessing.
 */
export function normalizeLoadToKg(value: number, unit: LoadUnit): number | null {
  if (unit === "bodyweight" || unit === "assisted_bodyweight") return null;

  assertFiniteNonNegative(value, "value");
  return unit === "kg" ? value : lbToKg(value);
}
