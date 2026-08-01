"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/shared/config/constants";
import { createSupabaseServerClient } from "@/shared/database/server";
import { PROGRESS_PHOTOS_BUCKET, buildProgressPhotoPath } from "@/shared/storage/paths";
import {
  assertReplacementNotStale,
  interpretSoftDeleteResult,
  shouldRestorePreviousAfterFailedInsert,
} from "@/modules/progress-photos/replacement";
import {
  createPhotoSetSchema,
  deletePhotoSchema,
  deletePhotoSetSchema,
  replacePhotoSlotSchema,
  signedUrlSchema,
  uploadPhotoMetadataSchema,
} from "@/modules/progress-photos/schemas";
import type {
  ProgressPhotoSetView,
  ProgressPhotoSlotIdentity,
  ProgressPhotoView,
} from "@/modules/progress-photos/types";

type ActionResult =
  | {
      ok: true;
      message: string;
      id?: string;
      signedUrl?: string;
      previousStoragePath?: string | null;
    }
  | { ok: false; error: string; code?: "stale" | "missing_previous" };
type DbRow = Record<string, unknown>;
type DbError = { message: string } | null;

type PhotoQueryResult<T> = Promise<{
  data: T;
  error: DbError;
  count?: number | null;
}>;

type PhotoQueryBuilder = PromiseLike<PhotoQueryResult<DbRow[] | null>> & {
  eq(column: string, value: unknown): PhotoQueryBuilder;
  is(column: string, value: null): PhotoQueryBuilder;
  in(column: string, values: unknown[]): PhotoQueryBuilder;
  order(column: string, options: { ascending: boolean }): PhotoQueryBuilder;
  limit(count: number): PhotoQueryBuilder;
  maybeSingle(): PhotoQueryResult<DbRow | null>;
  select(columns: string, options?: { count: "exact"; head: true }): PhotoQueryBuilder;
  update(values: Record<string, unknown>): PhotoQueryBuilder;
};

type PhotoTableClient = {
  select(columns: string, options?: { count: "exact"; head: true }): PhotoQueryBuilder;
  upsert(values: Record<string, unknown>): PhotoQueryResult<null>;
  update(values: Record<string, unknown>): PhotoQueryBuilder;
};

type PhotoDb = {
  from(table: string): PhotoTableClient & PhotoQueryBuilder;
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<{ data: { signedUrl: string } | null; error: DbError }>;
      remove(paths: string[]): Promise<{ data: unknown; error: DbError }>;
    };
  };
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null } }>;
  };
};

function revalidateProgress() {
  revalidatePath(ROUTES.today);
  revalidatePath(ROUTES.progress);
  revalidatePath(ROUTES.profile);
}

async function requirePhotoDb(): Promise<{ db: PhotoDb; userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { db: supabase as unknown as PhotoDb, userId: user.id };
}

function photoView(row: DbRow, signedUrl?: string | null): ProgressPhotoView {
  return {
    id: String(row.id),
    slot: row.slot as ProgressPhotoView["slot"],
    customLabel: (row.custom_label as string | null) ?? null,
    mimeType: String(row.mime_type),
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    processed: Boolean(row.processed),
    capturedAt: String(row.captured_at),
    updatedAt: String(row.updated_at ?? row.captured_at),
    checksum: (row.checksum as string | null) ?? null,
    privateStoragePath: String(row.private_storage_path),
    signedUrl: signedUrl ?? null,
  };
}

function toSlotIdentity(photo: ProgressPhotoView): ProgressPhotoSlotIdentity {
  return {
    photoId: photo.id,
    slot: photo.slot,
    checksum: photo.checksum,
    updatedAt: photo.updatedAt,
    privateStoragePath: photo.privateStoragePath,
    signedUrl: photo.signedUrl ?? null,
  };
}

