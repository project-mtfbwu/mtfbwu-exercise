"use client";

import { useEffect, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { NumericStepper } from "@/shared/ui/flat-lay/numeric-stepper";
import {
  deleteRecipeAction,
  listRecipesAction,
  saveRecipeAction,
} from "@/modules/nutrition/meals/actions";
import type { RecipeView } from "@/modules/nutrition/meals/types";

type SearchFood = { id: string; name: string; brand: string | null; source: string };
type DraftIngredient = { foodId: string; displayName: string; amountG: number };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function RecipeBuilder({
  recipes,
  onRecipesChanged,
  onAddServing,
}: {
  recipes: RecipeView[];
  onRecipesChanged: (recipes: RecipeView[]) => void;
  onAddServing: (recipe: RecipeView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [finalCookedWeightG, setFinalCookedWeightG] = useState("");
  const [servingCount, setServingCount] = useState("1");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchFood[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/nutrition/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as { items?: SearchFood[] };
        setResults(payload.items ?? []);
      } catch {
        /* ignore transient search errors here; the meal search box surfaces them */
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function updateQuery(next: string) {
    setQuery(next);
    if (next.trim().length < 2) setResults([]);
  }

  function addIngredient(food: SearchFood) {
    if (!uuidPattern.test(food.id)) return;
    setIngredients((previous) => [
      ...previous,
      { foodId: food.id, displayName: food.name, amountG: 100 },
    ]);
    setQuery("");
    setResults([]);
  }

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Recipe name is required.");
      return;
    }
    if (!ingredients.length) {
      setError("Add at least one ingredient.");
      return;
    }
    const finalWeight = Number(finalCookedWeightG);
    const servings = Number(servingCount);
    startTransition(async () => {
      const result = await saveRecipeAction({
        name: name.trim(),
        description: description.trim() || undefined,
        finalCookedWeightG:
          Number.isFinite(finalWeight) && finalWeight > 0 ? finalWeight : undefined,
        servingCount: Number.isFinite(servings) && servings > 0 ? servings : undefined,
        ingredients: ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          amountG: ingredient.amountG,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setDescription("");
      setFinalCookedWeightG("");
      setServingCount("1");
      setIngredients([]);
      onRecipesChanged(await listRecipesAction());
    });
  }

  function remove(recipeId: string) {
    startTransition(async () => {
      const result = await deleteRecipeAction({ recipeId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onRecipesChanged(await listRecipesAction());
    });
  }

  return (
    <details
      className="mt-3 border-2 border-[var(--mt-ink)] bg-white/75 p-2"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-extrabold uppercase select-none">
        Recipes
      </summary>
      <div className="mt-3 space-y-2">
        {recipes.length ? (
          <ul className="space-y-2">
            {recipes.map((recipe) => (
              <li
                key={recipe.id}
                className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-ink)] bg-white p-2"
              >
                <span>
                  <strong>{recipe.name}</strong> · {recipe.macros.calories} kcal total ·{" "}
                  {recipe.servingCount} serving{recipe.servingCount === 1 ? "" : "s"}
                </span>
                <span className="flex gap-2">
                  <PixelButton
                    tone="cyan"
                    disabled={pending}
                    onClick={() => onAddServing(recipe)}
                  >
                    Add serving
                  </PixelButton>
                  <PixelButton
                    tone="danger"
                    disabled={pending}
                    aria-label={`Delete recipe ${recipe.name}`}
                    onClick={() => remove(recipe.id)}
                  >
                    ×
                  </PixelButton>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">No recipes saved yet.</p>
        )}

        <p className="text-sm font-extrabold uppercase">New recipe</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm font-bold" htmlFor="recipe-name">
            Name
            <input
              id="recipe-name"
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
          <label className="text-sm font-bold" htmlFor="recipe-description">
            Description (optional)
            <input
              id="recipe-description"
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
          <label className="text-sm font-bold" htmlFor="recipe-final-weight">
            Final cooked weight (g)
            <input
              id="recipe-final-weight"
              inputMode="decimal"
              value={finalCookedWeightG}
              onChange={(event) => setFinalCookedWeightG(event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
          <label className="text-sm font-bold" htmlFor="recipe-servings">
            Serving count
            <input
              id="recipe-servings"
              inputMode="decimal"
              value={servingCount}
              onChange={(event) => setServingCount(event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
        </div>
        <label className="block text-sm font-bold" htmlFor="recipe-ingredient-search">
          Search ingredient
          <input
            id="recipe-ingredient-search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            placeholder="Type at least 2 letters"
          />
        </label>
        {results.length ? (
          <ul className="space-y-1 border-2 border-[var(--mt-ink)] bg-white p-2">
            {results.map((food) => (
              <li
                key={`${food.source}-${food.id}`}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  <strong>{food.name}</strong>
                  {food.brand ? ` · ${food.brand}` : ""}
                </span>
                <PixelButton tone="cyan" onClick={() => addIngredient(food)}>
                  Add
                </PixelButton>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <li
              key={`${ingredient.foodId}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-ink)] bg-white p-2"
            >
              <span className="font-bold">{ingredient.displayName}</span>
              <NumericStepper
                id={`recipe-ingredient-${index}`}
                label={`Grams of ${ingredient.displayName}`}
                value={ingredient.amountG}
                min={1}
                max={100000}
                step={5}
                onChange={(amountG) =>
                  setIngredients((previous) =>
                    previous.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, amountG } : item,
                    ),
                  )
                }
              />
              <PixelButton
                tone="danger"
                aria-label={`Remove ${ingredient.displayName}`}
                onClick={() =>
                  setIngredients((previous) =>
                    previous.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </PixelButton>
            </li>
          ))}
        </ul>
        {error ? (
          <p role="alert" className="font-bold text-[var(--mt-danger)]">
            {error}
          </p>
        ) : null}
        <PixelButton tone="cyan" loading={pending} onClick={save}>
          Save recipe
        </PixelButton>
      </div>
    </details>
  );
}
