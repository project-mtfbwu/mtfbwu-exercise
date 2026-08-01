import { describe, expect, it } from "vitest";
import { chartPointsFromDatedValues, chartTableRows } from "./line-chart";

describe("chartPointsFromDatedValues", () => {
  it("maps dated values to indexed chart points", () => {
    const points = chartPointsFromDatedValues([
      { localDate: "2026-01-01", value: 70 },
      { localDate: "2026-01-02", value: 71 },
    ]);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ x: 0, y: 70, label: "2026-01-01" });
    expect(points[1]!.x).toBe(1);
  });
});

describe("chartTableRows", () => {
  it("formats table fallback rows", () => {
    const rows = chartTableRows([{ localDate: "2026-01-01", value: 75 }], "kg");
    expect(rows[0]).toEqual({ date: "2026-01-01", value: "75 kg" });
  });
});
