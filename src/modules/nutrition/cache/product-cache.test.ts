import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { SupabaseProductCache } from "./product-cache";

type Result = { data: unknown; error: unknown };

function makeBarcodesClient(result: Result) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result);
  const from = vi.fn(() => builder);
  return { client: { from } as never, builder };
}

const brandedFoodsRow = {
  normalized_barcode: "3017620422003",
  barcode_type: "ean13",
  branded_products: {
    id: "branded-1",
    product_name: "Test Bar",
    brand_name: "Test Brand",
    serving_size: 30,
    serving_unit: "g",
    serving_grams: 30,
    source: "open_food_facts",
    source_id: "3017620422003",
    image_url: "https://example.com/image.jpg",
    foods: {
      id: "food-branded-1",
      source: "open_food_facts",
      source_id: "3017620422003",
      canonical_name: "Test Bar",
      brand_name: "Test Brand",
      food_nutrients: [
        {
          amount_per_100g: 539,
          nutrient_definitions: { stable_key: "energy_kcal" },
        },
        {
          amount_per_100g: 42,
          nutrient_definitions: { stable_key: "sodium_mg" },
        },
      ],
    },
  },
};

describe("SupabaseProductCache.getByBarcode", () => {
  it("returns null when no cached barcode row exists", async () => {
    const { client } = makeBarcodesClient({ data: null, error: null });
    const cache = new SupabaseProductCache(client);

    await expect(cache.getByBarcode("3017620422003")).resolves.toBeNull();
  });

  it("joins branded_products and foods, remapping open_food_facts to branded_cache", async () => {
    const { client, builder } = makeBarcodesClient({
      data: brandedFoodsRow,
      error: null,
    });
    const cache = new SupabaseProductCache(client);

    const result = await cache.getByBarcode("3017620422003");

    expect(builder.eq).toHaveBeenCalledWith("normalized_barcode", "3017620422003");
    expect(result).toMatchObject({
      barcode: "3017620422003",
      brandedProduct: {
        id: "branded-1",
        productName: "Test Bar",
        servingGrams: 30,
      },
      food: {
        id: "food-branded-1",
        source: "branded_cache",
        nutrientsPer100g: { energy_kcal: 539, sodium_mg: 42 },
        serving: { label: "30 g", gramWeight: 30 },
      },
    });
  });

  it("rejects an invalid barcode before querying", async () => {
    const { client, builder } = makeBarcodesClient({ data: null, error: null });
    const cache = new SupabaseProductCache(client);

    await expect(cache.getByBarcode("not a barcode!")).rejects.toThrow("Invalid barcode");
    expect(builder.select).not.toHaveBeenCalled();
  });

  it("surfaces a query error as a thrown Error", async () => {
    const { client } = makeBarcodesClient({
      data: null,
      error: { message: "connection reset" },
    });
    const cache = new SupabaseProductCache(client);

    await expect(cache.getByBarcode("3017620422003")).rejects.toThrow(
      "Could not read product cache: connection reset",
    );
  });
});
