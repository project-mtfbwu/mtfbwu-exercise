import type { MealType } from "./types";

/**
 * Curated seed UUIDs from `docs/data/MTFBWU_CURATED_FOODS.md`. Starter
 * templates reference these fixed rows so installs stay reproducible across
 * environments that ran the curated-foods seed migration.
 */
const CURATED_FOOD = {
  egg: "9e210001-0000-4000-8000-000000000001",
  oats: "9e210001-0000-4000-8000-000000000002",
  riceRaw: "9e210001-0000-4000-8000-000000000003",
  chickenBreast: "9e210001-0000-4000-8000-000000000005",
  paneer: "9e210001-0000-4000-8000-000000000008",
  greekYogurt: "9e210001-0000-4000-8000-000000000009",
  whey: "9e210001-0000-4000-8000-000000000010",
  tofu: "9e210001-0000-4000-8000-000000000017",
  soyHydrated: "9e210001-0000-4000-8000-000000000019",
  moong: "9e210001-0000-4000-8000-000000000020",
  oliveOil: "9e210001-0000-4000-8000-000000000026",
  groundnutOil: "9e210001-0000-4000-8000-000000000028",
  spinach: "9e210001-0000-4000-8000-000000000029",
  tomato: "9e210001-0000-4000-8000-000000000030",
  onion: "9e210001-0000-4000-8000-000000000031",
  salmon: "9e210001-0000-4000-8000-000000000034",
  rohu: "9e210001-0000-4000-8000-000000000035",
} as const;

type StarterItem = { foodId: string; amountG: number };
type StarterMeal = { mealType: MealType; name: string; items: readonly StarterItem[] };
export type StarterTemplateKind = "chicken" | "plant" | "fish";

const STARTER_BREAKFAST: readonly StarterItem[] = [
  { foodId: CURATED_FOOD.egg, amountG: 150 },
  { foodId: CURATED_FOOD.oats, amountG: 50 },
];
const STARTER_EVENING: readonly StarterItem[] = [
  { foodId: CURATED_FOOD.greekYogurt, amountG: 150 },
  { foodId: CURATED_FOOD.paneer, amountG: 50 },
];
const STARTER_SHAKE: readonly StarterItem[] = [
  { foodId: CURATED_FOOD.whey, amountG: 30 },
];

/**
 * Example day plans only — not medical prescriptions. Portions are round
 * numbers meant as a logging starting point; fish calories vary by species
 * (see `docs/data/MTFBWU_CURATED_FOODS.md`), so review the fish plan before
 * relying on its totals.
 */
export const STARTER_TEMPLATES: Readonly<
  Record<StarterTemplateKind, readonly StarterMeal[]>
> = {
  chicken: [
    {
      mealType: "breakfast",
      name: "Chicken starter breakfast",
      items: STARTER_BREAKFAST,
    },
    {
      mealType: "lunch",
      name: "Chicken starter lunch",
      items: [
        { foodId: CURATED_FOOD.riceRaw, amountG: 50 },
        { foodId: CURATED_FOOD.spinach, amountG: 100 },
        { foodId: CURATED_FOOD.tomato, amountG: 50 },
        { foodId: CURATED_FOOD.onion, amountG: 50 },
        { foodId: CURATED_FOOD.chickenBreast, amountG: 150 },
        { foodId: CURATED_FOOD.oliveOil, amountG: 5 },
      ],
    },
    { mealType: "evening", name: "Chicken starter evening", items: STARTER_EVENING },
    {
      mealType: "pre_workout",
      name: "Chicken starter pre-workout",
      items: [
        { foodId: CURATED_FOOD.riceRaw, amountG: 50 },
        { foodId: CURATED_FOOD.chickenBreast, amountG: 150 },
      ],
    },
    { mealType: "shake", name: "Chicken starter shake", items: STARTER_SHAKE },
  ],
  plant: [
    { mealType: "breakfast", name: "Plant starter breakfast", items: STARTER_BREAKFAST },
    {
      mealType: "lunch",
      name: "Plant starter lunch",
      items: [
        { foodId: CURATED_FOOD.riceRaw, amountG: 50 },
        { foodId: CURATED_FOOD.moong, amountG: 40 },
        { foodId: CURATED_FOOD.tofu, amountG: 150 },
        { foodId: CURATED_FOOD.groundnutOil, amountG: 5 },
        { foodId: CURATED_FOOD.spinach, amountG: 80 },
      ],
    },
    { mealType: "evening", name: "Plant starter evening", items: STARTER_EVENING },
    {
      mealType: "pre_workout",
      name: "Plant starter pre-workout",
      items: [
        { foodId: CURATED_FOOD.riceRaw, amountG: 50 },
        { foodId: CURATED_FOOD.soyHydrated, amountG: 150 },
      ],
    },
    { mealType: "shake", name: "Plant starter shake", items: STARTER_SHAKE },
  ],
  fish: [
    { mealType: "breakfast", name: "Fish starter breakfast", items: STARTER_BREAKFAST },
    {
      mealType: "lunch",
      name: "Fish starter lunch",
      items: [
        { foodId: CURATED_FOOD.riceRaw, amountG: 50 },
        { foodId: CURATED_FOOD.salmon, amountG: 150 },
        { foodId: CURATED_FOOD.spinach, amountG: 100 },
        { foodId: CURATED_FOOD.tomato, amountG: 50 },
        { foodId: CURATED_FOOD.oliveOil, amountG: 5 },
      ],
    },
    { mealType: "evening", name: "Fish starter evening", items: STARTER_EVENING },
    {
      mealType: "pre_workout",
      name: "Fish starter pre-workout (rohu)",
      items: [
        { foodId: CURATED_FOOD.riceRaw, amountG: 50 },
        { foodId: CURATED_FOOD.rohu, amountG: 150 },
      ],
    },
    { mealType: "shake", name: "Fish starter shake", items: STARTER_SHAKE },
  ],
} as const;

export const STARTER_TEMPLATE_NOTE =
  "Example starter template, not a medical prescription. Review and adjust portions for your needs; fish calories vary by species — check the specific fish before trusting its totals.";
