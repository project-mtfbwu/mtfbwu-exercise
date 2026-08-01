import type { UserMeasurementDefinitionView } from "@/modules/measurements/types";

export type MeasurementSideValues = {
  left?: string;
  right?: string;
  single?: string;
};

export function measurementValueKey(
  definitionId: string,
  side: "left" | "right" | "single",
) {
  return `${definitionId}:${side}`;
}

export function parseMeasurementValueKey(key: string): {
  definitionId: string;
  side: "left" | "right" | "single";
} {
  const [definitionId, side] = key.split(":");
  return {
    definitionId: definitionId!,
    side: side as "left" | "right" | "single",
  };
}

/** Builds server action values from form state, including left/right sides. */
export function buildMeasurementValuesFromForm(
  definitions: readonly UserMeasurementDefinitionView[],
  values: Record<string, string>,
) {
  const result: {
    userMeasurementDefinitionId: string;
    side: "left" | "right" | "not_applicable";
    value: number;
    unit: "cm" | "in" | "percent";
  }[] = [];

  for (const def of definitions) {
    const unit = def.unit as "cm" | "in" | "percent";
    if (def.sideMode === "left_right") {
      const left = values[measurementValueKey(def.id, "left")]?.trim();
      const right = values[measurementValueKey(def.id, "right")]?.trim();
      if (left) {
        result.push({
          userMeasurementDefinitionId: def.id,
          side: "left",
          value: Number(left),
          unit,
        });
      }
      if (right) {
        result.push({
          userMeasurementDefinitionId: def.id,
          side: "right",
          value: Number(right),
          unit,
        });
      }
      continue;
    }
    const single = values[measurementValueKey(def.id, "single")]?.trim();
    if (single) {
      result.push({
        userMeasurementDefinitionId: def.id,
        side: "not_applicable",
        value: Number(single),
        unit,
      });
    }
  }

  return result;
}

export function hasAnyMeasurementInput(
  definitions: readonly UserMeasurementDefinitionView[],
  values: Record<string, string>,
): boolean {
  return buildMeasurementValuesFromForm(definitions, values).length > 0;
}
