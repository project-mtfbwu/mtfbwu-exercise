"use client";

import { useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { saveCustomFoodAction } from "@/modules/nutrition/meals/actions";
import { FOOD_STATES, type FoodState } from "@/modules/nutrition/meals/types";

export type SavedCustomFood = {
  foodId: string;
  name: string;
  servingGrams: number;
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
};

const foodStateLabels: Record<FoodState, string> = {
  raw: "Raw",
  cooked: "Cooked",
  dry: "Dry",
  prepared: "Prepared",
  packaged: "Packaged",
};

type NumberFieldKey =
  | "servingGrams"
  | "caloriesPer100g"
  | "proteinPer100g"
  | "carbsPer100g"
  | "fatPer100g"
  | "fiberPer100g";

export function CustomFoodBuilder({
  onSaved,
}: {
  onSaved: (food: SavedCustomFood) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [foodState, setFoodState] = useState<FoodState>("prepared");
  const [barcode, setBarcode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState<Record<NumberFieldKey, string>>({
    servingGrams: "100",
    caloriesPer100g: "",
    proteinPer100g: "",
    carbsPer100g: "",
    fatPer100g: "",
    fiberPer100g: "",
  });

  function setField(key: NumberFieldKey, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }

  function submit() {
    setError(null);
    const servingGrams = Number(fields.servingGrams);
    const caloriesPer100g = Number(fields.caloriesPer100g || 0);
    const proteinPer100g = Number(fields.proteinPer100g || 0);
    const carbsPer100g = Number(fields.carbsPer100g || 0);
    const fatPer100g = Number(fields.fatPer100g || 0);
    const fiberPer100g = Number(fields.fiberPer100g || 0);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!Number.isFinite(servingGrams) || servingGrams <= 0) {
      setError("Serving grams must be a positive number.");
      return;
    }
    startTransition(async () => {
      const result = await saveCustomFoodAction({
        name: name.trim(),
        brand: brand.trim() || undefined,
        foodState,
        servingGrams,
        caloriesPer100g,
        proteinPer100g,
        carbsPer100g,
        fatPer100g,
        fiberPer100g,
        verifiedByUser: verified,
        barcode: barcode.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved({
        foodId: result.id,
        name: name.trim(),
        servingGrams,
        per100g: {
          calories: caloriesPer100g,
          protein_g: proteinPer100g,
          carbs_g: carbsPer100g,
          fat_g: fatPer100g,
          fiber_g: fiberPer100g,
        },
      });
      setName("");
      setBrand("");
      setBarcode("");
      setVerified(false);
      setFields({
        servingGrams: "100",
        caloriesPer100g: "",
        proteinPer100g: "",
        carbsPer100g: "",
        fatPer100g: "",
        fiberPer100g: "",
      });
      setOpen(false);
    });
  }

  return (
    <details
      className="mt-3 border-2 border-[var(--mt-ink)] bg-white/75 p-2"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-extrabold uppercase select-none">
        Add a custom food
      </summary>
      <div className="mt-3 space-y-2">
        <p className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-neon-yellow)] p-2 text-xs font-bold">
          Values you enter are not verified by MTFBWU. Double-check against a label or a
          trusted source before relying on them.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm font-bold" htmlFor="custom-food-name">
            Name
            <input
              id="custom-food-name"
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
          <label className="text-sm font-bold" htmlFor="custom-food-brand">
            Brand (optional)
            <input
              id="custom-food-brand"
              value={brand}
              maxLength={160}
              onChange={(event) => setBrand(event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
          <label className="text-sm font-bold" htmlFor="custom-food-state">
            State
            <select
              id="custom-food-state"
              value={foodState}
              onChange={(event) => setFoodState(event.target.value as FoodState)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            >
              {FOOD_STATES.map((state) => (
                <option key={state} value={state}>
                  {foodStateLabels[state]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold" htmlFor="custom-food-serving">
            Default serving (g)
            <input
              id="custom-food-serving"
              inputMode="decimal"
              value={fields.servingGrams}
              onChange={(event) => setField("servingGrams", event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
        </div>
        <p className="text-xs font-bold uppercase">Per 100 g</p>
        <div className="grid gap-2 sm:grid-cols-5">
          {(
            [
              ["caloriesPer100g", "Calories"],
              ["proteinPer100g", "Protein g"],
              ["carbsPer100g", "Carbs g"],
              ["fatPer100g", "Fat g"],
              ["fiberPer100g", "Fiber g"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm font-bold" htmlFor={`custom-food-${key}`}>
              {label}
              <input
                id={`custom-food-${key}`}
                inputMode="decimal"
                value={fields[key]}
                onChange={(event) => setField(key, event.target.value)}
                className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
              />
            </label>
          ))}
        </div>
        <label className="text-sm font-bold" htmlFor="custom-food-barcode">
          Barcode (optional)
          <input
            id="custom-food-barcode"
            value={barcode}
            maxLength={64}
            onChange={(event) => setBarcode(event.target.value)}
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
          />
          I confirmed these values myself (e.g. from a nutrition label)
        </label>
        {error ? (
          <p role="alert" className="font-bold text-[var(--mt-danger)]">
            {error}
          </p>
        ) : null}
        <PixelButton tone="cyan" loading={pending} onClick={submit}>
          Save custom food
        </PixelButton>
      </div>
    </details>
  );
}
