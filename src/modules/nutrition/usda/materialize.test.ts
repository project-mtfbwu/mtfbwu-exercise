import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import type { NormalizedFood } from "../sources/types";
import { UsdaClient } from "./client";
import { UsdaFoodMaterializer, UsdaMaterializeError } from "./materialize";

type Result = { data: unknown; error: unknown };

/**
 * A minimal stand-in for the Supabase query builder: `from(table)` always
 * returns the same builder for that table, and each terminal call (explicit
 * `.single()`/`.maybeSingle()`, or a bare `await` on the last chained method)
 * pops the next queued result. Tests supply results in the exact call order
 * `materialize.ts` issues them.
 */
function makeTableBuilder(results: readonly Result[]) {
  let index = 0;
  const nextResult = (): Result =>
    results[Math.min(index++, results.length - 1)] ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  builder.select = vi.fn(passthrough);
  builder.eq = vi.fn(passthrough);
  builder.in = vi.fn(passthrough);
  builder.insert = vi.fn(passthrough);
  builder.delete = vi.fn(passthrough);
  builder.maybeSingle = vi.fn(async () => nextResult());
  builder.single = vi.fn(async () => nextResult());
  builder.then = (
    resolve: (value: Result) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(nextResult()).then(resolve, reject);
  return builder;
}

function createMockClient(responses: Record<string, readonly Result[]>) {
  const builders = new Map<string, ReturnType<typeof makeTableBuilder>>();
  const from = vi.fn((table: string) => {
    if (!builders.has(table))
      builders.set(table, makeTableBuilder(responses[table] ?? []));
    return builders.get(table);
  });
  return { client: { from } as never, builders };
}

const usdaClientStub = Object.create(UsdaClient.prototype) as UsdaClient;

const baseFood: NormalizedFood = {
  id: "usda:99999",
  source: "usda_foundation",
  sourceId: "99999",
  name: "Test Apple",
  brand: null,
  barcode: null,
  nutrientsPer100g: { energy_kcal: 52, protein_g: 0.3 },
  serving: null,
  imageUrl: null,
};

const nutrientDefinitions = [
  { id: "def-energy", stable_key: "energy_kcal" },
  { id: "def-protein", stable_key: "protein_g" },
];

describe("UsdaFoodMaterializer.materializeNormalized", () => {
  it("creates a new local food and nutrients on first materialization", async () => {
    const { client, builders } = createMockClient({
      foods: [
        { data: null, error: null },
        { data: { id: "food-uuid-1" }, error: null },
      ],
      nutrient_definitions: [{ data: nutrientDefinitions, error: null }],
      food_nutrients: [{ data: null, error: null }],
      food_portions: [{ data: null, error: null }],
      food_aliases: [{ data: null, error: null }],
    });
    const materializer = new UsdaFoodMaterializer(usdaClientStub, client);

    const result = await materializer.materializeNormalized(baseFood);

    expect(result).toEqual({
      foodId: "food-uuid-1",
      created: true,
      food: { ...baseFood, id: "food-uuid-1" },
    });
    expect(builders.get("foods")?.insert).toHaveBeenCalledTimes(1);
    expect(builders.get("food_nutrients")?.insert).toHaveBeenCalledTimes(1);
  });

  it("returns the same food id on a second materialization without inserting again", async () => {
    const { client, builders } = createMockClient({
      foods: [{ data: { id: "food-uuid-1" }, error: null }],
    });
    const materializer = new UsdaFoodMaterializer(usdaClientStub, client);

    const result = await materializer.materializeNormalized(baseFood);

    expect(result).toEqual({
      foodId: "food-uuid-1",
      created: false,
      food: { ...baseFood, id: "food-uuid-1" },
    });
    expect(builders.get("foods")?.insert).not.toHaveBeenCalled();
  });

  it("throws before creating anything when nutrients are malformed", async () => {
    const { client, builders } = createMockClient({
      foods: [{ data: null, error: null }],
    });
    const materializer = new UsdaFoodMaterializer(usdaClientStub, client);
    const malformed: NormalizedFood = { ...baseFood, nutrientsPer100g: {} };

    await expect(materializer.materializeNormalized(malformed)).rejects.toThrow(
      UsdaMaterializeError,
    );
    expect(builders.get("foods")?.insert).not.toHaveBeenCalled();
  });

  it("rolls back the created food row when a later write fails", async () => {
    const { client, builders } = createMockClient({
      foods: [
        { data: null, error: null },
        { data: { id: "food-uuid-2" }, error: null },
      ],
      nutrient_definitions: [{ data: [], error: null }],
    });
    const materializer = new UsdaFoodMaterializer(usdaClientStub, client);

    await expect(materializer.materializeNormalized(baseFood)).rejects.toThrow(
      UsdaMaterializeError,
    );
    expect(builders.get("foods")?.delete).toHaveBeenCalledTimes(1);
    expect(builders.get("foods")?.eq).toHaveBeenCalledWith("id", "food-uuid-2");
  });

  it("returns the winning row when a concurrent insert loses the unique race", async () => {
    const { client, builders } = createMockClient({
      foods: [
        { data: null, error: null },
        { data: null, error: { code: "23505", message: "duplicate key value" } },
        { data: { id: "raced-food-id" }, error: null },
      ],
    });
    const materializer = new UsdaFoodMaterializer(usdaClientStub, client);

    const result = await materializer.materializeNormalized(baseFood);

    expect(result).toEqual({
      foodId: "raced-food-id",
      created: false,
      food: { ...baseFood, id: "raced-food-id" },
    });
    expect(builders.get("foods")?.insert).toHaveBeenCalledTimes(1);
  });

  it("rejects a food from a non-USDA source", async () => {
    const { client } = createMockClient({});
    const materializer = new UsdaFoodMaterializer(usdaClientStub, client);
    const nonUsda: NormalizedFood = { ...baseFood, source: "mtfbwu_curated" };

    await expect(materializer.materializeNormalized(nonUsda)).rejects.toThrow(
      UsdaMaterializeError,
    );
  });
});
