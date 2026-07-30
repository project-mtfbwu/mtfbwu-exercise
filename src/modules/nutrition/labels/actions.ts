"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import { NUTRITION_LABELS_BUCKET } from "@/shared/storage/paths";
import {
  createLabelCaptureSchema,
  discardLabelCaptureSchema,
  recordLabelCaptureOcrSchema,
  saveReviewedLabelProductSchema,
} from "./schemas";

type DbRow = Record<string, unknown>;
type NutritionDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same pattern as meals/actions.ts
  from(table: string): any;
  storage: { from(bucket: string): { remove(paths: string[]): Promise<unknown> } };
};

const REQUIRED_NUTRIENT_KEYS = [
  "energy_kcal",
  "protein_g",
  "carbohydrate_g",
  "fat_g",
  "fiber_g",
] as const;
const OPTIONAL_NUTRIENT_KEYS = ["sugar_g", "saturated_fat_g", "sodium_mg"] as const;

/** Food/branded_product sources trusted enough that a label capture must never overwrite them. */
const TRUSTED_FOOD_SOURCES = new Set(["branded_cache", "open_food_facts"]);

const RESOLVED_CAPTURE_STATUSES = new Set(["saved", "discarded"]);

type CreateCaptureResult = { ok: true; captureId: string } | { ok: false; error: string };

type SaveLabelProductResult =
  | { ok: true; foodId: string; brandedProductId: string; message: string }
  | { ok: false; error: string; conflict?: { foodId: string; brandedProductId: string } };

type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function relationRow(value: unknown): DbRow | null {
  if (Array.isArray(value)) return (value[0] as DbRow | null) ?? null;
  return (value as DbRow | null) ?? null;
}

async function authenticatedDb(): Promise<{ db: NutritionDb; userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { db: supabase as unknown as NutritionDb, userId: user.id } : null;
}

function assertOwnLabelPath(userId: string, path: string): boolean {
  return path.startsWith(`${userId}/nutrition-labels/`) && !path.includes("..");
}

async function removeLabelImage(db: NutritionDb, path: string | null | undefined) {
  if (!path || typeof path !== "string") return;
  await db.storage.from(NUTRITION_LABELS_BUCKET).remove([path]);
}

/**
 * Starts a new nutrition-label capture in `draft` status. The client
 * follows up by uploading a preprocessed photo, running OCR locally, and
 * eventually calling `saveReviewedLabelProductAction` once the user has
 * reviewed the extracted values.
 */
