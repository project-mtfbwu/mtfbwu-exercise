"use client";

import { useMemo, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { saveReviewedLabelProductAction } from "@/modules/nutrition/labels/actions";
import {
  energyConsistencyDiffRatio,
  macroEnergyApprox,
  type ExtractedNutritionField,
  type LabelReviewDraft,
  type LabelReviewFieldDraft,
  type NutritionFieldBasis,
  type NutritionFieldKey,
} from "@/modules/nutrition/ocr";
import type { MacroNutrients } from "@/modules/nutrition/calculations";

type ReviewNutrientKey = Exclude<NutritionFieldKey, "serving_size_g">;
type ResolvedBasis = Exclude<NutritionFieldBasis, "unknown">;

const REVIEW_FIELDS: ReadonlyArray<{
  key: ReviewNutrientKey;
  label: string;
  unit: string;
  required: boolean;
}> = [
  { key: "energy_kcal", label: "Calories", unit: "kcal", required: true },
  { key: "protein_g", label: "Protein", unit: "g", required: true },
  { key: "carbohydrate_g", label: "Carbohydrate", unit: "g", required: true },
  { key: "fat_g", label: "Fat", unit: "g", required: true },
  { key: "fiber_g", label: "Fiber", unit: "g", required: true },
  { key: "sugar_g", label: "Sugar", unit: "g", required: false },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g", required: false },
  { key: "sodium_mg", label: "Sodium", unit: "mg", required: false },
];

function firstFieldByKey(
  fields: readonly ExtractedNutritionField[],
): Partial<Record<NutritionFieldKey, ExtractedNutritionField>> {
  const map: Partial<Record<NutritionFieldKey, ExtractedNutritionField>> = {};
  for (const field of fields) {
    if (!map[field.field]) map[field.field] = field;
  }
  return map;
}

function resolveOverallBasis(fields: readonly ExtractedNutritionField[]): ResolvedBasis {
  let per100 = 0;
  let perServing = 0;
  for (const field of fields) {
    if (field.basis === "per_100g") per100 += 1;
    else if (field.basis === "per_serving") perServing += 1;
  }
  return perServing > per100 ? "per_serving" : "per_100g";
}

/**
 * Converts an extracted value to a per-100g basis. A field with its own
 * confirmed basis (from the parser's heading detection) always converts
 * using that basis; only ambiguous (`"unknown"`) fields fall back to the
 * reviewer-chosen overall basis.
 */
function convertToPer100g(
  value: number,
  fieldBasis: NutritionFieldBasis,
  resolvedBasis: ResolvedBasis,
  servingGrams: number | null,
): { value: number | null; warning?: string } {
  const effective = fieldBasis === "unknown" ? resolvedBasis : fieldBasis;
  if (effective === "per_100g") return { value };
  if (!servingGrams || servingGrams <= 0) {
    return {
      value: null,
      warning:
        "Could not convert this per-serving value to per 100 g without a serving size.",
    };
  }
  return { value: Math.round((value / servingGrams) * 100 * 100) / 100 };
}

function buildFieldDrafts(
  byKey: Partial<Record<NutritionFieldKey, ExtractedNutritionField>>,
  resolvedBasis: ResolvedBasis,
  servingGrams: number | null,
): Record<ReviewNutrientKey, LabelReviewFieldDraft> {
  const fields = {} as Record<ReviewNutrientKey, LabelReviewFieldDraft>;
  for (const spec of REVIEW_FIELDS) {
    const field = byKey[spec.key];
    if (!field) {
      fields[spec.key] = { value: null, confidence: 0, warnings: [], edited: false };
      continue;
    }
    const converted = convertToPer100g(
      field.value,
      field.basis,
      resolvedBasis,
      servingGrams,
    );
    fields[spec.key] = {
      value: converted.value,
      confidence: field.confidence,
      warnings: converted.warning
        ? [...field.warnings, converted.warning]
        : field.warnings,
      edited: false,
    };
  }
  return fields;
}

function buildInitialDraft(
  captureId: string,
  barcode: string | null,
  extractedFields: readonly ExtractedNutritionField[],
  byKey: Partial<Record<NutritionFieldKey, ExtractedNutritionField>>,
): LabelReviewDraft {
  const resolvedBasis = resolveOverallBasis(extractedFields);
  const servingField = byKey.serving_size_g;
  const servingGrams: LabelReviewFieldDraft = servingField
    ? {
        value: servingField.value,
        confidence: servingField.confidence,
        warnings: servingField.warnings,
        edited: false,
      }
    : { value: null, confidence: 0, warnings: [], edited: false };

  return {
    captureId,
    productName: "",
    brand: "",
    barcode: barcode ?? "",
    basis: resolvedBasis,
    servingGrams,
    fields: buildFieldDrafts(byKey, resolvedBasis, servingGrams.value),
    overallWarnings: [],
  };
}

/** Recomputes every non-manually-edited field from the original OCR values. */
function recomputeUnedited(
  draft: LabelReviewDraft,
  byKey: Partial<Record<NutritionFieldKey, ExtractedNutritionField>>,
  resolvedBasis: ResolvedBasis,
): LabelReviewDraft {
  const recomputed = buildFieldDrafts(byKey, resolvedBasis, draft.servingGrams.value);
  const fields = { ...draft.fields };
  for (const spec of REVIEW_FIELDS) {
    if (!draft.fields[spec.key].edited) fields[spec.key] = recomputed[spec.key];
  }
  return { ...draft, basis: resolvedBasis, fields };
}

/** The draft's `basis` is always resolved to a known value by `buildInitialDraft`; this narrows the type back for callers. */
function asResolvedBasis(basis: NutritionFieldBasis): ResolvedBasis {
  return basis === "per_serving" ? "per_serving" : "per_100g";
}

function parseOptionalNumber(raw: string, previous: number | null): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : previous;
}

