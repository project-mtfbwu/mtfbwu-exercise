/**
 * Sync coordinator — drains Dexie outbox for Increment 3 board mutations.
 * Auth actions are never queued offline.
 */
import type { createSupabaseBrowserClient } from "@/shared/database/client";
import { createDexieOutboxRepository } from "@/shared/offline/outbox";
import { getDatabase, type OutboxRecord } from "@/shared/offline/db";
import {
  isBoardOutboxPayload,
  type BoardOutboxPayload,
} from "@/shared/offline/board-outbox";
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
  if (!isBoardOutboxPayload(record.payload)) {
    throw new Error(`Unsupported outbox payload for ${record.entityType}`);
  }
  await applyBoardPayload(client, record.payload);
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
        p_summary_text: payload.summaryText ?? null,
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
