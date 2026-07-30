import { describe, expect, it } from "vitest";

import { expandUpcEToUpcA, isProductLookupBarcode, normalizeBarcode } from "./normalize";

describe("normalizeBarcode", () => {
  it("accepts a valid EAN-13 code unchanged", () => {
    expect(normalizeBarcode("3017620422003")).toEqual({
      ok: true,
      normalized: "3017620422003",
      format: "ean_13",
    });
  });

  it("accepts a valid EAN-8 code unchanged", () => {
    expect(normalizeBarcode("96385074")).toEqual({
      ok: true,
      normalized: "96385074",
      format: "ean_8",
    });
  });

  it("widens a valid UPC-A code to its 13-digit EAN equivalent", () => {
    expect(normalizeBarcode("036000291452")).toEqual({
      ok: true,
      normalized: "0036000291452",
      format: "upc_a",
    });
  });

  it("expands a valid UPC-E code through UPC-A to a 13-digit EAN equivalent", () => {
    // 0-12345-00006-5 is the canonical UPC-E <-> UPC-A conversion example.
    expect(normalizeBarcode("01234565", "upc_e")).toEqual({
      ok: true,
      normalized: "0012345000065",
      format: "upc_e",
    });
  });

  it("expands a 6-digit compressed UPC-E body without an explicit hint", () => {
    expect(normalizeBarcode("123456")).toEqual({
      ok: true,
      normalized: "0012345000065",
      format: "upc_e",
    });
  });

  it("preserves leading zeros through normalization", () => {
    const result = normalizeBarcode("036000291452");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.startsWith("00")).toBe(true);
      expect(result.normalized).toHaveLength(13);
    }
  });

  it("rejects a code with an invalid check digit", () => {
    expect(normalizeBarcode("3017620422001")).toEqual({
      ok: false,
      reason: "Invalid EAN-13 check digit",
    });
  });

  it("strips internal and surrounding whitespace before validating", () => {
    expect(normalizeBarcode("  3017 6204 22003  ")).toEqual({
      ok: true,
      normalized: "3017620422003",
      format: "ean_13",
    });
  });

  it("rejects QR payloads that are URLs rather than product codes", () => {
    expect(normalizeBarcode("https://example.com/p/3017620422003", "qr_code")).toEqual({
      ok: false,
      reason: "URLs are not product barcodes",
    });
  });

  it("rejects non-numeric, non-URL values", () => {
    expect(normalizeBarcode("ABC-not-a-barcode")).toEqual({
      ok: false,
      reason: "Barcode must contain only digits",
    });
  });

  it("rejects an empty value", () => {
    expect(normalizeBarcode("   ")).toEqual({
      ok: false,
      reason: "Barcode value is empty",
    });
  });

  it("passes numeric Code 128 payloads through without GS1 check-digit validation", () => {
    expect(normalizeBarcode("00123456789012", "code_128")).toEqual({
      ok: true,
      normalized: "00123456789012",
      format: "code_128",
    });
  });

  it("produces the same normalized value for the same product scanned as UPC-A or EAN-13", () => {
    // Regression guard for the scan-dedupe/lookup-cache flow: a duplicate
    // scan of the same physical barcode must resolve to an identical
    // normalized value even if a different symbology is detected each time.
    const asUpcA = normalizeBarcode("036000291452");
    const asEan13 = normalizeBarcode("0036000291452");
    expect(asUpcA.ok && asEan13.ok).toBe(true);
    if (asUpcA.ok && asEan13.ok) {
      expect(asUpcA.normalized).toBe(asEan13.normalized);
    }
  });
});

describe("expandUpcEToUpcA", () => {
  it("expands the canonical 8-digit example", () => {
    expect(expandUpcEToUpcA("01234565")).toBe("012345000065");
  });

  it("returns null when the provided check digit does not match", () => {
    expect(expandUpcEToUpcA("01234567")).toBeNull();
  });

  it("returns null for an invalid length", () => {
    expect(expandUpcEToUpcA("123")).toBeNull();
  });
});

describe("isProductLookupBarcode", () => {
  it("is true for standard numeric barcode formats", () => {
    expect(isProductLookupBarcode("3017620422003", "ean_13")).toBe(true);
    expect(isProductLookupBarcode("0036000291452", "upc_a")).toBe(true);
  });

  it("is true for a QR code whose payload is a plain numeric GTIN", () => {
    expect(isProductLookupBarcode("3017620422003", "qr_code")).toBe(true);
  });

  it("is false for a QR code whose payload is not numeric", () => {
    expect(isProductLookupBarcode("https://example.com/p/123", "qr_code")).toBe(false);
  });

  it("is false for a non-numeric value regardless of format", () => {
    expect(isProductLookupBarcode("ABC123", "code_128")).toBe(false);
  });

  it("is false for an unknown format", () => {
    expect(isProductLookupBarcode("3017620422003", "unknown")).toBe(false);
  });
});
