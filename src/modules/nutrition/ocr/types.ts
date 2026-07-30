/**
 * A single nutrient/serving value pulled out of an OCR'd nutrition label.
 * `value`/`unit` are always populated (even for low-confidence/ambiguous
 * reads) so the review UI has something concrete to show and let the user
 * correct — the parser intentionally never throws away a candidate value,
 * it only lowers `confidence` and adds `warnings`.
 */
export type NutritionFieldKey =
  | "energy_kcal"
  | "protein_g"
  | "carbohydrate_g"
  | "fat_g"
  | "fiber_g"
  | "sugar_g"
  | "saturated_fat_g"
  | "sodium_mg"
  | "serving_size_g";

/**
 * Whether an extracted value applies to the per-100g column, the
 * per-serving column, or could not be determined ("unknown" — e.g. no
 * heading was detected, or a dual-column row could not be disambiguated).
 */
export type NutritionFieldBasis = "per_100g" | "per_serving" | "unknown";

export interface ExtractedNutritionField {
  field: NutritionFieldKey;
  value: number;
  unit: string;
  basis: NutritionFieldBasis;
  /** The raw OCR line the value was extracted from, for reviewer context. */
  sourceText: string;
  /** 0–1 confidence that `value`/`basis` are correct. */
  confidence: number;
  warnings: string[];
}

export interface OcrProgress {
  /** tesseract.js status string, e.g. "loading language traineddata", "recognizing text". */
  status: string;
  /** 0–1 progress within the current status. */
  progress: number;
}

export interface OcrResult {
  text: string;
  /** tesseract.js overall page confidence, 0–100. */
  confidence: number;
}

/**
 * Engine-agnostic OCR contract so the review flow does not depend directly
 * on tesseract.js. `initialize` must be idempotent and safe to call before
 * every `recognize`; `cancel` aborts an in-flight recognition without
 * leaving the adapter unusable, `terminate` fully releases resources.
 */
export interface OcrAdapter {
  readonly isReady: boolean;
  initialize(lang?: string): Promise<void>;
  recognize(
    image: Blob,
    onProgress?: (progress: OcrProgress) => void,
  ): Promise<OcrResult>;
  cancel(): Promise<void>;
  terminate(): Promise<void>;
}

/** Per-field editable state for the label review form. */
export type LabelReviewFieldDraft = {
  value: number | null;
  confidence: number;
  warnings: string[];
  /** True once the user has manually edited the auto-extracted value. */
  edited: boolean;
};

type ReviewNutrientKey = Exclude<NutritionFieldKey, "serving_size_g">;

/**
 * Client-side form state for the label review screen: auto-extracted
 * fields merged with whatever the user has since edited, plus the
 * identifying product fields the user fills in by hand.
 */
export interface LabelReviewDraft {
  captureId: string;
  productName: string;
  brand: string;
  barcode: string;
  /** Basis the reviewed values are being saved as (always resolved by the user before save). */
  basis: NutritionFieldBasis;
  servingGrams: LabelReviewFieldDraft;
  fields: Record<ReviewNutrientKey, LabelReviewFieldDraft>;
  /** Warnings that apply to the capture as a whole rather than one field. */
  overallWarnings: string[];
}
