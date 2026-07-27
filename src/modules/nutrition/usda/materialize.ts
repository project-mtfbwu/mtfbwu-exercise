import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/shared/config/env.server";
import type { Database, FoodSource } from "@/shared/database/types";
import type { NormalizedFood, NutrientKey } from "../sources/types";
import { UsdaClient, UsdaClientError } from "./client";
import { normalizeUsdaFood } from "./normalize";
import type { UsdaFood } from "./schemas";

export type MaterializeUsdaResult = {
  foodId: string;
  created: boolean;
  food: NormalizedFood;
};

export class UsdaMaterializeError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "UsdaMaterializeError";
  }
}

type ServiceClient = SupabaseClient<Database>;

function sourceFromNormalized(source: NormalizedFood["source"]): FoodSource {
  return source;
}

/**
 * Fetches USDA detail (or uses a provided fixture), validates, and upserts a
 * local catalog food keyed by (source, source_id). Concurrent callers collide
 * on the unique index and re-read the existing row instead of duplicating.
 */
export class UsdaFoodMaterializer {
  private readonly client: ServiceClient;

  constructor(
    private readonly usda: UsdaClient = new UsdaClient(),
    client?: ServiceClient,
  ) {
    const env = getServerEnv();
    this.client =
      client ??
      createClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
  }

  async materializeByFdcId(fdcId: number): Promise<MaterializeUsdaResult> {
    if (!Number.isInteger(fdcId) || fdcId <= 0) {
      throw new UsdaMaterializeError("Invalid USDA FDC id");
    }

    let detail: UsdaFood;
    try {
      detail = await this.usda.getFood(fdcId);
    } catch (error) {
      if (error instanceof UsdaClientError) {
        throw new UsdaMaterializeError(error.message, error.retryable);
      }
      throw new UsdaMaterializeError("USDA detail request failed", true);
    }

    return this.materializeNormalized(normalizeUsdaFood(detail));
  }

  /** Test/helper entry that skips the network and uses a normalized food. */
  async materializeNormalized(food: NormalizedFood): Promise<MaterializeUsdaResult> {
    if (!food.sourceId) {
      throw new UsdaMaterializeError("USDA food is missing a source id");
    }
    if (!food.source.startsWith("usda_")) {
      throw new UsdaMaterializeError("Only USDA sources can be materialized here");
    }

    const existing = await this.findExisting(food.source, food.sourceId);
    if (existing) {
      return {
        foodId: existing.id,
        created: false,
        food: { ...food, id: existing.id },
      };
    }

    // Validate nutrients before any write so malformed payloads never leave
    // a half-created catalog row.
    const nutrientEntries = Object.entries(food.nutrientsPer100g).filter(
      (entry): entry is [NutrientKey, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
    );
    if (!nutrientEntries.length) {
      throw new UsdaMaterializeError("USDA food has no usable nutrient values");
    }

    const source = sourceFromNormalized(food.source);
    let createdFoodId: string | null = null;
    try {
      const { data: inserted, error: insertError } = await this.client
        .from("foods")
        .insert({
          canonical_name: food.name,
          normalized_name: food.name.trim().toLowerCase(),
          source,
          source_id: food.sourceId,
          brand_name: food.brand,
          food_state: "prepared",
          verified: false,
          user_editable: false,
          source_organization: "USDA FoodData Central",
          source_dataset: food.source,
          source_reference: `fdc:${food.sourceId}`,
          source_updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        // Concurrent insert won the unique race — return the winner.
        if (insertError.code === "23505") {
          const raced = await this.findExisting(food.source, food.sourceId);
          if (raced) {
            return {
              foodId: raced.id,
              created: false,
              food: { ...food, id: raced.id },
            };
          }
        }
        throw new UsdaMaterializeError(insertError.message);
      }
      createdFoodId = inserted.id;

      const { data: definitions, error: defError } = await this.client
        .from("nutrient_definitions")
        .select("id, stable_key")
        .in(
          "stable_key",
          nutrientEntries.map(([key]) => key),
        );
      if (defError) throw new UsdaMaterializeError(defError.message);

      const definitionIds = new Map(
        (definitions ?? []).map((row) => [row.stable_key as NutrientKey, row.id]),
      );
      const nutrientRows = nutrientEntries.flatMap(([key, amount]) => {
        const nutrientDefinitionId = definitionIds.get(key);
        return nutrientDefinitionId
          ? [
              {
                food_id: createdFoodId!,
                nutrient_definition_id: nutrientDefinitionId,
                amount_per_100g: amount,
                source,
                source_reference: `fdc:${food.sourceId}`,
              },
            ]
          : [];
      });
      if (!nutrientRows.length) {
        throw new UsdaMaterializeError(
          "Could not map USDA nutrients to local definitions",
        );
      }
      const { error: nutrientError } = await this.client
        .from("food_nutrients")
        .insert(nutrientRows);
      if (nutrientError) throw new UsdaMaterializeError(nutrientError.message);

      const { error: portionError } = await this.client.from("food_portions").insert({
        food_id: createdFoodId,
        label: food.serving?.label ?? "100 g",
        gram_weight: food.serving?.gramWeight ?? 100,
        source,
        is_default: true,
      });
      if (portionError) throw new UsdaMaterializeError(portionError.message);

      const { error: aliasError } = await this.client.from("food_aliases").insert({
        food_id: createdFoodId,
        alias: food.name,
        normalized_alias: food.name.trim().toLowerCase(),
        source,
        locale: "en",
      });
      if (aliasError && aliasError.code !== "23505") {
        throw new UsdaMaterializeError(aliasError.message);
      }

      return {
        foodId: createdFoodId,
        created: true,
        food: { ...food, id: createdFoodId },
      };
    } catch (error) {
      if (createdFoodId) {
        await this.client.from("foods").delete().eq("id", createdFoodId);
      }
      if (error instanceof UsdaMaterializeError) throw error;
      throw new UsdaMaterializeError(
        error instanceof Error ? error.message : "USDA materialization failed",
      );
    }
  }

  private async findExisting(source: string, sourceId: string) {
    const { data, error } = await this.client
      .from("foods")
      .select("id")
      .eq("source", source as FoodSource)
      .eq("source_id", sourceId)
      .maybeSingle();
    if (error) throw new UsdaMaterializeError(error.message);
    return data;
  }
}
