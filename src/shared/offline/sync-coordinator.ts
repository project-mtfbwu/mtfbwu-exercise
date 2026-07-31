/**
 * Sync coordinator — drains Dexie outbox for board, nutrition, and workout
 * mutations. Auth actions are never queued offline.
 */
import type { createSupabaseBrowserClient } from "@/shared/database/client";
import { createDexieOutboxRepository } from "@/shared/offline/outbox";
import { getDatabase, type OutboxRecord } from "@/shared/offline/db";
import {
  isBoardOutboxPayload,
  type BoardOutboxPayload,
} from "@/shared/offline/board-outbox";
import {
  isNutritionOutboxPayload,
  type NutritionOutboxPayload,
} from "@/shared/offline/nutrition-outbox";
import {
  isSessionReopenConflict,
  isSessionVersionConflict,
  isStaleSetWrite,
  isWorkoutOutboxPayload,
  type WorkoutOutboxPayload,
} from "@/shared/offline/workout-outbox";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import { isLayoutConflictError, isStatusConflictError } from "@/shared/board/board-model";

type BrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

export interface SyncCoordinator {
  flush(): Promise<{ processed: number; failed: number }>;
  getLastError(): string | null;
}

export function createNoOpSyncCoordinator(): SyncCoordinator {
  let lastError: string | null = null;
  return {
    async flush() {
      lastError = null;
      return { processed: 0, failed: 0 };
    },
    getLastError() {
      return lastError;
    },
  };
}

export function createBoardSyncCoordinator(
  getClient: () => BrowserClient,
): SyncCoordinator {
  let lastError: string | null = null;
  const outbox = createDexieOutboxRepository(getDatabase());

  return {
    getLastError() {
      return lastError;
    },
    async flush() {
      const store = useSyncStatusStore.getState();
      store.setStatus("syncing");
      let processed = 0;
      let failed = 0;
      lastError = null;

      const pending = await outbox.listPending();
      store.setPendingCount(pending.length);

      for (const record of pending) {
        if (!record.id) continue;
        try {
          await outbox.markInProgress(record.id);
          await applyRecord(getClient(), record);
          await outbox.markSynced(record.id);
          processed += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sync failed";
          lastError = message;
          await outbox.markFailed(record.id, message);
          failed += 1;
          // Conflicts stay visible; do not continue silently overwriting.
          if (isLayoutConflictError(message) || isStatusConflictError(message)) {
            break;
          }
        }
      }

      const remaining = await outbox.listPending();
      const failedRows = await getDatabase()
        .outbox.where("status")
        .equals("failed")
        .count();
      store.setPendingCount(remaining.length + failedRows);
      store.setStatus(failed > 0 || lastError ? "error" : "idle");
      return { processed, failed };
    },
  };
}

async function applyRecord(client: BrowserClient, record: OutboxRecord) {
  if (isBoardOutboxPayload(record.payload)) {
    await applyBoardPayload(client, record.payload);
    return;
  }
  if (isNutritionOutboxPayload(record.payload)) {
    await applyNutritionPayload(client, record.payload);
    return;
  }
  if (isWorkoutOutboxPayload(record.payload)) {
    await applyWorkoutPayload(client, record.payload);
    return;
  }
  throw new Error(`Unsupported outbox payload for ${record.entityType}`);
}

