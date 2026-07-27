import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import productFixture from "./fixtures/product.json";
import { OpenFoodFactsClient } from "./client";
import { normalizeOffProduct } from "./normalize";
import { offProductResponseSchema } from "./schemas";

describe("Open Food Facts adapter", () => {
  it("normalizes fixture nutrients into local units", () => {
    const fixture = offProductResponseSchema.parse(productFixture);
    const food = normalizeOffProduct(fixture.product!, "3017620422003");
    expect(food.nutrientsPer100g).toMatchObject({ energy_kcal: 539, sodium_mg: 42 });
    expect(food.serving).toEqual({ label: "15 g", gramWeight: 15 });
  });

  it("sends the configured User-Agent using mocked fetch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(productFixture)));
    const client = new OpenFoodFactsClient(fetcher, "MTFBWU test agent");
    await expect(client.getProduct("3017620422003")).resolves.toMatchObject({
      code: "3017620422003",
    });
    const init = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.headers).toEqual({ "User-Agent": "MTFBWU test agent" });
  });
});
