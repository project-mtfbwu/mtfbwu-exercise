"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import type { ProgressComparisonView } from "@/modules/progress-photos/types";

type ActionResult =
  { ok: true; message: string; id?: string } | { ok: false; error: string };
type ProgressDb = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const saveComparisonSchema = z.object({
  id: z.string().uuid().optional(),
  comparisonType: z.enum(["photo", "weight", "measurement", "mixed"]).default("mixed"),
  leftPhotoSetId: z.string().uuid().nullable().optional(),
  rightPhotoSetId: z.string().uuid().nullable().optional(),
  leftDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  rightDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  measurementKeys: z.array(z.string()).default([]),
  title: z.string().max(200).nullable().optional(),
});

async function requireDb(): Promise<{ db: ProgressDb; userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { db: supabase, userId: user.id };
}

export async function saveComparisonAction(
  input: z.infer<typeof saveComparisonSchema>,
): Promise<ActionResult> {
  const parsed = saveComparisonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requireDb();
  const id = parsed.data.id ?? crypto.randomUUID();
  const { error } = await db.from("progress_comparisons").upsert({
    id,
    user_id: userId,
    comparison_type: parsed.data.comparisonType,
    left_photo_set_id: parsed.data.leftPhotoSetId ?? null,
    right_photo_set_id: parsed.data.rightPhotoSetId ?? null,
    left_date: parsed.data.leftDate ?? null,
    right_date: parsed.data.rightDate ?? null,
    measurement_keys: parsed.data.measurementKeys,
    title: parsed.data.title ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTES.progress);
  return { ok: true, message: "Comparison saved.", id };
}

export async function listComparisonsAction(): Promise<ProgressComparisonView[]> {
  const { db, userId } = await requireDb();
  const { data, error } = await db
    .from("progress_comparisons")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    comparisonType: row.comparison_type as ProgressComparisonView["comparisonType"],
    leftPhotoSetId: row.left_photo_set_id ? String(row.left_photo_set_id) : null,
    rightPhotoSetId: row.right_photo_set_id ? String(row.right_photo_set_id) : null,
    leftDate: row.left_date ? String(row.left_date) : null,
    rightDate: row.right_date ? String(row.right_date) : null,
    measurementKeys: (row.measurement_keys as string[]) ?? [],
    title: (row.title as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

export async function deleteComparisonAction(id: string): Promise<ActionResult> {
  const { db, userId } = await requireDb();
  const { error } = await db
    .from("progress_comparisons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(ROUTES.progress);
  return { ok: true, message: "Comparison removed." };
}
