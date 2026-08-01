import { describe, expect, it } from "vitest";
import {
  buildMeasurementValuesFromForm,
  measurementValueKey,
} from "./measurement-form-helpers";
import type { UserMeasurementDefinitionView } from "@/modules/measurements/types";

const leftRightDef: UserMeasurementDefinitionView = {
  id: "def-1",
  measurementDefinitionId: "cat-1",
  customName: null,
  unit: "cm",
  sideMode: "left_right",
  enabled: true,
  displayOrder: 0,
  displayName: "Upper arm",
  stableKey: "upper_arm",
};

const singleDef: UserMeasurementDefinitionView = {
  id: "def-2",
  measurementDefinitionId: "cat-2",
  customName: null,
  unit: "cm",
  sideMode: "not_applicable",
  enabled: true,
  displayOrder: 1,
  displayName: "Waist",
  stableKey: "waist",
};

describe("buildMeasurementValuesFromForm", () => {
  it("maps left and right sides separately", () => {
    const values = {
      [measurementValueKey("def-1", "left")]: "32",
      [measurementValueKey("def-1", "right")]: "33",
    };
    const built = buildMeasurementValuesFromForm([leftRightDef], values);
    expect(built).toHaveLength(2);
    expect(built[0]).toMatchObject({ side: "left", value: 32 });
    expect(built[1]).toMatchObject({ side: "right", value: 33 });
  });

  it("uses not_applicable for single-value measurements", () => {
    const values = { [measurementValueKey("def-2", "single")]: "80" };
    const built = buildMeasurementValuesFromForm([singleDef], values);
    expect(built).toEqual([
      {
        userMeasurementDefinitionId: "def-2",
        side: "not_applicable",
        value: 80,
        unit: "cm",
      },
    ]);
  });
});
