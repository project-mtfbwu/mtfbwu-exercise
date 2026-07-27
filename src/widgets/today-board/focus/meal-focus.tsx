"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { NumericStepper } from "@/shared/ui/flat-lay/numeric-stepper";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { ProgressMeter } from "@/shared/ui/flat-lay/progress-meter";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { amountFromPer100g, sumMealMacros } from "@/modules/nutrition/calculations";
import type { MacroNutrients, MacroTotals } from "@/modules/nutrition/calculations";
import {
  applyMealTemplateAction,
  copyMealFromDateAction,
  deleteMealLogAction,
  installStarterTemplateAction,
  listMealTemplatesAction,
  listRecipesAction,
  loadMealsForDailyRecord,
  loadNutritionGoalsAction,
  saveMealAsTemplateAction,
  saveMealLogAction,
  type StarterTemplateKind,
} from "@/modules/nutrition/meals/actions";
import {
  MEAL_TYPES,
  type MealLogItemView,
  type MealLogView,
  type MealTemplateView,
  type MealType,
  type NutritionGoalsView,
  type RecipeView,
} from "@/modules/nutrition/meals/types";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import { useOnlineStore } from "@/shared/offline/online-store";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import {
  NUTRITION_ENTITY,
  buildMealLogWrites,
  queueNutritionMutation,
} from "@/shared/offline/nutrition-outbox";
import {
  CustomFoodBuilder,
  type SavedCustomFood,
} from "@/widgets/today-board/focus/meal/custom-food-builder";
import { RecipeBuilder } from "@/widgets/today-board/focus/meal/recipe-builder";
import { SavedMealsSection } from "@/widgets/today-board/focus/meal/saved-meals-section";

