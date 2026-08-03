"use server";

import { createSupabaseServerClient } from "@/shared/database/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/shared/config/env.server";
import { isFeatureEnabled } from "@/shared/config/feature-flags";
import { checkRateLimit } from "@/shared/security/rate-limit";
import { accountRateLimitKey } from "@/shared/security/rate-limit-key";
import { logger, createRequestId } from "@/shared/observability/logger";
import {
  APP_IDENTITY,
  resolveBuildIdentifier,
  resolveReleaseVersion,
} from "@/shared/config/app-identity";
import { NUTRITION_LABELS_BUCKET, PROGRESS_PHOTOS_BUCKET } from "@/shared/storage/paths";
import {
  buildSignedFileManifest,
  SIGNED_LINK_TTL_SECONDS,
  type PrivateFileCandidate,
  type PrivateFileManifest,
} from "@/modules/account/export-files";
import {
  collectStoragePathsRecursive,
  runDeletionOrchestrator,
  type DeletionStageResult,
} from "@/modules/account/deletion-orchestrator";

export type AccountExportPayload = {
  exportVersion: 2;
  exportedAt: string;
  app: { product: string; version: string; buildSha: string };
  profile: Record<string, unknown> | null;
  notes: string[];
  modules: unknown[];
  nutrition: { mealLogCount: number; customFoodCount: number };
  workouts: { planCount: number; sessionCount: number };
  rehab: { planCount: number; sessionCount: number };
  progress: {
    weightEntryCount: number;
    measurementEntryCount: number;
    photoSetCount: number;
  };
  trackers: {
    hydrationEntryCount: number;
    meditationSessionCount: number;
    sleepSessionCount: number;
    supplementIntakeCount: number;
    customEventCount: number;
  };
  privateFiles: PrivateFileManifest;
};

type CountClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options: { count: "exact"; head: true },
    ) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{ count: number | null; error: { message: string } | null }>;
    };
  };
};

async function countForUser(
  client: CountClient,
  table: string,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return 0;
  return count ?? 0;
}

function createAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function collectPrivateFileCandidates(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ candidates: PrivateFileCandidate[]; deletedPaths: Set<string> }> {
  const deletedPaths = new Set<string>();
  const candidates: PrivateFileCandidate[] = [];

  const { data: photoSets } = await supabase
    .from("progress_photo_sets")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const setIds = (photoSets ?? []).map((s) => String(s.id));
  if (setIds.length > 0) {
    const { data: photos } = await supabase
      .from("progress_photos")
      .select("id, private_storage_path, mime_type, deleted_at, progress_photo_set_id")
      .in("progress_photo_set_id", setIds);

    for (const photo of photos ?? []) {
      const path = String(photo.private_storage_path);
      if (photo.deleted_at) {
        deletedPaths.add(path);
        continue;
      }
      candidates.push({
        kind: "progress_photo",
        bucket: PROGRESS_PHOTOS_BUCKET,
        path,
        metadataId: String(photo.id),
        mimeType: photo.mime_type ? String(photo.mime_type) : null,
      });
    }
  }

  const { data: labels } = await supabase
    .from("nutrition_label_captures")
    .select("id, private_image_path, deleted_at, retain_image")
    .eq("user_id", userId);

  for (const label of labels ?? []) {
    const path = label.private_image_path ? String(label.private_image_path) : "";
    if (!path) continue;
    if (label.deleted_at || label.retain_image === false) {
      deletedPaths.add(path);
      continue;
    }
    candidates.push({
      kind: "nutrition_label",
      bucket: NUTRITION_LABELS_BUCKET,
      path,
      metadataId: String(label.id),
      mimeType: "image/jpeg",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.avatar_path) {
    const path = String(profile.avatar_path);
    // Avatar bucket is not yet provisioned; include path for completeness when set.
    candidates.push({
      kind: "avatar",
      bucket: "avatars",
      path,
      metadataId: userId,
      mimeType: null,
    });
  }

  // Rehab media: no dedicated storage column in current schema — intentionally empty.

  return { candidates, deletedPaths };
}

/** Owner-only structured export with short-lived signed private-file links. */
export async function buildAccountExport(userId: string): Promise<AccountExportPayload> {
  const supabase = await createSupabaseServerClient();
  const countClient = supabase as unknown as CountClient;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, timezone, locale, units_system, animation_mode, onboarding_completed, onboarding_version, analytics_consent, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  const { data: modules } = await supabase
    .from("user_modules")
    .select("id, enabled, custom_label, target_value, target_unit, module_definition_id")
    .eq("user_id", userId);

  const [
    mealLogCount,
    customFoodCount,
    planCount,
    sessionCount,
    rehabPlanCount,
    rehabSessionCount,
    weightEntryCount,
    measurementEntryCount,
    photoSetCount,
    hydrationEntryCount,
    meditationSessionCount,
    sleepSessionCount,
    supplementIntakeCount,
    customEventCount,
  ] = await Promise.all([
    countForUser(countClient, "meal_logs", userId),
    countForUser(countClient, "user_custom_foods", userId),
    countForUser(countClient, "workout_plans", userId),
    countForUser(countClient, "workout_sessions", userId),
    countForUser(countClient, "rehab_plans", userId),
    countForUser(countClient, "rehab_sessions", userId),
    countForUser(countClient, "body_weight_entries", userId),
    countForUser(countClient, "body_measurement_entries", userId),
    countForUser(countClient, "progress_photo_sets", userId),
    countForUser(countClient, "hydration_entries", userId),
    countForUser(countClient, "meditation_sessions", userId),
    countForUser(countClient, "sleep_sessions", userId),
    countForUser(countClient, "supplement_intakes", userId),
    countForUser(countClient, "tracker_events", userId),
  ]);

  const { candidates, deletedPaths } = await collectPrivateFileCandidates(
    supabase as unknown as SupabaseClient,
    userId,
  );

  const privateFiles = await buildSignedFileManifest({
    userId,
    candidates,
    deletedPaths,
    ttlSeconds: SIGNED_LINK_TTL_SECONDS,
    createSignedUrl: async (bucket, path, expiresIn) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      if (error) return { signedUrl: null, error: error.message };
      return { signedUrl: data?.signedUrl ?? null };
    },
  });

  return {
    exportVersion: 2,
    exportedAt: new Date().toISOString(),
    app: {
      product: APP_IDENTITY.product,
      version: resolveReleaseVersion(),
      buildSha: resolveBuildIdentifier(),
    },
    profile: profile as Record<string, unknown> | null,
    notes: [
      "User-recorded fitness data export. Not medical advice.",
      "Private files use short-lived signed URLs in privateFiles — not public URLs.",
      "ZIP packaging of binaries is deferred; keep the signed-link manifest private.",
      "Signed media links expire; do not share this file publicly.",
    ],
    modules: modules ?? [],
    nutrition: { mealLogCount, customFoodCount },
    workouts: { planCount, sessionCount },
    rehab: { planCount: rehabPlanCount, sessionCount: rehabSessionCount },
    progress: { weightEntryCount, measurementEntryCount, photoSetCount },
    trackers: {
      hydrationEntryCount,
      meditationSessionCount,
      sleepSessionCount,
      supplementIntakeCount,
      customEventCount,
    },
    privateFiles,
  };
}

export async function requestAccountExportAction(): Promise<
  | { ok: true; payload: AccountExportPayload }
  | { ok: false; error: string; retryAfterSec?: number }
> {
  if (!isFeatureEnabled("account_export")) {
    return { ok: false, error: "Account export is disabled." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const limited = await checkRateLimit({
    key: accountRateLimitKey("export", user.id),
    limit: 3,
    windowMs: 60 * 60_000,
    onProviderFailure: "fail_closed",
  });
  if (!limited.ok) {
    return {
      ok: false,
      error: "Export rate limit reached. Try again later.",
      retryAfterSec: limited.retryAfterSec,
    };
  }

  const requestId = createRequestId();
  const { data: requestRow } = await supabase
    .from("account_export_requests")
    .insert({
      user_id: user.id,
      status: "processing",
    })
    .select("id")
    .maybeSingle();

  try {
    const payload = await buildAccountExport(user.id);
    const expiresAt = payload.privateFiles.expiresAt;
    if (requestRow?.id) {
      await supabase
        .from("account_export_requests")
        .update({
          status: "completed",
          expires_at: expiresAt,
          completed_at: new Date().toISOString(),
          file_count: payload.privateFiles.includedCount,
          failed_file_count: payload.privateFiles.failedCount,
          manifest_summary: {
            approach: payload.privateFiles.approach,
            includedCount: payload.privateFiles.includedCount,
            failedCount: payload.privateFiles.failedCount,
            excludedDeletedCount: payload.privateFiles.excludedDeletedCount,
          },
          last_error:
            payload.privateFiles.failedCount > 0
              ? `partial_file_failures:${payload.privateFiles.failedCount}`
              : null,
        })
        .eq("id", requestRow.id);
    }

    logger.info("account_export_completed", {
      requestId,
      route: "account.export",
      result: "ok",
      userIdHash: user.id.slice(0, 8),
      fileCount: payload.privateFiles.includedCount,
      failedFileCount: payload.privateFiles.failedCount,
    });
    return { ok: true, payload };
  } catch (error) {
    logger.error("account_export_failed", {
      requestId,
      route: "account.export",
      result: "error",
      errorCode: "export_failed",
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

async function persistDeletionStage(
  admin: SupabaseClient,
  userId: string,
  result: DeletionStageResult,
): Promise<void> {
  const status =
    result.stage === "completed"
      ? "completed"
      : result.stage === "failed"
        ? "failed"
        : "processing";
  await admin
    .from("account_deletion_requests")
    .update({
      status,
      cleanup_stage: result.stage,
      cleanup_detail: {
        detail: result.detail ?? null,
        deletedPaths: result.deletedPaths ?? [],
        failedPaths: result.failedPaths ?? [],
        at: new Date().toISOString(),
      },
      completed_at: result.stage === "completed" ? new Date().toISOString() : null,
      last_error: result.ok ? null : (result.detail ?? result.stage),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function requestAccountDeletionAction(input: {
  confirmation: string;
}): Promise<
  { ok: true; message: string } | { ok: false; error: string; retryAfterSec?: number }
> {
  if (!isFeatureEnabled("account_deletion")) {
    return { ok: false, error: "Account deletion is disabled." };
  }
  if (input.confirmation !== "DELETE") {
    return { ok: false, error: "Type DELETE exactly to confirm." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

  const limited = await checkRateLimit({
    key: accountRateLimitKey("delete", user.id),
    limit: 2,
    windowMs: 60 * 60_000,
    onProviderFailure: "fail_closed",
  });
  if (!limited.ok) {
    return {
      ok: false,
      error: "Deletion rate limit reached. Try again later.",
      retryAfterSec: limited.retryAfterSec,
    };
  }

  const rpcClient = supabase as unknown as {
    rpc: (fn: string) => Promise<{ error: { message: string } | null }>;
  };
  const { error: rpcError } = await rpcClient.rpc("request_account_deletion");
  if (rpcError) return { ok: false, error: rpcError.message };

  const admin = createAdminClient();

  const orchestrated = await runDeletionOrchestrator({
    userId: user.id,
    persistStage: (result) => persistDeletionStage(admin, user.id, result),
    listOwnedStorageObjects: async () => {
      const buckets = [
        PROGRESS_PHOTOS_BUCKET,
        NUTRITION_LABELS_BUCKET,
        "avatars",
      ] as const;
      const all = [];
      for (const bucket of buckets) {
        const paths = await collectStoragePathsRecursive({
          userId: user.id,
          bucket,
          listChildren: async (prefix) => {
            const { data, error } = await admin.storage.from(bucket).list(prefix, {
              limit: 1000,
            });
            if (error) {
              // Missing bucket (avatars) is non-fatal during enumeration.
              if (/not found|Bucket not found/i.test(error.message)) return [];
              throw error;
            }
            return (data ?? []).map((entry) => ({
              name: entry.name,
              id: entry.id ?? null,
              isFolder: entry.id === null,
            }));
          },
        });
        all.push(...paths);
      }

      // Also include metadata paths in case orphans live deeper than list roots.
      const { candidates } = await collectPrivateFileCandidates(
        admin as unknown as SupabaseClient,
        user.id,
      );
      for (const c of candidates) {
        if (!all.some((o) => o.bucket === c.bucket && o.path === c.path)) {
          all.push({ bucket: c.bucket, path: c.path });
        }
      }
      return all;
    },
    deleteStorageObjects: async (objects) => {
      const deleted: string[] = [];
      const failed: Array<{ path: string; error: string }> = [];
      const byBucket = new Map<string, string[]>();
      for (const obj of objects) {
        const list = byBucket.get(obj.bucket) ?? [];
        list.push(obj.path);
        byBucket.set(obj.bucket, list);
      }
      for (const [bucket, paths] of byBucket) {
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          const { error } = await admin.storage.from(bucket).remove(chunk);
          if (error) {
            for (const path of chunk) {
              failed.push({ path, error: error.message });
            }
          } else {
            deleted.push(...chunk);
          }
        }
      }
      return { deleted, failed };
    },
    purgeDomainRows: async () => {
      const { error } = await admin.rpc("execute_account_domain_purge", {
        p_user_id: user.id,
      });
      if (error) throw error;
    },
    revokeAuthUser: async () => {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
    },
  });

  if (!orchestrated.ok) {
    logger.error("account_deletion_purge_failed", {
      route: "account.delete",
      result: "error",
      errorCode: orchestrated.stage,
      userIdHash: user.id.slice(0, 8),
    });
    return {
      ok: false,
      error: `Deletion incomplete at ${orchestrated.stage}: ${orchestrated.error}`,
    };
  }

  return {
    ok: true,
    message:
      "Account deleted. Local offline drafts should be cleared on this device after sign-out.",
  };
}
