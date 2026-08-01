"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import {
  normalizeLengthToCm,
  normalizeMeasurementValue,
  normalizeWeightToKg,
} from "@/modules/measurements/units";
import {
  dateRangeSchema,
  deleteMeasurementEntrySchema,
  deleteWeightEntrySchema,
  enableMeasurementSchema,
  createCustomMeasurementSchema,
  saveMeasurementEntrySchema,
  saveWeightEntrySchema,
} from "@/modules/measurements/schemas";
import type {
  DateRangeSummary,
  MeasurementDefinitionView,
  MeasurementEntryView,
  UserMeasurementDefinitionView,
  WeightEntryView,
} from "@/modules/measurements/types";
import {
  weightChangeSummary,
  measurementChangeSummary,
  type SameDayChartMode,
} from "@/modules/measurements/calculations";
import { shiftLocalDate } from "@/shared/utils/local-date";

type ActionResult =
  { ok: true; message: string; id?: string } | { ok: false; error: string };
type DbRow = Record<string, unknown>;
type ProgressDb = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function revalidateProgress() {
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.progress);
  revalidatePath(ROUTES.profile);
}

async function requireProgressDb(): Promise<{ db: ProgressDb; userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { db: supabase, userId: user.id };
}

function weightView(row: DbRow): WeightEntryView {
  return {
    id: String(row.id),
    localDate: String(row.local_date),
    recordedAt: String(row.recorded_at),
    timezone: String(row.timezone),
    weightValue: row.weight_value != null ? Number(row.weight_value) : null,
    weightUnit: String(row.weight_unit) as "kg" | "lb",
    normalizedKg: row.normalized_kg != null ? Number(row.normalized_kg) : null,
    source: row.source as WeightEntryView["source"],
    note: (row.note as string | null) ?? null,
  };
}

function measurementEntryView(entry: DbRow, values: DbRow[]): MeasurementEntryView {
  return {
    id: String(entry.id),
    localDate: String(entry.local_date),
    recordedAt: String(entry.recorded_at),
    timezone: String(entry.timezone),
    title: (entry.title as string | null) ?? null,
    source: entry.source as MeasurementEntryView["source"],
    note: (entry.note as string | null) ?? null,
    values: values.map((v) => ({
      id: String(v.id),
      userMeasurementDefinitionId: String(v.user_measurement_definition_id),
      side: v.side as MeasurementEntryView["values"][0]["side"],
      value: Number(v.value),
      unit: String(v.unit),
      normalizedValue: Number(v.normalized_value),
      displayName: String(v.display_name ?? "Measurement"),
    })),
  };
}

export async function listMeasurementCatalogAction(): Promise<
  MeasurementDefinitionView[]
> {
  const { db } = await requireProgressDb();
  const { data, error } = await db
    .from("measurement_definitions")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => ({
    id: String(row.id),
    stableKey: String(row.stable_key),
    displayName: String(row.display_name),
    category: row.category as MeasurementDefinitionView["category"],
    defaultUnit: String(row.default_unit),
    supportsSide: Boolean(row.supports_side),
    displayOrder: Number(row.display_order),
  }));
}

export async function listUserMeasurementsAction(): Promise<
  UserMeasurementDefinitionView[]
> {
  const { db, userId } = await requireProgressDb();
  const { data, error } = await db
    .from("user_measurement_definitions")
    .select("*, measurement_definitions(stable_key, display_name)")
    .eq("user_id", userId)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: DbRow) => {
    const catalog = row.measurement_definitions as DbRow | null;
    return {
      id: String(row.id),
      measurementDefinitionId: row.measurement_definition_id
        ? String(row.measurement_definition_id)
        : null,
      customName: (row.custom_name as string | null) ?? null,
      unit: String(row.unit),
      sideMode: row.side_mode as UserMeasurementDefinitionView["sideMode"],
      enabled: Boolean(row.enabled),
      displayOrder: Number(row.display_order),
      displayName:
        (row.custom_name as string | null)?.trim() ||
        String(catalog?.display_name ?? "Measurement"),
      stableKey: catalog?.stable_key ? String(catalog.stable_key) : null,
    };
  });
}

