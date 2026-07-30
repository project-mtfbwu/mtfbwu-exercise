"use client";

import { useMemo, useState } from "react";
import { NumericStepper } from "@/shared/ui/flat-lay/numeric-stepper";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  classifyProductQuality,
  type ProductQualityStatus,
} from "@/modules/nutrition/labels/quality";

export type ProductReviewNutrients = Partial<
  Record<
    | "energy_kcal"
    | "protein_g"
    | "carbohydrate_g"
    | "fat_g"
    | "fiber_g"
    | "sugar_g"
    | "saturated_fat_g"
    | "sodium_mg",
    number
  >
>;

export type ProductReviewFood = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: string;
  servingGrams: number | null;
  servingLabel: string | null;
  nutrientsPer100g: ProductReviewNutrients;
};

const qualityLabels: Record<ProductQualityStatus, string> = {
  complete: "Looks complete",
  partial: "Missing some optional values",
  missing_serving: "No serving size found",
  missing_macros: "Missing macro values",
  inconsistent_energy: "Energy looks inconsistent",
  malformed: "Data looks malformed",
  user_review_required: "Needs manual review",
};

const qualityTone: Record<ProductQualityStatus, string> = {
  complete: "bg-[var(--mt-neon-lime)]",
  partial: "bg-[var(--mt-neon-cyan)]",
  missing_serving: "bg-[var(--mt-neon-yellow)]",
  missing_macros: "bg-[var(--mt-neon-pink)]",
  inconsistent_energy: "bg-[var(--mt-neon-pink)]",
  malformed: "bg-[var(--mt-neon-pink)]",
  user_review_required: "bg-[var(--mt-neon-yellow)]",
};

function macroRow(label: string, value: number | undefined, unit: string) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-[var(--mt-ink)]/40 py-1 text-sm">
      <span className="font-bold">{label}</span>
      <span className="tabular-nums">{value != null ? `${value}${unit}` : "—"}</span>
    </div>
  );
}

/**
 * Read-only preview of a barcode-matched product plus a quantity stepper,
 * shown after a successful `/api/nutrition/barcode/[code]` lookup. Quality
 * classification only runs when there's enough data to be meaningful
 * (`classifyProductQuality` already treats missing macros as its own
 * status, so this simply always calls it with whatever came back).
 */
export function ProductReviewCard({
  food,
  onConfirm,
  onCancel,
}: {
  food: ProductReviewFood;
  onConfirm: (amountG: number) => void;
  onCancel: () => void;
}) {
  const [amountG, setAmountG] = useState(food.servingGrams ?? 100);

  const quality = useMemo(
    () =>
      classifyProductQuality({
        productName: food.name,
        servingGrams: food.servingGrams,
        nutrientsPer100g: {
          energyKcal: food.nutrientsPer100g.energy_kcal,
          proteinG: food.nutrientsPer100g.protein_g,
          carbohydrateG: food.nutrientsPer100g.carbohydrate_g,
          fatG: food.nutrientsPer100g.fat_g,
          fiberG: food.nutrientsPer100g.fiber_g,
          sugarG: food.nutrientsPer100g.sugar_g,
          saturatedFatG: food.nutrientsPer100g.saturated_fat_g,
          sodiumMg: food.nutrientsPer100g.sodium_mg,
        },
      }),
    [food],
  );

  return (
    <div className="space-y-3 border-2 border-[var(--mt-ink)] bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-black">{food.name}</p>
          {food.brand ? <p className="text-sm font-bold">{food.brand}</p> : null}
          <p className="text-xs">
            {food.barcode ? `Barcode ${food.barcode} · ` : ""}
            {food.servingLabel ??
              (food.servingGrams ? `${food.servingGrams} g serving` : "No serving size")}
            {" · "}
            {food.source}
          </p>
        </div>
        <span
          className={`border-2 border-[var(--mt-ink)] px-2 py-1 text-[10px] font-extrabold uppercase ${qualityTone[quality.status]}`}
        >
          {qualityLabels[quality.status]}
        </span>
      </div>

      {quality.reasons.length ? (
        <ul className="space-y-1 border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-2 text-xs font-bold">
          {quality.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="mb-1 text-xs font-extrabold uppercase">Per 100 g</p>
        {macroRow("Calories", food.nutrientsPer100g.energy_kcal, " kcal")}
        {macroRow("Protein", food.nutrientsPer100g.protein_g, " g")}
        {macroRow("Carbs", food.nutrientsPer100g.carbohydrate_g, " g")}
        {macroRow("Fat", food.nutrientsPer100g.fat_g, " g")}
        {macroRow("Fiber", food.nutrientsPer100g.fiber_g, " g")}
        {food.nutrientsPer100g.sugar_g != null
          ? macroRow("Sugar", food.nutrientsPer100g.sugar_g, " g")
          : null}
        {food.nutrientsPer100g.saturated_fat_g != null
          ? macroRow("Saturated fat", food.nutrientsPer100g.saturated_fat_g, " g")
          : null}
        {food.nutrientsPer100g.sodium_mg != null
          ? macroRow("Sodium", food.nutrientsPer100g.sodium_mg, " mg")
          : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <NumericStepper
          id="product-review-amount"
          label={`Grams of ${food.name}`}
          value={amountG}
          min={1}
          max={100000}
          step={5}
          onChange={setAmountG}
        />
        <div className="flex flex-wrap gap-2">
          <PixelButton tone="primary" onClick={() => onConfirm(amountG)}>
            Confirm add
          </PixelButton>
          <PixelButton tone="neutral" onClick={onCancel}>
            Resume scanning
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