export function LabelReviewForm({
  captureId,
  barcode,
  extractedFields,
  rawText,
  onCancel,
  onSaved,
}: {
  captureId: string;
  barcode?: string | null;
  extractedFields: readonly ExtractedNutritionField[];
  rawText: string;
  onCancel: () => void;
  onSaved: (
    foodId: string,
    name: string,
    per100g: MacroNutrients,
    servingGrams: number,
  ) => void;
}) {
  const byKey = useMemo(() => firstFieldByKey(extractedFields), [extractedFields]);
  const [draft, setDraft] = useState<LabelReviewDraft>(() =>
    buildInitialDraft(captureId, barcode ?? null, extractedFields, byKey),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [retainImage, setRetainImage] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    foodId: string;
    brandedProductId: string;
  } | null>(null);

  function setBasis(nextBasis: ResolvedBasis) {
    setDraft((previous) => recomputeUnedited(previous, byKey, nextBasis));
  }

  function setServingGramsInput(raw: string) {
    setDraft((previous) => {
      const value = parseOptionalNumber(raw, previous.servingGrams.value);
      const next: LabelReviewDraft = {
        ...previous,
        servingGrams: { ...previous.servingGrams, value, edited: true },
      };
      return recomputeUnedited(next, byKey, asResolvedBasis(next.basis));
    });
  }

  function setFieldInput(key: ReviewNutrientKey, raw: string) {
    setDraft((previous) => ({
      ...previous,
      fields: {
        ...previous.fields,
        [key]: {
          ...previous.fields[key],
          value: parseOptionalNumber(raw, previous.fields[key].value),
          edited: true,
        },
      },
    }));
  }

  const energyDiffRatio = useMemo(() => {
    const { energy_kcal, protein_g, carbohydrate_g, fat_g } = draft.fields;
    if (
      energy_kcal.value == null ||
      protein_g.value == null ||
      carbohydrate_g.value == null ||
      fat_g.value == null
    ) {
      return null;
    }
    return energyConsistencyDiffRatio(
      energy_kcal.value,
      protein_g.value,
      carbohydrate_g.value,
      fat_g.value,
    );
  }, [draft.fields]);

  const energyWarning =
    energyDiffRatio != null && Number.isFinite(energyDiffRatio) && energyDiffRatio > 0.2
      ? `Printed energy (${draft.fields.energy_kcal.value} kcal) differs from the macro-based estimate ` +
        `(${Math.round(
          macroEnergyApprox(
            draft.fields.protein_g.value ?? 0,
            draft.fields.carbohydrate_g.value ?? 0,
            draft.fields.fat_g.value ?? 0,
          ),
        )} kcal) by ${Math.round(energyDiffRatio * 100)}% — check for an OCR misread.`
      : null;

  const requiredKeys: ReviewNutrientKey[] = [
    "energy_kcal",
    "protein_g",
    "carbohydrate_g",
    "fat_g",
    "fiber_g",
  ];
  const hasRequiredValues = requiredKeys.every(
    (key) => draft.fields[key].value != null && draft.fields[key].value! >= 0,
  );
  const servingValid = draft.servingGrams.value != null && draft.servingGrams.value > 0;
  const nameValid = draft.productName.trim().length > 0;
  const canSave = hasRequiredValues && servingValid && nameValid && confirmed && !pending;

  function save(forceOverride = false) {
    if (!servingValid || !hasRequiredValues) return;
    setError(null);
    startTransition(async () => {
      const result = await saveReviewedLabelProductAction({
        captureId,
        productName: draft.productName.trim(),
        brand: draft.brand.trim() || undefined,
        barcode: draft.barcode.trim() || undefined,
        servingGrams: draft.servingGrams.value!,
        nutrientsPer100g: {
          energyKcal: draft.fields.energy_kcal.value!,
          proteinG: draft.fields.protein_g.value!,
          carbohydrateG: draft.fields.carbohydrate_g.value!,
          fatG: draft.fields.fat_g.value!,
          fiberG: draft.fields.fiber_g.value!,
          sugarG: draft.fields.sugar_g.value ?? undefined,
          saturatedFatG: draft.fields.saturated_fat_g.value ?? undefined,
          sodiumMg: draft.fields.sodium_mg.value ?? undefined,
        },
        confirmedReview: true,
        forceOverride,
        retainImage,
      });
      if (!result.ok) {
        setError(result.error);
        setConflict(result.conflict ?? null);
        return;
      }
      onSaved(
        result.foodId,
        draft.productName.trim(),
        {
          calories: draft.fields.energy_kcal.value!,
          protein_g: draft.fields.protein_g.value!,
          carbs_g: draft.fields.carbohydrate_g.value!,
          fat_g: draft.fields.fat_g.value!,
          fiber_g: draft.fields.fiber_g.value!,
        },
        draft.servingGrams.value!,
      );
    });
  }

  return (
    <div className="space-y-3">
      <p className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-neon-yellow)] p-2 text-xs font-bold">
        Values extracted by on-device OCR are provisional. Check every field against the
        printed label before saving.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-bold" htmlFor="label-review-name">
          Product name
          <input
            id="label-review-name"
            value={draft.productName}
            maxLength={160}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, productName: event.target.value }))
            }
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
          />
        </label>
        <label className="text-sm font-bold" htmlFor="label-review-brand">
          Brand (optional)
          <input
            id="label-review-brand"
            value={draft.brand}
            maxLength={160}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, brand: event.target.value }))
            }
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
          />
        </label>
        <label className="text-sm font-bold" htmlFor="label-review-barcode">
          Barcode (optional)
          <input
            id="label-review-barcode"
            value={draft.barcode}
            maxLength={64}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, barcode: event.target.value }))
            }
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
          />
        </label>
        <label className="text-sm font-bold" htmlFor="label-review-serving">
          Serving size (g)
          <input
            id="label-review-serving"
            inputMode="decimal"
            value={draft.servingGrams.value ?? ""}
            onChange={(event) => setServingGramsInput(event.target.value)}
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
          />
          {!servingValid ? (
            <span className="mt-1 block text-xs font-bold text-[var(--mt-danger)]">
              Required to compute per-100g values.
            </span>
          ) : null}
        </label>
      </div>

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="text-xs font-extrabold uppercase">
          Extracted values were
        </legend>
        <PixelButton
          tone={draft.basis === "per_100g" ? "primary" : "neutral"}
          aria-pressed={draft.basis === "per_100g"}
          onClick={() => setBasis("per_100g")}
        >
          Per 100 g
        </PixelButton>
        <PixelButton
          tone={draft.basis === "per_serving" ? "primary" : "neutral"}
          aria-pressed={draft.basis === "per_serving"}
          onClick={() => setBasis("per_serving")}
        >
          Per serving
        </PixelButton>
      </fieldset>

      <p className="text-xs font-extrabold uppercase">Nutrients per 100 g</p>
      <div className="grid gap-2 sm:grid-cols-4">
        {REVIEW_FIELDS.map((spec) => {
          const field = draft.fields[spec.key];
          return (
            <label
              key={spec.key}
              className="text-sm font-bold"
              htmlFor={`label-review-field-${spec.key}`}
            >
              {spec.label} ({spec.unit}) {spec.required ? "*" : ""}
              <input
                id={`label-review-field-${spec.key}`}
                inputMode="decimal"
                value={field.value ?? ""}
                onChange={(event) => setFieldInput(spec.key, event.target.value)}
                className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
              />
              {field.warnings.length ? (
                <span className="mt-1 block text-xs font-normal text-[var(--mt-danger)]">
                  {field.warnings[0]}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      {energyWarning ? (
        <p
          role="alert"
          className="border-2 border-[var(--mt-danger)] bg-white p-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {energyWarning}
        </p>
      ) : null}

      <details className="border-2 border-[var(--mt-ink)] bg-white/75 p-2 text-sm">
        <summary className="cursor-pointer font-extrabold uppercase select-none">
          Raw OCR text
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto text-xs whitespace-pre-wrap">
          {rawText}
        </pre>
      </details>

      <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I checked these values against the label
      </label>

      <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={retainImage}
          onChange={(event) => setRetainImage(event.target.checked)}
        />
        Keep the label photo privately after save (default deletes it)
      </label>

      {error ? (
        <div className="space-y-2 border-2 border-[var(--mt-danger)] bg-white p-2">
          <p role="alert" className="text-sm font-bold text-[var(--mt-danger)]">
            {error}
          </p>
          {conflict ? (
            <PixelButton tone="purple" disabled={!canSave} onClick={() => save(true)}>
              Save as private copy anyway
            </PixelButton>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <PixelButton
          tone="primary"
          disabled={!canSave}
          loading={pending}
          onClick={() => save(false)}
        >
          Save product
        </PixelButton>
        <PixelButton tone="neutral" disabled={pending} onClick={onCancel}>
          Cancel
        </PixelButton>
      </div>
    </div>
  );
}