function setView(row: DbRow, photos: ProgressPhotoView[]): ProgressPhotoSetView {
  return {
    id: String(row.id),
    localDate: String(row.local_date),
    capturedAt: String(row.captured_at),
    timezone: String(row.timezone),
    title: (row.title as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    source: row.source as ProgressPhotoSetView["source"],
    photos,
  };
}

export async function createPhotoSetAction(
  input: Parameters<typeof createPhotoSetSchema.parse>[0],
): Promise<ActionResult> {
  const parsed = createPhotoSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requirePhotoDb();
  const setId = parsed.data.id ?? crypto.randomUUID();
  const { error } = await db.from("progress_photo_sets").upsert({
    id: setId,
    user_id: userId,
    local_date: parsed.data.localDate,
    timezone: parsed.data.timezone,
    title: parsed.data.title ?? null,
    note: parsed.data.note ?? null,
    source: "manual",
    captured_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Photo set created.", id: setId };
}

export async function uploadPhotoMetadataAction(
  input: Parameters<typeof uploadPhotoMetadataSchema.parse>[0],
): Promise<ActionResult> {
  const parsed = uploadPhotoMetadataSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requirePhotoDb();

  const { data: setRow } = await db
    .from("progress_photo_sets")
    .select("id")
    .eq("id", parsed.data.setId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!setRow) return { ok: false, error: "Photo set not found." };

  const photoId = parsed.data.photoId ?? crypto.randomUUID();
  const expectedPrefix = `${userId}/progress/${parsed.data.setId}/`;
  if (!parsed.data.storagePath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Storage path must match your private progress folder." };
  }

  const { error } = await db.from("progress_photos").upsert({
    id: photoId,
    progress_photo_set_id: parsed.data.setId,
    slot: parsed.data.slot,
    custom_label: parsed.data.customLabel ?? null,
    private_storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
    file_size_bytes: parsed.data.fileSizeBytes ?? null,
    checksum: parsed.data.checksum ?? null,
    processed: true,
    captured_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Photo metadata saved.", id: photoId };
}

export async function buildPhotoStoragePathAction(input: {
  setId: string;
  slot: string;
  photoId?: string;
}): Promise<{ path: string; photoId: string }> {
  const { userId } = await requirePhotoDb();
  const photoId = input.photoId ?? crypto.randomUUID();
  return {
    photoId,
    path: buildProgressPhotoPath({
      userId,
      setId: input.setId,
      slot: input.slot,
      photoId,
    }),
  };
}

export async function getPhotoSignedUrlByIdAction(
  photoId: string,
  expiresInSeconds = 300,
): Promise<ActionResult> {
  const { db, userId } = await requirePhotoDb();
  const { data: photo, error } = await db
    .from("progress_photos")
    .select("private_storage_path, progress_photo_set_id")
    .eq("id", photoId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!photo) {
    return { ok: false, error: "Photo unavailable (deleted or not found)." };
  }
  const { data: setRow, error: setError } = await db
    .from("progress_photo_sets")
    .select("user_id")
    .eq("id", photo.progress_photo_set_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (setError) return { ok: false, error: setError.message };
  if (!setRow || setRow.user_id !== userId) {
    return { ok: false, error: "Cannot access another user's photo." };
  }
  return getSignedPhotoUrlAction({
    storagePath: String(photo.private_storage_path),
    expiresInSeconds,
  });
}

export async function getSignedPhotoUrlAction(
  input: Parameters<typeof signedUrlSchema.parse>[0],
): Promise<ActionResult> {
  const parsed = signedUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requirePhotoDb();
  if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
    return { ok: false, error: "Cannot access another user's photos." };
  }
  const { data, error } = await db.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .createSignedUrl(parsed.data.storagePath, parsed.data.expiresInSeconds);
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Signed URL created.", signedUrl: data?.signedUrl };
}

export async function replacePhotoSlotAction(
  input: Parameters<typeof replacePhotoSlotSchema.parse>[0],
): Promise<ActionResult> {
  const { db } = await requirePhotoDb();
  const parsed = replacePhotoSlotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const { data: existing } = await db
    .from("progress_photos")
    .select("id, private_storage_path, updated_at, checksum")
    .eq("progress_photo_set_id", parsed.data.setId)
    .eq("slot", parsed.data.slot)
    .is("deleted_at", null)
    .maybeSingle();

  const currentActivePhotoId = existing?.id ? String(existing.id) : null;
  const previousStoragePath = existing?.private_storage_path
    ? String(existing.private_storage_path)
    : null;

  const staleCheck = assertReplacementNotStale({
    previousPhotoId: parsed.data.previousPhotoId,
    currentActivePhotoId,
  });
  if (!staleCheck.ok) {
    return { ok: false, error: staleCheck.message, code: staleCheck.code };
  }

  if (staleCheck.mode === "insert") {
    return uploadPhotoMetadataAction(parsed.data);
  }

  const previousPhotoId = parsed.data.previousPhotoId!;
  const softDeletedAt = new Date().toISOString();

  // Atomic expectation: soft-delete only the expected previous row while still active.
  const { data: softDeletedRows, error: softDeleteError } = await db
    .from("progress_photos")
    .update({ deleted_at: softDeletedAt })
    .eq("id", previousPhotoId)
    .eq("progress_photo_set_id", parsed.data.setId)
    .eq("slot", parsed.data.slot)
    .is("deleted_at", null)
    .select("id");

  if (softDeleteError) return { ok: false, error: softDeleteError.message };

  const softDeletedList = Array.isArray(softDeletedRows) ? softDeletedRows : [];
  const softDeleteCheck = interpretSoftDeleteResult({
    expectedPreviousPhotoId: previousPhotoId,
    softDeletedRowId: softDeletedList[0]?.id ? String(softDeletedList[0].id) : null,
    rowsAffected: softDeletedList.length,
  });
  if (!softDeleteCheck.ok) {
    return {
      ok: false,
      error: softDeleteCheck.message,
      code: softDeleteCheck.code,
    };
  }

  const uploadResult = await uploadPhotoMetadataAction(parsed.data);
  if (!uploadResult.ok) {
    const { data: activeAfter } = await db
      .from("progress_photos")
      .select("id")
      .eq("progress_photo_set_id", parsed.data.setId)
      .eq("slot", parsed.data.slot)
      .is("deleted_at", null)
      .maybeSingle();
    const { data: previousRow } = await db
      .from("progress_photos")
      .select("deleted_at")
      .eq("id", previousPhotoId)
      .maybeSingle();

    if (
      shouldRestorePreviousAfterFailedInsert({
        previousPhotoId,
        softDeletedAt,
        activePhotoIdAfterFailure: activeAfter?.id ? String(activeAfter.id) : null,
        previousRowDeletedAt: previousRow?.deleted_at
          ? String(previousRow.deleted_at)
          : null,
      })
    ) {
      await db
        .from("progress_photos")
        .update({ deleted_at: null })
        .eq("id", previousPhotoId)
        .eq("deleted_at", softDeletedAt);
    }
    return uploadResult;
  }

  revalidateProgress();
  return {
    ...uploadResult,
    message: "Photo slot replaced.",
    previousStoragePath,
  };
}

/**
 * Load active slot identities for a photo set (server-backed previousPhotoId).
 * Includes short-lived signed preview URLs.
 */
export async function loadPhotoSetSlotIdentitiesAction(
  setId: string,
  options?: { includeSignedUrls?: boolean; expiresInSeconds?: number },
): Promise<{
  setId: string;
  localDate: string | null;
  slots: ProgressPhotoSlotIdentity[];
}> {
  const { db, userId } = await requirePhotoDb();
  const { data: setRow, error: setError } = await db
    .from("progress_photo_sets")
    .select("id, local_date, user_id")
    .eq("id", setId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (setError) throw new Error(setError.message);
  if (!setRow) return { setId, localDate: null, slots: [] };

  const { data: photos, error } = await db
    .from("progress_photos")
    .select(
      "id, slot, custom_label, mime_type, width, height, processed, captured_at, updated_at, checksum, private_storage_path",
    )
    .eq("progress_photo_set_id", setId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  const includeSigned = options?.includeSignedUrls !== false;
  const expires = options?.expiresInSeconds ?? 300;
  const slots: ProgressPhotoSlotIdentity[] = [];

  for (const row of photos ?? []) {
    const view = photoView(row as DbRow);
    let signedUrl: string | null = null;
    if (includeSigned && view.privateStoragePath.startsWith(`${userId}/`)) {
      const { data } = await db.storage
        .from(PROGRESS_PHOTOS_BUCKET)
        .createSignedUrl(view.privateStoragePath, expires);
      signedUrl = data?.signedUrl ?? null;
    }
    slots.push(toSlotIdentity({ ...view, signedUrl }));
  }

  return {
    setId: String(setRow.id),
    localDate: setRow.local_date ? String(setRow.local_date) : null,
    slots,
  };
}

/** Find the owner's photo set for a local date (if any) and load slot identities. */
export async function loadPhotoSetForLocalDateAction(
  localDate: string,
  options?: { includeSignedUrls?: boolean },
): Promise<{
  setId: string | null;
  localDate: string;
  slots: ProgressPhotoSlotIdentity[];
}> {
  const { db, userId } = await requirePhotoDb();
  const { data: setRow, error } = await db
    .from("progress_photo_sets")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .is("deleted_at", null)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!setRow?.id) {
    return { setId: null, localDate, slots: [] };
  }
  const loaded = await loadPhotoSetSlotIdentitiesAction(String(setRow.id), options);
  return { setId: loaded.setId, localDate, slots: loaded.slots };
}

export async function deletePhotoSetAction(
  input: Parameters<typeof deletePhotoSetSchema.parse>[0],
): Promise<ActionResult> {
  const parsed = deletePhotoSetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db, userId } = await requirePhotoDb();
  const now = new Date().toISOString();
  const { error: setError } = await db
    .from("progress_photo_sets")
    .update({ deleted_at: now })
    .eq("id", parsed.data.setId)
    .eq("user_id", userId);
  if (setError) return { ok: false, error: setError.message };

  await db
    .from("progress_photos")
    .update({ deleted_at: now })
    .eq("progress_photo_set_id", parsed.data.setId);

  revalidateProgress();
  return { ok: true, message: "Photo set removed." };
}

export async function deletePhotoAction(
  input: Parameters<typeof deletePhotoSchema.parse>[0],
): Promise<ActionResult> {
  const parsed = deletePhotoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const { db } = await requirePhotoDb();
  const { error } = await db
    .from("progress_photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.photoId);
  if (error) return { ok: false, error: error.message };
  revalidateProgress();
  return { ok: true, message: "Photo removed." };
}

export async function listPhotoSetsAction(limit = 20): Promise<ProgressPhotoSetView[]> {
  const { db, userId } = await requirePhotoDb();
  const { data: sets, error } = await db
    .from("progress_photo_sets")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("local_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!sets?.length) return [];

  const setIds = sets.map((s: DbRow) => s.id);
  const { data: photos } = await db
    .from("progress_photos")
    .select("*")
    .in("progress_photo_set_id", setIds)
    .is("deleted_at", null);

  const photosBySet = new Map<string, ProgressPhotoView[]>();
  for (const p of photos ?? []) {
    const list = photosBySet.get(String(p.progress_photo_set_id)) ?? [];
    list.push(photoView(p));
    photosBySet.set(String(p.progress_photo_set_id), list);
  }

  return sets.map((s: DbRow) => setView(s, photosBySet.get(String(s.id)) ?? []));
}
