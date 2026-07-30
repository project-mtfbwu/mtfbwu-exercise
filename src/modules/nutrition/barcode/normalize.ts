import type { BarcodeFormat } from "./types";

export type NormalizeBarcodeResult =
  { ok: true; normalized: string; format: BarcodeFormat } | { ok: false; reason: string };

const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;
const DIGITS_ONLY = /^\d+$/;

/**
 * Computes the standard GS1 modulo-10 check digit for a run of data digits
 * (i.e. the full code minus its own check digit). The digit adjacent to the
 * check digit (the rightmost data digit) is always weighted 3, alternating
 * leftward — this single rule covers EAN-13, EAN-8, and UPC-A regardless of
 * their differing lengths.
 */
function gs1CheckDigit(dataDigits: string): number {
  let sum = 0;
  for (let i = 0; i < dataDigits.length; i++) {
    const digit = Number(dataDigits[dataDigits.length - 1 - i]);
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(fullDigits: string): boolean {
  if (fullDigits.length < 2) return false;
  const data = fullDigits.slice(0, -1);
  const check = Number(fullDigits[fullDigits.length - 1]);
  return gs1CheckDigit(data) === check;
}

/**
 * Expands a compressed UPC-E code into its 12-digit UPC-A equivalent.
 * Accepts 8 digits (system digit + 6-digit body + check digit), 7 digits
 * (system digit + body, check digit recomputed), or 6 digits (body only,
 * system digit assumed to be "0", check digit recomputed).
 *
 * See the GS1 UPC-E zero-suppression rules: expansion depends on the last
 * digit of the 6-digit body.
 */
export function expandUpcEToUpcA(upcE: string): string | null {
  let systemDigit: string;
  let body: string;
  let providedCheckDigit: string | null = null;

  if (upcE.length === 8) {
    systemDigit = upcE[0]!;
    body = upcE.slice(1, 7);
    providedCheckDigit = upcE[7]!;
  } else if (upcE.length === 7) {
    systemDigit = upcE[0]!;
    body = upcE.slice(1);
  } else if (upcE.length === 6) {
    systemDigit = "0";
    body = upcE;
  } else {
    return null;
  }
  if (systemDigit !== "0" && systemDigit !== "1") return null;

  const [d1, d2, d3, d4, d5, d6] = body;
  let upcABody: string;
  switch (d6) {
    case "0":
    case "1":
    case "2":
      upcABody = `${systemDigit}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
      break;
    case "3":
      upcABody = `${systemDigit}${d1}${d2}${d3}00000${d4}${d5}`;
      break;
    case "4":
      upcABody = `${systemDigit}${d1}${d2}${d3}${d4}00000${d5}`;
      break;
    default:
      upcABody = `${systemDigit}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
      break;
  }

  const checkDigit = gs1CheckDigit(upcABody);
  if (providedCheckDigit !== null && Number(providedCheckDigit) !== checkDigit) {
    return null;
  }
  return `${upcABody}${checkDigit}`;
}

function tryExpandUpcE(stripped: string): NormalizeBarcodeResult {
  const upcA = expandUpcEToUpcA(stripped);
  if (!upcA) return { ok: false, reason: "Invalid UPC-E barcode" };
  return { ok: true, normalized: `0${upcA}`, format: "upc_e" };
}

/**
 * Normalizes a raw scanned/typed barcode value into a canonical numeric
 * string suitable for product lookups, plus the detected symbology.
 *
 * UPC-A and UPC-E values are widened to their 13-digit EAN equivalent (GS1's
 * standard GTIN-13 representation) so that the same physical product scanned
 * via different symbologies always resolves to the same `normalized` value.
 * `format` still reflects the originally scanned symbology.
 *
 * `formatHint` should be supplied when the scanner already identified the
 * symbology (e.g. from `BarcodeDetector` or zxing), since digit length alone
 * cannot distinguish UPC-E from EAN-8 (both can be 8 digits) or from
 * Code 128 (arbitrary numeric length, no GS1 check digit).
 */
export function normalizeBarcode(
  raw: string,
  formatHint?: BarcodeFormat,
): NormalizeBarcodeResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Barcode value must be a string" };
  }
  const stripped = raw.replace(/\s+/g, "");
  if (stripped.length === 0) {
    return { ok: false, reason: "Barcode value is empty" };
  }
  if (URL_LIKE.test(stripped)) {
    return { ok: false, reason: "URLs are not product barcodes" };
  }
  if (!DIGITS_ONLY.test(stripped)) {
    return { ok: false, reason: "Barcode must contain only digits" };
  }

  if (formatHint === "code_128") {
    return { ok: true, normalized: stripped, format: "code_128" };
  }

  if (
    formatHint === "upc_e" &&
    (stripped.length === 6 || stripped.length === 7 || stripped.length === 8)
  ) {
    return tryExpandUpcE(stripped);
  }

  switch (stripped.length) {
    case 6:
    case 7:
      // No standard symbology other than compressed UPC-E produces 6-7
      // numeric digits, so infer it even without an explicit hint.
      return tryExpandUpcE(stripped);
    case 8:
      if (!hasValidCheckDigit(stripped)) {
        return { ok: false, reason: "Invalid EAN-8 check digit" };
      }
      return { ok: true, normalized: stripped, format: "ean_8" };
    case 12:
      if (!hasValidCheckDigit(stripped)) {
        return { ok: false, reason: "Invalid UPC-A check digit" };
      }
      return { ok: true, normalized: `0${stripped}`, format: "upc_a" };
    case 13:
      if (!hasValidCheckDigit(stripped)) {
        return { ok: false, reason: "Invalid EAN-13 check digit" };
      }
      return { ok: true, normalized: stripped, format: "ean_13" };
    default:
      return { ok: false, reason: `Unsupported barcode length: ${stripped.length}` };
  }
}

const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

/**
 * Returns whether a normalized value/format pair is usable for a product
 * catalog lookup. QR codes and data matrix payloads are only usable when
 * their content is itself a plain numeric GTIN-like string (as opposed to a
 * URL or arbitrary text payload).
 */
export function isProductLookupBarcode(
  normalized: string,
  format: BarcodeFormat,
): boolean {
  if (!DIGITS_ONLY.test(normalized)) return false;
  if (format === "qr_code" || format === "data_matrix") {
    return GTIN_LENGTHS.has(normalized.length);
  }
  return format !== "unknown";
}
