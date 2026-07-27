import "server-only";

import { getServerEnv } from "@/shared/config/env.server";
import { offProductResponseSchema, type OffProduct } from "./schemas";

const OFF_BASE_URL = "https://world.openfoodfacts.org/api/v2/product";

export class OpenFoodFactsClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "OpenFoodFactsClientError";
  }
}

type FetchLike = typeof fetch;

export class OpenFoodFactsClient {
  constructor(
    private readonly fetcher: FetchLike = fetch,
    private readonly userAgent = getServerEnv().OPEN_FOOD_FACTS_USER_AGENT,
  ) {}

  async getProduct(barcode: string): Promise<OffProduct | null> {
    if (!/^[0-9A-Za-z._-]+$/.test(barcode)) {
      throw new OpenFoodFactsClientError("Invalid barcode");
    }
    let lastError: OpenFoodFactsClientError | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7_000);
      try {
        const response = await this.fetcher(
          `${OFF_BASE_URL}/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_en,brands,nutriments,serving_size,image_front_url,ingredients_text`,
          { headers: { "User-Agent": this.userAgent }, signal: controller.signal },
        );
        if (response.status === 404) return null;
        if (response.ok) {
          const payload = offProductResponseSchema.parse(await response.json());
          return payload.status === 1 && payload.product ? payload.product : null;
        }
        lastError = new OpenFoodFactsClientError(
          `Open Food Facts request failed (${response.status})`,
          response.status,
          response.status === 429 || response.status >= 500,
        );
        if (!lastError.retryable) throw lastError;
      } catch (error) {
        if (error instanceof OpenFoodFactsClientError && !error.retryable) throw error;
        lastError =
          error instanceof OpenFoodFactsClientError
            ? error
            : new OpenFoodFactsClientError(
                "Open Food Facts request failed",
                undefined,
                true,
              );
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError ?? new OpenFoodFactsClientError("Open Food Facts request failed");
  }
}
