import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import detailFixture from "./fixtures/detail.json";
import searchFixture from "./fixtures/search.json";
import { UsdaClient } from "./client";
import { normalizeUsdaFood } from "./normalize";
import { usdaFoodDetailSchema, usdaSearchResponseSchema } from "./schemas";

describe("USDA adapter", () => {
  it("normalizes fixture nutrients and source", () => {
    const food = normalizeUsdaFood(usdaFoodDetailSchema.parse(detailFixture));
    expect(food.source).toBe("usda_foundation");
    expect(food.nutrientsPer100g).toMatchObject({
      energy_kcal: 52,
      protein_g: 0.26,
      fiber_g: 2.4,
    });
    expect(food.serving).toEqual({ label: "182 g", gramWeight: 182 });
  });

  it("uses a mocked fetch request for searches", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(searchFixture)));
    const client = new UsdaClient(fetcher, "fixture-key");
    await expect(client.search("apple")).resolves.toEqual(
      usdaSearchResponseSchema.parse(searchFixture),
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("api_key=fixture-key");
  });
});
