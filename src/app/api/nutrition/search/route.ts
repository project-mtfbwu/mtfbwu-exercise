import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/database/server";
import { FoodSearch, type LocalFoodSearch } from "@/modules/nutrition/search/food-search";
import { UsdaClient } from "@/modules/nutrition/usda/client";
import type {
  NormalizedFood,
  NormalizedNutrients,
  NutrientKey,
} from "@/modules/nutrition/sources/types";

const LOCAL_NUTRIENT_KEYS: readonly NutrientKey[] = [
  "energy_kcal",
  "protein_g",
  "carbohydrate_g",
  "fat_g",
  "fiber_g",
];

const requestSchema = z.object({
  q: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  includeUsda: z.enum(["true", "false"]).default("false"),
});

type FoodsQuery = {
  select(columns: string): FoodsQuery;
  ilike(column: string, value: string): FoodsQuery;
  order(column: string): FoodsQuery;
  range(
    start: number,
    end: number,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

type FoodsClient = { from(table: "foods"): FoodsQuery };

type NutrientDefinitionRelation =
  { stable_key: string } | { stable_key: string }[] | null;
type NutrientRow = {
  food_id: string;
  amount_per_100g: number | string;
  nutrient_definitions: NutrientDefinitionRelation;
};
type NutrientsQuery = {
  select(columns: string): NutrientsQuery;
  in(
    column: string,
    values: string[],
  ): Promise<{ data: NutrientRow[] | null; error: { message: string } | null }>;
};
type NutrientsClient = { from(table: "food_nutrients"): NutrientsQuery };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The local catalog query above does not join nutrients, so freshly matched
 * rows arrive with an empty `nutrientsPer100g`. Filling it in here lets the
 * meal-focus UI show and recalculate macros before a food is added, without
 * duplicating the join logic already used by the meal-save action.
 */
async function enrichWithLocalNutrients(
  client: NutrientsClient,
  foods: readonly NormalizedFood[],
): Promise<NormalizedFood[]> {
  const ids = foods
    .filter(
      (food) =>
        uuidPattern.test(food.id) && Object.keys(food.nutrientsPer100g).length === 0,
    )
    .map((food) => food.id);
  if (!ids.length) return [...foods];

  const { data, error } = await client
    .from("food_nutrients")
    .select("food_id, amount_per_100g, nutrient_definitions(stable_key)")
    .in("food_id", ids);
  if (error || !data) return [...foods];

  const byFood = new Map<string, NormalizedNutrients>();
  for (const row of data) {
    const relation = Array.isArray(row.nutrient_definitions)
      ? row.nutrient_definitions[0]
      : row.nutrient_definitions;
    const key = relation?.stable_key as NutrientKey | undefined;
    if (!key || !LOCAL_NUTRIENT_KEYS.includes(key)) continue;
    const bucket = byFood.get(row.food_id) ?? {};
    bucket[key] = Number(row.amount_per_100g);
    byFood.set(row.food_id, bucket);
  }

  return foods.map((food) =>
    byFood.has(food.id) ? { ...food, nutrientsPer100g: byFood.get(food.id)! } : food,
  );
}

function localSearch(client: FoodsClient): LocalFoodSearch {
  return {
    async search(query, page, pageSize): Promise<NormalizedFood[]> {
      const { data, error } = await client
        .from("foods")
        .select("id, source, source_id, canonical_name, brand_name")
        .ilike("normalized_name", `%${query.toLowerCase()}%`)
        .order("canonical_name")
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw new Error(`Could not search local foods: ${error.message}`);
      return (data as Array<Record<string, string | null>>).map((food) => ({
        id: food.id ?? "",
        source: (food.source ?? "other") as NormalizedFood["source"],
        sourceId: food.source_id ?? null,
        name: food.canonical_name ?? "Unknown food",
        brand: food.brand_name ?? null,
        barcode: null,
        nutrientsPer100g: {},
        serving: null,
        imageUrl: null,
      }));
    },
  };
}

export async function GET(request: Request) {
  const parsed = requestSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid search parameters" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const search = new FoodSearch(
      localSearch(supabase as unknown as FoodsClient),
      new UsdaClient(),
    );
    const result = await search.search({
      query: parsed.data.q,
      userId: user.id,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      includeUsda: parsed.data.includeUsda === "true",
    });
    const items = await enrichWithLocalNutrients(
      supabase as unknown as NutrientsClient,
      result.items,
    );
    return NextResponse.json({ ...result, items });
  } catch {
    return NextResponse.json(
      { error: "Food search is temporarily unavailable" },
      { status: 502 },
    );
  }
}
