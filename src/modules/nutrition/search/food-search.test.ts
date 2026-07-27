import { describe, expect, it, vi } from "vitest";
import { FoodSearch } from "./food-search";

describe("FoodSearch", () => {
  const local = {
    search: vi.fn().mockResolvedValue([
      {
        id: "local:apple",
        source: "user_custom" as const,
        sourceId: "apple",
        name: "My apple",
        brand: null,
        barcode: null,
        nutrientsPer100g: {},
        serving: null,
        imageUrl: null,
      },
    ]),
  };
  const usda = {
    search: vi.fn().mockResolvedValue({
      foods: [
        { fdcId: 1, description: "Apple", dataType: "Foundation", foodNutrients: [] },
      ],
      currentPage: 1,
      totalPages: 2,
    }),
  };

  it("adds USDA results when local results are insufficient", async () => {
    const result = await new FoodSearch(local, usda).search({
      query: "apple",
      userId: "user",
    });
    expect(result.items.map((item) => item.id)).toEqual(["local:apple", "usda:1"]);
    expect(result.remoteSearched).toBe(true);
    expect(result.nextPage).toBe(2);
  });

  it("does not call USDA when enough local results exist unless requested", async () => {
    const fullLocal = {
      search: vi.fn().mockResolvedValue(
        Array.from({ length: 8 }, (_, index) => ({
          id: `local:${index}`,
          source: "mtfbwu_curated" as const,
          sourceId: String(index),
          name: `Food ${index}`,
          brand: null,
          barcode: null,
          nutrientsPer100g: {},
          serving: null,
          imageUrl: null,
        })),
      ),
    };
    const remote = { search: vi.fn() };
    const result = await new FoodSearch(fullLocal, remote).search({
      query: "food",
      userId: "user",
    });
    expect(result.remoteSearched).toBe(false);
    expect(remote.search).not.toHaveBeenCalled();
  });
});