async function applyBoardPayload(client: BrowserClient, payload: BoardOutboxPayload) {
  switch (payload.kind) {
    case "set_module_enabled": {
      const { error } = await client
        .from("user_modules")
        .update({ enabled: payload.enabled })
        .eq("id", payload.userModuleId);
      if (error) throw new Error(error.message);
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user) {
        await client.rpc("ensure_user_board_defaults", { p_user_id: user.id });
      }
      return;
    }
    case "reorder_cards": {
      const { error: bumpError } = await client.rpc("bump_dashboard_layout_version", {
        p_layout_id: payload.layoutId,
        p_expected_version: payload.expectedVersion,
      });
      if (bumpError) throw new Error(bumpError.message);

      let temp = 10_000;
      for (const cardId of payload.orderedCardIds) {
        const { error } = await client
          .from("dashboard_cards")
          .update({
            position_index: temp,
            mobile_position: temp,
            tablet_position: temp,
          })
          .eq("id", cardId)
          .eq("dashboard_layout_id", payload.layoutId);
        if (error) throw new Error(error.message);
        temp += 1;
      }
      let pos = 0;
      for (const cardId of payload.orderedCardIds) {
        const { error } = await client
          .from("dashboard_cards")
          .update({
            position_index: pos,
            mobile_position: pos,
            tablet_position: pos,
            desktop_column: pos % 3,
            desktop_row: Math.floor(pos / 3),
          })
          .eq("id", cardId)
          .eq("dashboard_layout_id", payload.layoutId);
        if (error) throw new Error(error.message);
        pos += 1;
      }
      return;
    }
    case "card_variant": {
      const { error } = await client
        .from("dashboard_cards")
        .update({ visual_variant: payload.visualVariant })
        .eq("id", payload.cardId)
        .eq("dashboard_layout_id", payload.layoutId);
      if (error) throw new Error(error.message);
      return;
    }
    case "daily_status": {
      const { error } = await client.rpc("apply_daily_module_status", {
        p_status_id: payload.statusId,
        p_expected_revision: payload.expectedRevision,
        p_status: payload.status,
        ...(payload.summaryText !== undefined
          ? { p_summary_text: payload.summaryText }
          : {}),
      });
      if (error) throw new Error(error.message);
      return;
    }
    case "profile_prefs": {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Session expired");
      const { error } = await client
        .from("profiles")
        .update({
          ...(payload.displayName !== undefined
            ? { display_name: payload.displayName }
            : {}),
          ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
          ...(payload.unitsSystem !== undefined
            ? { units_system: payload.unitsSystem }
            : {}),
          ...(payload.animationMode !== undefined
            ? { animation_mode: payload.animationMode }
            : {}),
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      return;
    }
    default: {
      const _exhaustive: never = payload;
      throw new Error(`Unhandled payload ${JSON.stringify(_exhaustive)}`);
    }
  }
}

async function applyNutritionPayload(
  client: BrowserClient,
  payload: NutritionOutboxPayload,
) {
  for (const write of payload.writes) {
    // Nutrition tables land in Increment 4. Their generated database types are
    // refreshed after local migrations; this narrow adapter keeps the shared
    // coordinator compatible while the checked-in Increment 3 types remain.
    const nutritionClient = client as unknown as {
      from: (table: string) => {
        upsert: (values: Record<string, unknown> | Record<string, unknown>[]) => Promise<{
          error: { message: string } | null;
        }>;
      };
    };
    const { error } = await nutritionClient.from(write.table).upsert(write.values);
    if (error) throw new Error(error.message);
  }
}

/**
 * Replays workout session/set/note/schedule upserts in dependency order.
 * Terminal sessions must not be reopened or silently discarded past a stale
 * version, and a completed set must never be clobbered by a stale skip — see
 * the pure predicates in `workout-outbox.ts` for the exact rules.
 */
async function applyWorkoutPayload(client: BrowserClient, payload: WorkoutOutboxPayload) {
  const workoutClient = client as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: unknown,
        ) => {
          maybeSingle: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
      upsert: (values: Record<string, unknown> | Record<string, unknown>[]) => Promise<{
        error: { message: string } | null;
      }>;
      delete: () => {
        eq: (
          column: string,
          value: unknown,
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  for (const write of payload.writes) {
    const rows = Array.isArray(write.values) ? write.values : [write.values];

    if (write.operation === "delete") {
      for (const row of rows) {
        const id = row.id;
        if (typeof id !== "string") continue;
        const { error } = await workoutClient.from(write.table).delete().eq("id", id);
        if (error) throw new Error(error.message);
      }
      continue;
    }

    if (write.table === "workout_sessions") {
      for (const row of rows) {
        const id = row.id;
        if (typeof id === "string") {
          const { data: existing, error: readError } = await workoutClient
            .from("workout_sessions")
            .select("id, status, version")
            .eq("id", id)
            .maybeSingle();
          if (readError) throw new Error(readError.message);
          if (
            isSessionReopenConflict(existing?.status as string | undefined, row.status)
          ) {
            throw new Error(
              "Completed session conflict — stale offline update cannot reopen this workout.",
            );
          }
          if (
            row.status === "discarded" &&
            isSessionVersionConflict(
              existing ? Number(existing.version) : undefined,
              payload.expectedSessionVersion,
            )
          ) {
            throw new Error("Workout changed elsewhere — refresh before discarding.");
          }
        }
      }
    }

    if (write.table === "workout_sets") {
      for (const row of rows) {
        const id = row.id;
        if (typeof id === "string") {
          const { data: existing, error: readError } = await workoutClient
            .from("workout_sets")
            .select("id, status")
            .eq("id", id)
            .maybeSingle();
          if (readError) throw new Error(readError.message);
          if (
            isStaleSetWrite(existing?.status as string | undefined, {
              status: row.status,
              completed_at: row.completed_at,
            })
          ) {
            throw new Error("Stale skip cannot overwrite completed set");
          }
        }
      }
    }

    const { error } = await workoutClient.from(write.table).upsert(write.values);
    if (error) throw new Error(error.message);
  }
}
