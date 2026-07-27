/**
 * Calculation values are represented as millionths of a displayed unit. This
 * keeps common decimal nutrition values stable without adding a decimal library.
 */
export const CALCULATION_SCALE = 1_000_000;

export function toScaled(value: number): number {
  assertFiniteNonNegative(value, "value");

  const scaled = Math.round(value * CALCULATION_SCALE);
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError("Value is too large for safe nutrition calculation.");
  }

  return scaled;
}

export function fromScaled(value: number): number {
  return value / CALCULATION_SCALE;
}

export function multiplyPer100g(amountPer100g: number, grams: number): number {
  assertFiniteNonNegative(grams, "grams");

  const scaledAmount = toScaled(amountPer100g);
  const scaledTotal = Math.round((scaledAmount * grams) / 100);
  if (!Number.isSafeInteger(scaledTotal)) {
    throw new RangeError("Nutrition calculation exceeds safe integer precision.");
  }

  return fromScaled(scaledTotal);
}

export function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number.`);
  }
}
