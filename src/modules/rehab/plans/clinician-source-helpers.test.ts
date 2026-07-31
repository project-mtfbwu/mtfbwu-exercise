import { describe, expect, it } from "vitest";
import {
  CLINICIAN_PROVENANCE_WARNING,
  clinicianSourceUnconfirmedLabel,
} from "./clinician-source-helpers";

describe("clinicianSourceUnconfirmedLabel", () => {
  it("returns null when the user confirmed the source", () => {
    expect(clinicianSourceUnconfirmedLabel({ confirmedByUser: true })).toBeNull();
  });

  it("returns an unconfirmed label when not confirmed", () => {
    expect(clinicianSourceUnconfirmedLabel({ confirmedByUser: false })).toMatch(
      /unconfirmed/i,
    );
  });
});

describe("CLINICIAN_PROVENANCE_WARNING", () => {
  it("states that provenance is not verification", () => {
    expect(CLINICIAN_PROVENANCE_WARNING.toLowerCase()).toContain("does not verify");
  });
});