export async function enableMeasurementAction(
  input: z.infer<typeof enableMeasurementSchema>,
): Promise<ActionResult> {
  const parsed = enableMeasurementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireProgressDb();

  const { data: catalog } = await db
    .from("measurement_definitions")
    .select("default_unit, supports_side")
    .eq("id", parsed.data.measurementDefinitionId)
    .maybeSingle();
  if (!catalog) return { ok: false, error: "Measurement not found in catalog." };

  const unit = parsed.data.unit ?? String(catalog.default_unit);
  const sideMode = catalog.supports_side ? "left_right" : "not_applicable";

  const { data: existing } = await db
    .from("user_measurement_definitions")
    .select("id")
    .eq("user_id", userId)
    .eq("measurement_definition_id", parsed.data.measurementDefinitionId)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("user_measurement_definitions")
      .update({ enabled: true, unit, side_mode: sideMode })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("user_measurement_definitions").insert({
      user_id: userId,
      measurement_definition_id: parsed.data.measurementDefinitionId,
      unit,
      side_mode: sideMode,
      enabled: true,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidateProgress();
  return { ok: true, message: "Measurement enabled." };
}

export async function disableMeasurementAction(input: {
  measurementDefinitionId: string;
}): Promise<ActionResult> {
  const { db, userId } = await requireProgressDb();
  const { error } = await db
    .from("user_measurement_definitions")
    .update({ enabled: false })
    .eq("user_id", userId)
    .eq("measurement_definition_id", input.measurementDefinitionId);
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Measurement disabled." };
}

export async function createCustomMeasurementAction(
  input: z.infer<typeof createCustomMeasurementSchema>,
): Promise<ActionResult> {
  const parsed = createCustomMeasurementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireProgressDb();
  const { data, error } = await db
    .from("user_measurement_definitions")
    .insert({
      user_id: userId,
      custom_name: parsed.data.customName,
      unit: parsed.data.unit,
      side_mode: parsed.data.sideMode,
      enabled: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Custom measurement created.", id: String(data.id) };
}

export async function saveWeightEntryAction(
  input: z.infer<typeof saveWeightEntrySchema>,
): Promise<ActionResult> {
  const parsed = saveWeightEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireProgressDb();

  let normalizedKg: number;
  try {
    normalizedKg = normalizeWeightToKg(parsed.data.weightValue, parsed.data.weightUnit);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid weight." };
  }

  const row = {
    id: parsed.data.id,
    user_id: userId,
    local_date: parsed.data.localDate,
    timezone: parsed.data.timezone,
    weight_value: parsed.data.weightValue,
    weight_unit: parsed.data.weightUnit,
    normalized_kg: normalizedKg,
    source: "manual" as const,
    note: parsed.data.note ?? null,
    recorded_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("body_weight_entries")
    .upsert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Weight saved.", id: String(data.id) };
}

export async function deleteWeightEntryAction(
  input: z.infer<typeof deleteWeightEntrySchema>,
): Promise<ActionResult> {
  const parsed = deleteWeightEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireProgressDb();
  const { error } = await db
    .from("body_weight_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Weight entry removed." };
}

export async function saveMeasurementEntryAction(
  input: z.infer<typeof saveMeasurementEntrySchema>,
): Promise<ActionResult> {
  const parsed = saveMeasurementEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireProgressDb();

  const entryId = parsed.data.id ?? crypto.randomUUID();
  const { error: entryError } = await db.from("body_measurement_entries").upsert({
    id: entryId,
    user_id: userId,
    local_date: parsed.data.localDate,
    timezone: parsed.data.timezone,
    title: parsed.data.title ?? null,
    note: parsed.data.note ?? null,
    source: "manual" as const,
    recorded_at: new Date().toISOString(),
  });
  if (entryError) return { ok: false, error: entryError.message };

  const valueRows = [];
  for (const v of parsed.data.values) {
    let normalized: number;
    try {
      normalized =
        v.unit === "cm" || v.unit === "in"
          ? normalizeLengthToCm(v.value, v.unit)
          : normalizeMeasurementValue(v.value, v.unit);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Invalid value." };
    }
    valueRows.push({
      body_measurement_entry_id: entryId,
      user_measurement_definition_id: v.userMeasurementDefinitionId,
      side: v.side,
      value: v.value,
      unit: v.unit,
      normalized_value: normalized,
    });
  }

  const { error: valuesError } = await db
    .from("body_measurement_values")
    .upsert(valueRows, {
      onConflict: "body_measurement_entry_id,user_measurement_definition_id,side",
    });
  if (valuesError) return { ok: false, error: valuesError.message };

  revalidateProgress();
  return { ok: true, message: "Measurements saved.", id: entryId };
}

export async function deleteMeasurementEntryAction(
  input: z.infer<typeof deleteMeasurementEntrySchema>,
): Promise<ActionResult> {
  const parsed = deleteMeasurementEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireProgressDb();
  const { error } = await db
    .from("body_measurement_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Measurement entry removed." };
}

export async function listRecentWeightEntriesAction(
  limit = 10,
): Promise<WeightEntryView[]> {
  const { db, userId } = await requireProgressDb();
  const { data, error } = await db
    .from("body_weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("local_date", { ascending: false })
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(weightView);
}

export async function listRecentMeasurementEntriesAction(
  limit = 10,
): Promise<MeasurementEntryView[]> {
  const { db, userId } = await requireProgressDb();
  const { data: entries, error } = await db
    .from("body_measurement_entries")
    .select("*")
    .eq("user_id", userId)
    .order("local_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!entries?.length) return [];

  const entryIds = entries.map((e) => String(e.id));
  const { data: values } = await db
    .from("body_measurement_values")
    .select(
      "*, user_measurement_definitions(custom_name, measurement_definitions(display_name))",
    )
    .in("body_measurement_entry_id", entryIds);

  const valuesByEntry = new Map<string, DbRow[]>();
  for (const v of values ?? []) {
    const umd = v.user_measurement_definitions as DbRow | null;
    const catalog = umd?.measurement_definitions as DbRow | null;
    const displayName =
      (umd?.custom_name as string | null)?.trim() ||
      String(catalog?.display_name ?? "Measurement");
    const enriched = { ...v, display_name: displayName };
    const list = valuesByEntry.get(String(v.body_measurement_entry_id)) ?? [];
    list.push(enriched);
    valuesByEntry.set(String(v.body_measurement_entry_id), list);
  }

  return entries.map((entry: DbRow) =>
    measurementEntryView(entry, valuesByEntry.get(String(entry.id)) ?? []),
  );
}

function rangeStartDate(endDate: string, range: z.infer<typeof dateRangeSchema>): string {
  if (range === "all") return "1970-01-01";
  const days = { "7d": 7, "30d": 30, "90d": 90, "180d": 180, "365d": 365 }[range];
  return shiftLocalDate(endDate, -(days - 1));
}

export async function loadDateRangeSummaryAction(
  endDate: string,
  range: z.infer<typeof dateRangeSchema>,
): Promise<DateRangeSummary> {
  const parsedRange = dateRangeSchema.safeParse(range);
  if (!parsedRange.success) throw new Error(parsedRange.error.message);
  const startDate = rangeStartDate(endDate, parsedRange.data);
  const { db, userId } = await requireProgressDb();

  const { data: weights } = await db
    .from("body_weight_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .order("local_date", { ascending: true });

  const weightViews = (weights ?? []).map(weightView);
  const normalized = weightViews
    .map((w: WeightEntryView) => w.normalizedKg)
    .filter((v: number | null): v is number => v != null);

  return {
    range: parsedRange.data,
    startDate,
    endDate,
    weightEntries: weightViews,
    measurementEntries: await listRecentMeasurementEntriesAction(50),
    latestWeightKg: normalized.length ? normalized[normalized.length - 1]! : null,
    earliestWeightKg: normalized.length ? normalized[0]! : null,
  };
}

export async function describeWeightChangeAction(
  endDate: string,
  range: z.infer<typeof dateRangeSchema>,
): Promise<{ summary: ReturnType<typeof weightChangeSummary> }> {
  const data = await loadDateRangeSummaryAction(endDate, range);
  return { summary: weightChangeSummary(data.earliestWeightKg, data.latestWeightKg) };
}

export async function getWeightChartDataAction(
  endDate: string,
  range: z.infer<typeof dateRangeSchema>,
  mode: SameDayChartMode = "latest",
): Promise<{ points: { localDate: string; value: number }[] }> {
  const data = await loadDateRangeSummaryAction(endDate, range);
  const { aggregateSameDayValues } = await import("@/modules/measurements/calculations");
  const dated = data.weightEntries
    .filter((w) => w.normalizedKg != null)
    .map((w) => ({
      localDate: w.localDate,
      value: w.normalizedKg!,
      recordedAt: w.recordedAt,
    }));
  const points = aggregateSameDayValues(dated, mode).map((p) => ({
    localDate: p.localDate,
    value: p.value,
  }));
  return { points };
}

export async function getMeasurementChartDataAction(input: {
  userMeasurementDefinitionId: string;
  side: "left" | "right" | "not_applicable";
  range: z.infer<typeof dateRangeSchema>;
  endDate: string;
}): Promise<{
  points: { localDate: string; value: number }[];
  unit: string;
  displayName: string;
  summary: ReturnType<typeof measurementChangeSummary>;
}> {
  const parsedRange = dateRangeSchema.safeParse(input.range);
  if (!parsedRange.success) throw new Error(parsedRange.error.message);
  const startDate = rangeStartDate(input.endDate, parsedRange.data);
  const { db, userId } = await requireProgressDb();

  const { data: umd, error: umdError } = await db
    .from("user_measurement_definitions")
    .select("unit, custom_name, measurement_definitions(display_name)")
    .eq("id", input.userMeasurementDefinitionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (umdError) throw new Error(umdError.message);
  if (!umd) throw new Error("Measurement not found.");

  const catalog = umd.measurement_definitions as DbRow | null;
  const displayName =
    (umd.custom_name as string | null)?.trim() ||
    String(catalog?.display_name ?? "Measurement");
  const unit = String(umd.unit);

  const { data: entries, error: entriesError } = await db
    .from("body_measurement_entries")
    .select("id, local_date, recorded_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("local_date", startDate)
    .lte("local_date", input.endDate)
    .order("local_date", { ascending: true });
  if (entriesError) throw new Error(entriesError.message);
  if (!entries?.length) {
    return {
      points: [],
      unit,
      displayName,
      summary: measurementChangeSummary(null, null, displayName, unit),
    };
  }

  const entryIds = entries.map((entry) => String(entry.id));
  const { data: values, error: valuesError } = await db
    .from("body_measurement_values")
    .select("body_measurement_entry_id, normalized_value, side")
    .in("body_measurement_entry_id", entryIds)
    .eq("user_measurement_definition_id", input.userMeasurementDefinitionId)
    .eq("side", input.side);
  if (valuesError) throw new Error(valuesError.message);

  const valueByEntry = new Map<string, number>();
  for (const value of values ?? []) {
    valueByEntry.set(
      String(value.body_measurement_entry_id),
      Number(value.normalized_value),
    );
  }

  const dated = entries
    .map((entry) => {
      const normalized = valueByEntry.get(String(entry.id));
      if (normalized == null) return null;
      return {
        localDate: String(entry.local_date),
        value: normalized,
        recordedAt: String(entry.recorded_at),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const { aggregateSameDayValues } = await import("@/modules/measurements/calculations");
  const aggregated = aggregateSameDayValues(dated, "latest");
  const points = aggregated.map((point) => ({
    localDate: point.localDate,
    value: point.value,
  }));
  const normalizedValues = points.map((point) => point.value);
  return {
    points,
    unit,
    displayName,
    summary: measurementChangeSummary(
      normalizedValues.length ? normalizedValues[0]! : null,
      normalizedValues.length ? normalizedValues[normalizedValues.length - 1]! : null,
      displayName,
      unit,
    ),
  };
}

export async function getProgressSummaryCountsAction(): Promise<{
  weightCount: number;
  measurementCount: number;
  photoSetCount: number;
}> {
  const { db, userId } = await requireProgressDb();
  const [weights, measurements, photoSets] = await Promise.all([
    db
      .from("body_weight_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("body_measurement_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db
      .from("progress_photo_sets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  return {
    weightCount: weights.count ?? 0,
    measurementCount: measurements.count ?? 0,
    photoSetCount: photoSets.count ?? 0,
  };
}
