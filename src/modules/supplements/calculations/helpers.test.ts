import { describe, expect, it } from "vitest";
import {
  supplementChecklistForDate,
  supplementStatusLabel,
} from "@/modules/supplements/calculations/helpers";
import type { SupplementDaySummary } from "@/modules/supplements/types";

describe("supplementStatusLabel", () => {
  it("shows none configured", () => {
    const summary: SupplementDaySummary = {
      activeSupplements: [],
      intakes: [],
      takenCount: 0,
      skippedCount: 0,
      totalActive: 0,
    };
    expect(supplementStatusLabel(summary)).toBe("Supplements · none configured");
  });

  it("shows progress when partially marked", () => {
    const summary: SupplementDaySummary = {
      activeSupplements: [
        {
          id: "1",
          displayName: "D",
          supplementDefinitionId: null,
          customName: "D",
          brand: null,
          servingAmount: null,
          servingUnit: null,
          instructionsText: null,
          active: true,
        },
      ],
      intakes: [
        {
          id: "i1",
          userSupplementId: "1",
          localDate: "2026-08-01",
          takenAt: "",
          amount: null,
          unit: null,
          status: "taken",
          note: null,
        },
      ],
      takenCount: 1,
      skippedCount: 0,
      totalActive: 2,
    };
    summary.activeSupplements.push({ ...summary.activeSupplements[0]!, id: "2" });
    expect(supplementStatusLabel(summary)).toContain("1 of 2");
  });
});

describe("supplementChecklistForDate", () => {
  it("marks pending supplements", () => {
    const list = supplementChecklistForDate({
      activeSupplements: [
        {
          id: "1",
          displayName: "Vit D",
          supplementDefinitionId: null,
          customName: "Vit D",
          brand: null,
          servingAmount: null,
          servingUnit: null,
          instructionsText: null,
          active: true,
        },
      ],
      intakes: [],
      takenCount: 0,
      skippedCount: 0,
      totalActive: 1,
    });
    expect(list[0]?.status).toBe("pending");
  });
});
