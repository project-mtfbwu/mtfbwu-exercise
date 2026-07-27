import "server-only";

import { getServerEnv } from "@/shared/config/env.server";
import {
  usdaFoodDetailSchema,
  usdaSearchResponseSchema,
  type UsdaFood,
  type UsdaSearchResponse,
} from "./schemas";

const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

export class UsdaClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "UsdaClientError";
  }
}

type FetchLike = typeof fetch;

export class UsdaClient {
  constructor(
    private readonly fetcher: FetchLike = fetch,
    private readonly apiKey = getServerEnv().USDA_FDC_API_KEY,
  ) {}

  async search(query: string, page = 1, pageSize = 20): Promise<UsdaSearchResponse> {
    const url = new URL(`${USDA_BASE_URL}/foods/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("pageNumber", String(page));
    url.searchParams.set("pageSize", String(Math.min(Math.max(pageSize, 1), 50)));
    return usdaSearchResponseSchema.parse(await this.request(url));
  }

  async getFood(fdcId: number): Promise<UsdaFood> {
    return usdaFoodDetailSchema.parse(
      await this.request(new URL(`${USDA_BASE_URL}/food/${fdcId}`)),
    );
  }

  private async request(url: URL): Promise<unknown> {
    url.searchParams.set("api_key", this.apiKey);
    let lastError: UsdaClientError | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7_000);
      try {
        const response = await this.fetcher(url, { signal: controller.signal });
        if (response.ok) return await response.json();
        lastError = new UsdaClientError(
          `USDA request failed (${response.status})`,
          response.status,
          response.status === 429 || response.status >= 500,
        );
        if (!lastError.retryable) throw lastError;
      } catch (error) {
        if (error instanceof UsdaClientError && !error.retryable) throw error;
        lastError =
          error instanceof UsdaClientError
            ? error
            : new UsdaClientError("USDA request failed", undefined, true);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError ?? new UsdaClientError("USDA request failed");
  }
}
