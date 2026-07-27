import type { NormalizedFood } from "../sources/types";
import { compareFoodSources } from "../sources/priority";
import { normalizeUsdaFood } from "../usda/normalize";
import type { UsdaClient } from "../usda/client";

export interface LocalFoodSearch {
  search(
    query: string,
    page: number,
    pageSize: number,
    userId: string,
  ): Promise<NormalizedFood[]>;
}

export interface FoodSearchOptions {
  query: string;
  userId: string;
  page?: number;
  pageSize?: number;
  includeUsda?: boolean;
}

export interface FoodSearchResult {
  items: NormalizedFood[];
  page: number;
  pageSize: number;
  remoteSearched: boolean;
  nextPage: number | null;
}

export class FoodSearch {
  constructor(
    private readonly local: LocalFoodSearch,
    private readonly usda: Pick<UsdaClient, "search">,
    private readonly localSufficiency = 8,
  ) {}

  async search(options: FoodSearchOptions): Promise<FoodSearchResult> {
    const page = Math.max(options.page ?? 1, 1);
    const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
    const localItems = await this.local.search(
      options.query,
      page,
      pageSize,
      options.userId,
    );
    const shouldSearchRemote =
      options.includeUsda === true || localItems.length < this.localSufficiency;
    const remote = shouldSearchRemote
      ? await this.usda.search(options.query, page, pageSize)
      : null;
    const items = [...localItems, ...(remote?.foods.map(normalizeUsdaFood) ?? [])]
      .filter(
        (item, index, list) =>
          list.findIndex((candidate) => candidate.id === item.id) === index,
      )
      .sort((left, right) => compareFoodSources(left.source, right.source))
      .slice(0, pageSize);
    return {
      items,
      page,
      pageSize,
      remoteSearched: shouldSearchRemote,
      nextPage:
        remote &&
        remote.currentPage &&
        remote.totalPages &&
        remote.currentPage < remote.totalPages
          ? page + 1
          : null,
    };
  }
}
