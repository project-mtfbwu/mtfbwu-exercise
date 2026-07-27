import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { getServerEnv } from "@/shared/config/env.server";
import type { Database, FoodSource } from "@/shared/database/types";
import type { NormalizedFood, NutrientKey } from "../sources/types";

export type CachedBarcodeLookup = {
  barcode: string;
  barcodeType: string | null;
  brandedProduct: {
    id: string;
    productName: string;
    brandName: string | null;
    servingSize: number | null;
    servingUnit: string | null;
    servingGrams: number | null;
    source: FoodSource | null;
    sourceId: string | null;
    imageUrl: string | null;
  };
  food: NormalizedFood;
};

export interface ProductCache {
  getByBarcode(barcode: string): Promise<CachedBarcodeLookup | null>;
  upsertFromNormalized(food: NormalizedFood): Promise<CachedBarcodeLookup>;
}

function normalizeBarcode(barcode: string): string {
  if (!/^[0-9A-Za-z._-]+$/.test(barcode)) throw new Error("Invalid barcode");
  return barcode;
}

function payloadHash(value: unknown): string | null {
  if (value == null) return null;
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

type ServiceClient = SupabaseClient<Database>;

/**
 * Server-only cache writer. Uses service-role so trusted cache rows cannot be
 * overwritten by a browser session.
 */
export class SupabaseProductCache implements ProductCache {
  private readonly client: ServiceClient;

  constructor(client?: ServiceClient) {
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

  async getByBarcode(barcode: string): Promise<CachedBarcodeLookup | null> {
    const normalizedBarcode = normalizeBarcode(barcode);
    const { data, error } = await this.client
      .from("barcodes")
      .select(
        `
        normalized_barcode,
        barcode_type,
        branded_products!inner(
          id,
          product_name,
          brand_name,
          serving_size,
          serving_unit,
          serving_grams,
          source,
          source_id,
          image_url,
          foods!inner(
            id,
            source,
            source_id,
            canonical_name,
            brand_name,
            food_nutrients(
              amount_per_100g,
              nutrient_definitions(stable_key)
            )
          )
        )
      `,
      )
      .eq("normalized_barcode", normalizedBarcode)
      .maybeSingle();
    if (error) throw new Error(`Could not read product cache: ${error.message}`);
    if (!data) return null;

    const row = data as unknown as {
      normalized_barcode: string;
      barcode_type: string | null;
      branded_products: {
        id: string;
        product_name: string;
        brand_name: string | null;
        serving_size: number | null;
        serving_unit: string | null;
        serving_grams: number | null;
        source: FoodSource | null;
        source_id: string | null;
        image_url: string | null;
        foods: {
          id: string;
          source: NormalizedFood["source"];
          source_id: string | null;
          canonical_name: string;
          brand_name: string | null;
          food_nutrients: Array<{
            amount_per_100g: number;
            nutrient_definitions: { stable_key: NutrientKey } | null;
          }>;
        };
      };
    };

    const food = row.branded_products.foods;
    const nutrientsPer100g = Object.fromEntries(
      food.food_nutrients.flatMap((nutrient) =>
        nutrient.nutrient_definitions
          ? [[nutrient.nutrient_definitions.stable_key, nutrient.amount_per_100g]]
          : [],
      ),
    ) as NormalizedFood["nutrientsPer100g"];

    return {
      barcode: row.normalized_barcode,
      barcodeType: row.barcode_type,
      brandedProduct: {
        id: row.branded_products.id,
        productName: row.branded_products.product_name,
        brandName: row.branded_products.brand_name,
        servingSize: row.branded_products.serving_size,
        servingUnit: row.branded_products.serving_unit,
        servingGrams: row.branded_products.serving_grams,
        source: row.branded_products.source,
        sourceId: row.branded_products.source_id,
        imageUrl: row.branded_products.image_url,
      },
      food: {
        id: food.id,
        source: food.source === "open_food_facts" ? "branded_cache" : food.source,
        sourceId: food.source_id,
        name: food.canonical_name,
        brand: food.brand_name ?? row.branded_products.brand_name,
        barcode: row.normalized_barcode,
        nutrientsPer100g,
        serving: row.branded_products.serving_grams
          ? {
              label:
                row.branded_products.serving_size && row.branded_products.serving_unit
                  ? `${row.branded_products.serving_size} ${row.branded_products.serving_unit}`
                  : `${row.branded_products.serving_grams} g`,
              gramWeight: row.branded_products.serving_grams,
            }
          : null,
        imageUrl: row.branded_products.image_url,
      },
    };
  }

  async upsertFromNormalized(food: NormalizedFood): Promise<CachedBarcodeLookup> {
    if (!food.barcode) {
      throw new Error("Barcode is required to cache a branded product");
    }
    const normalizedBarcode = normalizeBarcode(food.barcode);
    const cacheSource: FoodSource =
      food.source === "open_food_facts" || food.source === "branded_cache"
        ? "branded_cache"
        : food.source;

    const { data: storedFood, error: foodError } = await this.client
      .from("foods")
      .upsert(
        {
          canonical_name: food.name,
          normalized_name: food.name.trim().toLowerCase(),
          source: cacheSource,
          source_id: food.sourceId ?? normalizedBarcode,
          brand_name: food.brand,
          food_state: "packaged",
          user_editable: false,
          verified: false,
          source_organization:
            food.source === "open_food_facts" ? "Open Food Facts" : null,
          source_dataset: food.source,
          source_reference: food.sourceId,
          source_updated_at: new Date().toISOString(),
        },
        { onConflict: "source,source_id" },
      )
      .select("id")
      .single();
    if (foodError) throw new Error(`Could not write product cache: ${foodError.message}`);
    const foodId = storedFood.id;

    await this.upsertNutrients(foodId, food, cacheSource);

    const productSourceId = food.sourceId ?? normalizedBarcode;
    const { data: existingProduct } = await this.client
      .from("branded_products")
      .select("id")
      .eq("source", cacheSource)
      .eq("source_id", productSourceId)
      .maybeSingle();

    const productPayload = {
      food_id: foodId,
      product_name: food.name,
      brand_name: food.brand,
      manufacturer: food.brand,
      serving_size: food.serving?.gramWeight ?? null,
      serving_unit: food.serving ? "g" : null,
      serving_grams: food.serving?.gramWeight ?? null,
      image_url: food.imageUrl,
      source: cacheSource,
      source_id: productSourceId,
      source_payload:
        (food.rawPayload as Database["public"]["Tables"]["branded_products"]["Insert"]["source_payload"]) ??
        null,
      source_payload_hash: payloadHash(food.rawPayload),
      last_fetched_at: new Date().toISOString(),
    };

    const productWrite = existingProduct
      ? await this.client
          .from("branded_products")
          .update(productPayload)
          .eq("id", existingProduct.id)
          .select("id")
          .single()
      : await this.client
          .from("branded_products")
          .insert(productPayload)
          .select("id")
          .single();
    if (productWrite.error || !productWrite.data) {
      throw new Error(
        `Could not cache branded product: ${productWrite.error?.message ?? "unknown"}`,
      );
    }

    const { error: barcodeError } = await this.client.from("barcodes").upsert(
      {
        branded_product_id: productWrite.data.id,
        normalized_barcode: normalizedBarcode,
        barcode_type: null,
      },
      { onConflict: "normalized_barcode" },
    );
    if (barcodeError) throw new Error(`Could not cache barcode: ${barcodeError.message}`);

    const cached = await this.getByBarcode(normalizedBarcode);
    if (!cached) throw new Error("Cached barcode disappeared after write");
    return cached;
  }

  private async upsertNutrients(
    foodId: string,
    food: NormalizedFood,
    source: FoodSource,
  ) {
    const nutrientEntries = Object.entries(food.nutrientsPer100g).filter(
      (entry): entry is [NutrientKey, number] => typeof entry[1] === "number",
    );
    if (!nutrientEntries.length) return;

    const { data: definitions, error: definitionsError } = await this.client
      .from("nutrient_definitions")
      .select("id, stable_key")
      .in(
        "stable_key",
        nutrientEntries.map(([key]) => key),
      );
    if (definitionsError) {
      throw new Error(`Could not read nutrient definitions: ${definitionsError.message}`);
    }
    const definitionIds = new Map(
      (definitions ?? []).map((definition) => [
        definition.stable_key as NutrientKey,
        definition.id,
      ]),
    );
    const rows = nutrientEntries.flatMap(([key, amount]) => {
      const nutrientDefinitionId = definitionIds.get(key);
      return nutrientDefinitionId
        ? [
            {
              food_id: foodId,
              nutrient_definition_id: nutrientDefinitionId,
              amount_per_100g: amount,
              source,
              source_reference: food.sourceId,
            },
          ]
        : [];
    });
    if (!rows.length) return;
    const { error } = await this.client.from("food_nutrients").upsert(rows, {
      onConflict: "food_id,nutrient_definition_id",
    });
    if (error) throw new Error(`Could not cache nutrients: ${error.message}`);
  }
}