type SearchFood = {
  id: string;
  name: string;
  brand: string | null;
  source: string;
  sourceId?: string | null;
  nutrientsPer100g?: Partial<
    Record<"energy_kcal" | "protein_g" | "carbohydrate_g" | "fat_g" | "fiber_g", number>
  >;
};
type EditableItem = Omit<MealLogItemView, "id"> & {
  id: string;
  per100g?: MacroNutrients;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UsdaMaterializeResponse = {
  foodId: string;
  created: boolean;
  item: {
    id: string;
    name: string;
    brand: string | null;
    source: string;
    nutrientsPer100g?: SearchFood["nutrientsPer100g"];
  };
  error?: string;
};

/** True when a search result is an unimported USDA candidate (id `usda:<fdcId>`, not a local UUID). */
function isUsdaCandidate(food: SearchFood): boolean {
  return (
    !uuidPattern.test(food.id) &&
    (food.id.startsWith("usda:") || food.source.startsWith("usda_"))
  );
}

/** Reads the numeric FDC id from a search result's sourceId, falling back to the `usda:<id>` form. */
function extractFdcId(food: SearchFood): number | null {
  const raw = food.sourceId ?? (food.id.startsWith("usda:") ? food.id.slice(5) : null);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
const labels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  evening: "Evening",
  pre_workout: "Pre-workout",
  shake: "Shake",
  dinner: "Dinner",
  snack: "Snack",
};

function per100gFromSearch(food: SearchFood): MacroNutrients | undefined {
  if (!food.nutrientsPer100g || !Object.keys(food.nutrientsPer100g).length)
    return undefined;
  const n = food.nutrientsPer100g;
  return {
    calories: n.energy_kcal ?? null,
    protein_g: n.protein_g ?? null,
    carbs_g: n.carbohydrate_g ?? null,
    fat_g: n.fat_g ?? null,
    fiber_g: n.fiber_g ?? null,
  };
}

function macrosFromPer100g(per100g: MacroNutrients, amountG: number) {
  return {
    calories: amountFromPer100g(per100g.calories, amountG) ?? 0,
    protein_g: amountFromPer100g(per100g.protein_g, amountG) ?? 0,
    carbs_g: amountFromPer100g(per100g.carbs_g, amountG) ?? 0,
    fat_g: amountFromPer100g(per100g.fat_g, amountG) ?? 0,
    fiber_g: amountFromPer100g(per100g.fiber_g, amountG) ?? 0,
    hasMissing: false,
    missingNutrients: [],
  };
}

export function MealFocus({
  titleId,
  dailyRecordId,
  localDate,
  onCancel,
  onSaved,
}: {
  titleId: string;
  dailyRecordId: string;
  localDate: string;
  onCancel: () => void;
  onSaved: (summary: string) => void;
}) {
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [meals, setMeals] = useState<MealLogView[]>([]);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchFood[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [materializingId, setMaterializingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MealTemplateView[]>([]);
  const [recipes, setRecipes] = useState<RecipeView[]>([]);
  const [goals, setGoals] = useState<NutritionGoalsView | null>(null);
  const [pending, startTransition] = useTransition();
  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";
  const current = meals.find((meal) => meal.mealType === mealType);
  const totals = useMemo(() => sumMealMacros(items.map((item) => item.macros)), [items]);
  const dayTotalsSoFar = useMemo(
    () => sumMealMacros(meals.map((meal) => meal.macros)),
    [meals],
  );

  useEffect(() => {
    loadMealsForDailyRecord(dailyRecordId).then((loaded) => {
      setMeals(loaded);
      setLoading(false);
    });
    listMealTemplatesAction().then(setTemplates);
    listRecipesAction().then(setRecipes);
    loadNutritionGoalsAction(localDate).then(setGoals);
  }, [dailyRecordId, localDate]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/nutrition/search?q=${encodeURIComponent(trimmed)}&includeUsda=true`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          items?: SearchFood[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Food search failed.");
        setResults(payload.items ?? []);
        setSearchError(null);
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setSearchError("Search failed. Check your connection and try again.");
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function switchMeal(next: MealType) {
    const meal = meals.find((candidate) => candidate.mealType === next);
    setMealType(next);
    setTitle(meal?.title ?? "");
    setItems(meal?.items.map((item) => ({ ...item })) ?? []);
    setQuery("");
    setResults([]);
  }

  function updateSearch(next: string) {
    setQuery(next);
    if (next.trim().length < 2) {
      setResults([]);
      setSearchError(null);
    }
  }

  function appendFoodItem(food: {
    id: string;
    name: string;
    source: string;
    nutrientsPer100g?: SearchFood["nutrientsPer100g"];
  }) {
    const per100g = per100gFromSearch({
      id: food.id,
      name: food.name,
      brand: null,
      source: food.source,
      nutrientsPer100g: food.nutrientsPer100g,
    });
    const amountG = 100;
    setItems((previous) => [
      ...previous,
      {
        id: `new-${food.id}-${crypto.randomUUID()}`,
        itemType: "food",
        foodId: food.id,
        recipeId: null,
        displayName: food.name,
        amountG,
        source: food.source,
        per100g,
        macros: per100g
          ? macrosFromPer100g(per100g, amountG)
          : {
              calories: 0,
              protein_g: 0,
              carbs_g: 0,
              fat_g: 0,
              fiber_g: 0,
              hasMissing: true,
              missingNutrients: [],
            },
      },
    ]);
    setQuery("");
    setResults([]);
  }

  async function addFood(food: SearchFood) {
    if (uuidPattern.test(food.id)) {
      appendFoodItem(food);
      return;
    }
    if (!isUsdaCandidate(food)) {
      setSearchError(
        "This provider result needs importing before it can be logged. Choose a saved catalog food.",
      );
      return;
    }
    const fdcId = extractFdcId(food);
    if (fdcId == null) {
      setSearchError("Could not read a USDA id for this result. Try again.");
      return;
    }
    setSearchError(null);
    setMaterializingId(food.id);
    try {
      const response = await fetch("/api/nutrition/usda/materialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fdcId }),
      });
      const payload = (await response.json()) as UsdaMaterializeResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not import this USDA food.");
      }
      appendFoodItem({
        id: payload.item.id,
        name: payload.item.name,
        source: payload.item.source,
        nutrientsPer100g: payload.item.nutrientsPer100g,
      });
    } catch (error) {
      setSearchError(
        `${(error as Error).message || "Could not import this USDA food."} Try again.`,
      );
    } finally {
      setMaterializingId(null);
    }
  }

  function changeAmount(itemId: string, amountG: number) {
    setItems((previous) =>
      previous.map((candidate) =>
        candidate.id === itemId
          ? {
              ...candidate,
              amountG,
              macros: candidate.per100g
                ? macrosFromPer100g(candidate.per100g, amountG)
                : candidate.macros,
            }
          : candidate,
      ),
    );
  }

  function addCustomFood(food: SavedCustomFood) {
    setItems((previous) => [
      ...previous,
      {
        id: `new-${food.foodId}-${crypto.randomUUID()}`,
        itemType: "food",
        foodId: food.foodId,
        recipeId: null,
        displayName: food.name,
        amountG: food.servingGrams,
        source: "user_custom",
        per100g: food.per100g,
        macros: macrosFromPer100g(food.per100g, food.servingGrams),
      },
    ]);
  }

  function addRecipeServing(recipe: RecipeView) {
    const servingCount = Math.max(recipe.servingCount || 1, 0.0001);
    const scale = 1 / servingCount;
    const ingredientWeightG = recipe.ingredients.reduce(
      (sum, ingredient) => sum + ingredient.amountG,
      0,
    );
    const amountG =
      Math.round((recipe.finalCookedWeightG ?? ingredientWeightG) * scale * 100) / 100 ||
      1;
    const macros: MacroTotals = {
      calories: Math.round(recipe.macros.calories * scale * 100) / 100,
      protein_g: Math.round(recipe.macros.protein_g * scale * 100) / 100,
      carbs_g: Math.round(recipe.macros.carbs_g * scale * 100) / 100,
      fat_g: Math.round(recipe.macros.fat_g * scale * 100) / 100,
      fiber_g: Math.round(recipe.macros.fiber_g * scale * 100) / 100,
      hasMissing: recipe.macros.hasMissing,
      missingNutrients: recipe.macros.missingNutrients,
    };
    const recipeIngredientsSnapshot = recipe.ingredients.map((ingredient) => ({
      foodId: ingredient.foodId,
      displayName: ingredient.displayName,
      amountG: Math.round(ingredient.amountG * scale * 100) / 100,
    }));
    const per100g: MacroNutrients | undefined =
      amountG > 0
        ? {
            calories: (macros.calories / amountG) * 100,
            protein_g: (macros.protein_g / amountG) * 100,
            carbs_g: (macros.carbs_g / amountG) * 100,
            fat_g: (macros.fat_g / amountG) * 100,
            fiber_g: (macros.fiber_g / amountG) * 100,
          }
        : undefined;
    setItems((previous) => [
      ...previous,
      {
        id: `new-recipe-${recipe.id}-${crypto.randomUUID()}`,
        itemType: "recipe",
        foodId: null,
        recipeId: recipe.id,
        displayName: recipe.name,
        amountG,
        source: `recipe:${recipe.id}`,
        per100g,
        macros,
        recipeIngredientsSnapshot,
      },
    ]);
  }

  function save() {
    startTransition(async () => {
      if (!online) {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSearchError("Session expired. Sign in again.");
          return;
        }
        const {
          mealLogId,
          writes,
          totals: offlineTotals,
        } = buildMealLogWrites({
          mealLogId: current?.id,
          userId: user.id,
          dailyRecordId,
          mealType,
          title: title || undefined,
          items: items.map((item) => ({
            id: uuidPattern.test(item.id) ? item.id : undefined,
            itemType: item.itemType,
            foodId: item.foodId,
            recipeId: item.recipeId,
            displayName: item.displayName,
            amountG: item.amountG,
            macros: item.macros,
            source: item.source,
            recipeIngredientsSnapshot: item.recipeIngredientsSnapshot,
          })),
        });
        await queueNutritionMutation({
          userId: user.id,
          entityType: NUTRITION_ENTITY.mealLog,
          entityId: mealLogId,
          payload: { kind: "nutrition", entity: NUTRITION_ENTITY.mealLog, writes },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        const optimisticMeal: MealLogView = {
          id: mealLogId,
          dailyRecordId,
          mealType,
          title: title || null,
          version: current?.version ?? 1,
          macros: offlineTotals,
          items: items.map((item) => ({ ...item })),
        };
        const updatedMeals = [
          ...meals.filter((meal) => meal.mealType !== mealType),
          optimisticMeal,
        ];
        setMeals(updatedMeals);
        const dayTotals = sumMealMacros(updatedMeals.map((meal) => meal.macros));
        onSaved(
          `Offline save queued — ${dayTotals.calories} kcal · P ${dayTotals.protein_g}g · C ${dayTotals.carbs_g}g · F ${dayTotals.fat_g}g`,
        );
        return;
      }

      const result = await saveMealLogAction({
        dailyRecordId,
        mealType,
        title: title || undefined,
        expectedVersion: current?.version,
        items: items.map((item) =>
          item.itemType === "recipe" && item.recipeId
            ? {
                itemType: "recipe" as const,
                recipeId: item.recipeId,
                amountG: item.amountG,
                servings: 1,
              }
            : {
                itemType: "food" as const,
                foodId: item.foodId!,
                amountG: item.amountG,
              },
        ),
      });
      if (!result.ok || !result.meal) {
        setSearchError(result.ok ? "Could not save meal." : result.error);
        return;
      }
      const updatedMeals = [
        ...meals.filter((meal) => meal.mealType !== mealType),
        result.meal,
      ];
      setMeals(updatedMeals);
      setItems(result.meal.items);
      const dayTotals = sumMealMacros(updatedMeals.map((meal) => meal.macros));
      onSaved(
        `${dayTotals.calories} kcal · P ${dayTotals.protein_g}g · C ${dayTotals.carbs_g}g · F ${dayTotals.fat_g}g`,
      );
    });
  }

  function copyPrevious() {
    startTransition(async () => {
      const result = await copyMealFromDateAction({ dailyRecordId, mealType });
      if (!result.ok || !result.meal) {
        setSearchError(result.ok ? "Could not copy meal." : result.error);
        return;
      }
      setMeals((previous) => [
        ...previous.filter((meal) => meal.mealType !== mealType),
        result.meal!,
      ]);
      setItems(result.meal.items);
      setTitle(result.meal.title ?? "");
    });
  }

  function deleteMeal() {
    if (!current) return;
    startTransition(async () => {
      const result = await deleteMealLogAction({
        mealLogId: current.id,
        expectedVersion: current.version,
      });
      if (!result.ok) {
        setSearchError(result.error);
        return;
      }
      setMeals((previous) => previous.filter((meal) => meal.id !== current.id));
      setItems([]);
      setTitle("");
    });
  }

  function applyTemplate(templateId: string) {
    startTransition(async () => {
      const result = await applyMealTemplateAction({
        dailyRecordId,
        mealType,
        templateId,
      });
      if (!result.ok || !result.meal) {
        setSearchError(result.ok ? "Could not apply template." : result.error);
        return;
      }
      setMeals((previous) => [
        ...previous.filter((meal) => meal.mealType !== mealType),
        result.meal!,
      ]);
      setItems(result.meal.items);
      setTitle(result.meal.title ?? "");
      onSaved(result.message);
    });
  }

  function saveAsTemplate(name: string) {
    if (!current) return;
    startTransition(async () => {
      const result = await saveMealAsTemplateAction({ mealLogId: current.id, name });
      if (!result.ok) {
        setSearchError(result.error);
        return;
      }
      setTemplates(await listMealTemplatesAction());
    });
  }

  function installStarter(kind: StarterTemplateKind) {
    startTransition(async () => {
      const result = await installStarterTemplateAction(kind);
      if (!result.ok) {
        setSearchError(result.error);
        return;
      }
      setTemplates(await listMealTemplatesAction());
      onSaved(result.message);
    });
  }

  return (
    <FocusPanel
      title={`${labels[mealType]} meal`}
      titleId={titleId}
      chrome="paper"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            disabled={items.length === 0}
            loading={pending}
            onClick={save}
          >
            {online ? "Save meal" : "Queue offline save"}
          </PixelButton>
          {current ? (
            <PixelButton tone="danger" disabled={pending} onClick={deleteMeal}>
              Delete
            </PixelButton>
          ) : null}
          <PixelButton tone="neutral" disabled={pending} onClick={onCancel}>
            Cancel
          </PixelButton>
        </>
      }
    >
      {!online ? (
        <p
          role="status"
          className="mb-2 border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-cyan)] p-2 text-sm font-bold"
        >
          Offline — saving will queue this meal and sync once you are back online.
        </p>
      ) : null}
      {goals?.calorieTarget != null ? (
        <ProgressMeter
          label="Today so far vs target"
          value={Math.round(dayTotalsSoFar.calories)}
          max={goals.calorieTarget}
          unit="kcal"
          tone="lime"
          className="mb-3"
        />
      ) : null}
      <div className="flex flex-wrap gap-1" aria-label="Meal type">
        {MEAL_TYPES.map((type) => (
          <PixelButton
            key={type}
            tone={type === mealType ? "primary" : "neutral"}
            onClick={() => switchMeal(type)}
          >
            {labels[type]}
          </PixelButton>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm font-bold" htmlFor="meal-title">
          Meal title
          <input
            id="meal-title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            placeholder={`${labels[mealType]} (optional)`}
          />
        </label>
        <PixelButton tone="cyan" disabled={pending || !online} onClick={copyPrevious}>
          Copy previous
        </PixelButton>
        <PixelButton tone="neutral" disabled aria-label="Scan barcode (later)">
          Scan barcode (later)
        </PixelButton>
      </div>
      <label className="mt-3 block text-sm font-bold" htmlFor="food-search">
        Search food
        <input
          id="food-search"
          value={query}
          onChange={(event) => updateSearch(event.target.value)}
          className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
          placeholder="Type at least 2 letters"
        />
      </label>
      <p className="mt-2 border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-2 text-xs font-bold">
        Some generic nutrition values are provisional. Replace them with your exact brand
        where available.
      </p>
      {searchError ? (
        <p
          role="alert"
          className="mt-2 border-2 border-[var(--mt-danger)] bg-white p-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {searchError}
        </p>
      ) : null}
      {results.length ? (
        <ul className="mt-2 space-y-1 border-2 border-[var(--mt-ink)] bg-white p-2">
          {results.map((food) => {
            const materializing = materializingId === food.id;
            return (
              <li
                key={`${food.source}-${food.id}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  <strong>{food.name}</strong>
                  {food.brand ? ` · ${food.brand}` : ""} <small>({food.source})</small>
                </span>
                <PixelButton
                  tone="cyan"
                  disabled={materializing}
                  loading={materializing}
                  onClick={() => addFood(food)}
                >
                  {materializing ? "Importing…" : "Add"}
                </PixelButton>
              </li>
            );
          })}
        </ul>
      ) : null}
      {loading ? <p className="mt-3 text-sm">Loading today’s meals…</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--mt-ink)] bg-white/75 p-2"
          >
            <div>
              <p className="font-bold">
                {item.displayName}
                {item.itemType === "recipe" ? (
                  <span className="ml-2 border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-cyan)] px-1 py-0.5 align-middle text-[10px] font-extrabold uppercase">
                    Recipe
                  </span>
                ) : null}
              </p>
              <p className="text-xs">
                {item.source} · {item.macros.calories} kcal · P {item.macros.protein_g} ·
                C {item.macros.carbs_g} · F {item.macros.fat_g}
              </p>
              {item.itemType === "recipe" && item.recipeIngredientsSnapshot?.length ? (
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer font-bold select-none">
                    Ingredients ({item.recipeIngredientsSnapshot.length})
                  </summary>
                  <ul className="mt-1 list-disc pl-4">
                    {item.recipeIngredientsSnapshot.map((ingredient, index) => (
                      <li key={`${ingredient.foodId}-${index}`}>
                        {ingredient.displayName} · {Math.round(ingredient.amountG)} g
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            <NumericStepper
              id={`amount-${item.id}`}
              label={`Grams of ${item.displayName}`}
              value={item.amountG}
              min={1}
              max={100000}
              step={5}
              onChange={(amountG) => changeAmount(item.id, amountG)}
            />
            <PixelButton
              tone="danger"
              aria-label={`Remove ${item.displayName}`}
              onClick={() =>
                setItems((previous) =>
                  previous.filter((candidate) => candidate.id !== item.id),
                )
              }
            >
              ×
            </PixelButton>
          </li>
        ))}
      </ul>
      <p
        className="mt-3 border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-yellow)] p-2 font-extrabold"
        aria-live="polite"
      >
        Meal totals: {totals.calories} kcal · P {totals.protein_g}g · C {totals.carbs_g}g
        · F {totals.fat_g}g
      </p>

      <SavedMealsSection
        templates={templates}
        pending={pending}
        canSaveAsTemplate={Boolean(current)}
        onApplyTemplate={applyTemplate}
        onSaveAsTemplate={saveAsTemplate}
        onInstallStarter={installStarter}
      />
      <CustomFoodBuilder onSaved={addCustomFood} />
      <RecipeBuilder
        recipes={recipes}
        onRecipesChanged={setRecipes}
        onAddServing={addRecipeServing}
      />
    </FocusPanel>
  );
}