export async function createLabelCaptureAction(
  input: unknown,
): Promise<CreateCaptureResult> {
  const parsed = createLabelCaptureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid capture request." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };

  const { data, error } = await context.db
    .from("nutrition_label_captures")
    .insert({
      user_id: context.userId,
      barcode: parsed.data.barcode || null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not start label capture." };
  return { ok: true, captureId: String(data.id) };
}

/**
 * Records client-side OCR output after the preprocessed image has been
 * uploaded to the private `nutrition-labels` bucket (optional path).
 */
export async function recordLabelCaptureOcrAction(input: unknown): Promise<ActionResult> {
  const parsed = recordLabelCaptureOcrSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid OCR payload." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;
  const data = parsed.data;

  if (data.privateImagePath && !assertOwnLabelPath(userId, data.privateImagePath)) {
    return { ok: false, error: "Invalid label image path." };
  }

  const { data: capture, error: lookupError } = await db
    .from("nutrition_label_captures")
    .select("id, status")
    .eq("id", data.captureId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (lookupError || !capture) return { ok: false, error: "Label capture not found." };
  if (RESOLVED_CAPTURE_STATUSES.has(String(capture.status))) {
    return { ok: false, error: "This label capture has already been resolved." };
  }

  const { error } = await db
    .from("nutrition_label_captures")
    .update({
      status: "awaiting_review",
      private_image_path: data.privateImagePath ?? null,
      ocr_text: data.ocrText,
      extraction_json: data.extractionJson,
      language: data.language,
      confidence_summary: data.confidenceSummary ?? null,
    })
    .eq("id", data.captureId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "OCR recorded for review." };
}

/**
 * Promotes a human-reviewed label capture into a private custom food. Never
 * overwrites a barcode already claimed by the trusted product cache
 * (`branded_cache`/`open_food_facts`) or by another product — the caller
 * must either use the existing product, or resubmit with `forceOverride` to
 * save a private copy that is not barcode-linked to the shared catalog.
 */
export async function saveReviewedLabelProductAction(
  input: unknown,
): Promise<SaveLabelProductResult> {
  const parsed = saveReviewedLabelProductSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid label review.",
    };
  const data = parsed.data;
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data: capture, error: captureError } = await db
    .from("nutrition_label_captures")
    .select("*")
    .eq("id", data.captureId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (captureError || !capture) return { ok: false, error: "Label capture not found." };
  if (RESOLVED_CAPTURE_STATUSES.has(String(capture.status))) {
    return { ok: false, error: "This label capture has already been resolved." };
  }

  let barcodeConflict: {
    foodId: string;
    brandedProductId: string;
    trusted: boolean;
  } | null = null;
  if (data.barcode) {
    const { data: existingBarcode } = await db
      .from("barcodes")
      .select("branded_product_id, branded_products(id, food_id, source, foods(source))")
      .eq("normalized_barcode", data.barcode)
      .maybeSingle();
    if (existingBarcode) {
      const brandedProduct = relationRow(existingBarcode.branded_products);
      const food = brandedProduct ? relationRow(brandedProduct.foods) : null;
      const trustedSource =
        (typeof brandedProduct?.source === "string" &&
          TRUSTED_FOOD_SOURCES.has(brandedProduct.source)) ||
        (typeof food?.source === "string" && TRUSTED_FOOD_SOURCES.has(food.source));
      barcodeConflict = {
        foodId: String(brandedProduct?.food_id ?? ""),
        brandedProductId: String(brandedProduct?.id ?? ""),
        trusted: Boolean(trustedSource),
      };
    }
  }

  if (barcodeConflict && !data.forceOverride) {
    return {
      ok: false,
      error: barcodeConflict.trusted
        ? "This barcode already exists in the trusted product cache. Use the existing product, or resubmit with forceOverride to save a private copy."
        : "This barcode is already linked to another product. Use the existing product, or resubmit with forceOverride to save a private copy.",
      conflict: {
        foodId: barcodeConflict.foodId,
        brandedProductId: barcodeConflict.brandedProductId,
      },
    };
  }

  const isOverride = Boolean(barcodeConflict && data.forceOverride);
  // Deliberately not `user-custom:${food.id}` (as in the manual custom-food
  // flow) — tying provenance back to the capture makes it possible to trace
  // a saved product to the OCR session that produced it, and gives us a
  // stable, unique source_id even before the food row exists.
  const sourceId = `user-label:${data.captureId}`;

  const { data: food, error: foodError } = await db
    .from("foods")
    .insert({
      canonical_name: data.productName,
      normalized_name: data.productName.trim().toLowerCase(),
      source: "user_custom",
      source_id: sourceId,
      food_state: "packaged",
      brand_name: data.brand || null,
      verified: false,
      user_editable: true,
      source_organization: "User label capture (OCR)",
      source_dataset: "nutrition_label_ocr",
      source_reference: data.captureId,
    })
    .select("id")
    .single();
  if (foodError || !food)
    return { ok: false, error: foodError?.message ?? "Could not save product." };

  const { data: definitions, error: defError } = await db
    .from("nutrient_definitions")
    .select("id, stable_key")
    .in("stable_key", [...REQUIRED_NUTRIENT_KEYS, ...OPTIONAL_NUTRIENT_KEYS]);
  if (defError || !definitions?.length) {
    return { ok: false, error: "Could not look up nutrient definitions." };
  }
  const definitionIdByKey = new Map(
    definitions.map((row: DbRow) => [String(row.stable_key), String(row.id)]),
  );

  const nutrientInputs: Array<[string, number | undefined]> = [
    ["energy_kcal", data.nutrientsPer100g.energyKcal],
    ["protein_g", data.nutrientsPer100g.proteinG],
    ["carbohydrate_g", data.nutrientsPer100g.carbohydrateG],
    ["fat_g", data.nutrientsPer100g.fatG],
    ["fiber_g", data.nutrientsPer100g.fiberG],
    ["sugar_g", data.nutrientsPer100g.sugarG],
    ["saturated_fat_g", data.nutrientsPer100g.saturatedFatG],
    ["sodium_mg", data.nutrientsPer100g.sodiumMg],
  ];
  const nutrientRows = nutrientInputs
    .filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && definitionIdByKey.has(entry[0]),
    )
    .map(([key, amount]) => ({
      food_id: food.id,
      nutrient_definition_id: definitionIdByKey.get(key),
      amount_per_100g: amount,
      source: "user_custom",
    }));
  const { error: nutrientError } = await db.from("food_nutrients").insert(nutrientRows);
  if (nutrientError) return { ok: false, error: nutrientError.message };

  const { error: portionError } = await db.from("food_portions").insert({
    food_id: food.id,
    label: "Labeled serving",
    gram_weight: data.servingGrams,
    source: "user_custom",
    is_default: true,
  });
  if (portionError) return { ok: false, error: portionError.message };

  const { error: ownershipError } = await db.from("user_custom_foods").insert({
    user_id: userId,
    food_id: food.id,
    private: true,
    label_image_path: capture.private_image_path ?? null,
  });
  if (ownershipError) return { ok: false, error: ownershipError.message };

  const { data: brandedProduct, error: brandedError } = await db
    .from("branded_products")
    .insert({
      food_id: food.id,
      product_name: data.productName,
      brand_name: data.brand || null,
      manufacturer: data.brand || null,
      serving_size: data.servingGrams,
      serving_unit: "g",
      serving_grams: data.servingGrams,
      source: "user_custom",
      source_id: sourceId,
      source_payload: isOverride
        ? {
            requested_barcode: data.barcode,
            override_reason: "barcode already claimed by an existing product",
          }
        : null,
    })
    .select("id")
    .single();
  if (brandedError || !brandedProduct) {
    return {
      ok: false,
      error: brandedError?.message ?? "Could not save branded product.",
    };
  }

  // A conflicting barcode is never written to the shared cache table (it is
  // globally unique and already claimed); the override product is saved
  // without a queryable barcode link, which is the point of `forceOverride`.
  if (data.barcode && !barcodeConflict) {
    const { error: barcodeError } = await db.from("barcodes").insert({
      branded_product_id: brandedProduct.id,
      normalized_barcode: data.barcode,
      barcode_type: null,
    });
    if (barcodeError) return { ok: false, error: barcodeError.message };
  }

  await db.from("product_review_events").insert({
    user_id: userId,
    branded_product_id: brandedProduct.id,
    capture_id: data.captureId,
    event_type: isOverride ? "label_saved_as_override" : "label_saved",
    details_json: {
      foodId: food.id,
      brandedProductId: brandedProduct.id,
      hadBarcode: Boolean(data.barcode),
      forcedOverride: isOverride,
    },
  });

  const captureUpdate: DbRow = {
    status: "saved",
    retain_image: Boolean(data.retainImage),
    reviewed_values_json: {
      productName: data.productName,
      brand: data.brand ?? null,
      servingGrams: data.servingGrams,
      nutrientsPer100g: data.nutrientsPer100g,
    },
  };
  if (!data.retainImage) {
    const imagePath =
      typeof capture.private_image_path === "string" ? capture.private_image_path : null;
    await removeLabelImage(db, imagePath);
    captureUpdate.ocr_text = null;
    captureUpdate.private_image_path = null;
  }
  const { error: updateError } = await db
    .from("nutrition_label_captures")
    .update(captureUpdate)
    .eq("id", data.captureId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(ROUTES.today);
  return {
    ok: true,
    foodId: String(food.id),
    brandedProductId: String(brandedProduct.id),
    message: isOverride ? "Product saved as a private copy" : "Product saved",
  };
}

/** Marks a label capture as discarded and clears its OCR text/image pointer. */
export async function discardLabelCaptureAction(input: unknown): Promise<ActionResult> {
  const parsed = discardLabelCaptureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid capture." };
  const context = await authenticatedDb();
  if (!context) return { ok: false, error: "Session expired. Sign in again." };
  const { db, userId } = context;

  const { data: capture } = await db
    .from("nutrition_label_captures")
    .select("private_image_path")
    .eq("id", parsed.data.captureId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  await removeLabelImage(
    db,
    typeof capture?.private_image_path === "string" ? capture.private_image_path : null,
  );

  const { error } = await db
    .from("nutrition_label_captures")
    .update({
      status: "discarded",
      ocr_text: null,
      private_image_path: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.captureId)
    .eq("user_id", userId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Label capture discarded" };
}
