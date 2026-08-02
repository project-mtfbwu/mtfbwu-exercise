import type { EntityTable } from "dexie";
import type { MtfbwuDatabase, OutboxRecord } from "@/shared/offline/db";
import { isTrackerOutboxPayload, TRACKER_ENTITY } from "@/shared/offline/tracker-outbox";
import { BOARD_ENTITY } from "@/shared/offline/board-outbox";
import { ACTIVE_MEDITATION_TIMER_ID } from "@/modules/meditation/timer-persistence";

type DraftRow = { id: string; updatedAt: string; userId?: string };

type DraftTable = EntityTable<DraftRow, "id">;

type DraftBinding = {
  table: DraftTable;
  resolveDraftId: (record: OutboxRecord) => string;
};

/**
 * Definition / preference entities may unblock dependent child mutations.
 * Cleanup still removes the parent's own draft — never child drafts keyed to other ids.
 */
const DEFINITION_ENTITY_TYPES = new Set<string>([
  TRACKER_ENTITY.userTracker,
  TRACKER_ENTITY.userSupplement,
]);

function draftBindings(db: MtfbwuDatabase): Partial<Record<string, DraftBinding>> {
  return {
    [TRACKER_ENTITY.hydrationEntry]: {
      table: db.hydrationDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.meditationSession]: {
      table: db.meditationDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.sleepSession]: {
      table: db.sleepDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.supplementIntake]: {
      table: db.supplementIntakeDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.userSupplement]: {
      table: db.userSupplementDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.trackerEvent]: {
      table: db.trackerEventDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.trackerTarget]: {
      table: db.trackerTargetDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.trackerReminder]: {
      table: db.trackerReminderDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.entityId,
    },
    [TRACKER_ENTITY.profilePreference]: {
      table: db.profilePreferenceDrafts as unknown as DraftTable,
      resolveDraftId: (r) => r.userId,
    },
  };
}

async function deleteDraftIfStale(
  binding: DraftBinding,
  draftId: string,
  outboxCreatedAt: string,
  cleaned: string[],
): Promise<void> {
  if (!draftId) return;
  const draft = await binding.table.get(draftId);
  if (!draft) return;
  if (draft.updatedAt > outboxCreatedAt) return;
  await binding.table.delete(draftId);
  cleaned.push(draftId);
}

async function cleanupMeditationTimerForSession(
  db: MtfbwuDatabase,
  record: OutboxRecord,
  cleaned: string[],
): Promise<void> {
  const timerId = ACTIVE_MEDITATION_TIMER_ID(record.userId);
  const row = await db.meditationTimerState.get(timerId);
  if (!row) return;

  const payload = row.payload as { sessionId?: string; phase?: string } | undefined;
  const sessionMatch = payload?.sessionId === record.entityId;
  const queuedMatch =
    payload?.phase === "completed_queued" && payload?.sessionId === record.entityId;

  if (sessionMatch || queuedMatch) {
    await db.meditationTimerState.delete(timerId);
    cleaned.push(timerId);
  }
}

/**
 * True when syncing this entity unblocks children but must not cascade-delete
 * child drafts. Parent's own matching draft is still cleaned via draftBindings.
 */
export function isDefinitionEntityType(entityType: string): boolean {
  return DEFINITION_ENTITY_TYPES.has(entityType);
}

/** @deprecated Use isDefinitionEntityType — kept for older test imports. */
export function shouldSkipParentOnlyCleanup(entityType: string): boolean {
  // Never skip cleaning the synced entity's own draft; child drafts use other ids.
  void entityType;
  return false;
}

/** Pure helper — exported for tests. */
export function draftIdCandidates(record: OutboxRecord): string[] {
  const ids = new Set<string>();
  if (record.entityId) ids.add(record.entityId);
  if (record.idempotencyKey) ids.add(record.idempotencyKey);
  return [...ids];
}

export async function cleanupDraftsForOutboxRecord(
  db: MtfbwuDatabase,
  record: OutboxRecord,
): Promise<{ cleaned: string[]; warning?: string }> {
  const cleaned: string[] = [];

  if (record.status !== "synced") {
    return { cleaned };
  }

  try {
    const binding = draftBindings(db)[record.entityType];
    if (binding) {
      const ids =
        record.entityType === TRACKER_ENTITY.profilePreference
          ? [binding.resolveDraftId(record)]
          : draftIdCandidates(record);
      for (const draftId of ids) {
        await deleteDraftIfStale(binding, draftId, record.createdAt, cleaned);
      }
    }

    if (record.entityType === TRACKER_ENTITY.meditationSession) {
      await cleanupMeditationTimerForSession(db, record, cleaned);
    }

    await invalidateDailyOverviewCacheForRecord(db, record, cleaned);

    return { cleaned };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft cleanup failed";
    return { cleaned, warning: message };
  }
}

/** Extract local_date values from tracker writes for overview cache invalidation. */
export function localDatesFromOutboxRecord(record: OutboxRecord): string[] {
  if (!isTrackerOutboxPayload(record.payload)) return [];
  const dates = new Set<string>();
  for (const write of record.payload.writes) {
    const rows = Array.isArray(write.values) ? write.values : [write.values];
    for (const row of rows) {
      const localDate = row.local_date;
      if (typeof localDate === "string" && localDate.length > 0) {
        dates.add(localDate);
      }
    }
  }
  return [...dates];
}

async function invalidateDailyOverviewCacheForRecord(
  db: MtfbwuDatabase,
  record: OutboxRecord,
  cleaned: string[],
): Promise<void> {
  if (!db.dailyOverviewCache) return;

  const dates = localDatesFromOutboxRecord(record);
  if (dates.length === 0) {
    // Preference/definition syncs without a date — drop all overview cache for user.
    const rows = await db.dailyOverviewCache
      .where("userId")
      .equals(record.userId)
      .toArray();
    for (const row of rows) {
      await db.dailyOverviewCache.delete(row.id);
      cleaned.push(row.id);
    }
    return;
  }

  for (const localDate of dates) {
    const rows = await db.dailyOverviewCache
      .where("userId")
      .equals(record.userId)
      .filter((row) => row.localDate === localDate)
      .toArray();
    for (const row of rows) {
      await db.dailyOverviewCache.delete(row.id);
      cleaned.push(row.id);
    }
  }
}

const DRAFT_TABLES: (keyof MtfbwuDatabase)[] = [
  "hydrationDrafts",
  "meditationDrafts",
  "sleepDrafts",
  "supplementIntakeDrafts",
  "userSupplementDrafts",
  "trackerEventDrafts",
  "trackerTargetDrafts",
  "trackerReminderDrafts",
  "profilePreferenceDrafts",
];

export async function reconcileStaleDrafts(
  db: MtfbwuDatabase,
  userId?: string,
): Promise<{ removed: number; warnings: string[] }> {
  const warnings: string[] = [];
  let removed = 0;

  let synced = await db.outbox.where("status").equals("synced").toArray();
  if (userId) {
    synced = synced.filter((row) => row.userId === userId);
  }

  for (const record of synced) {
    const result = await cleanupDraftsForOutboxRecord(db, record);
    removed += result.cleaned.length;
    if (result.warning) warnings.push(result.warning);
  }

  for (const tableName of DRAFT_TABLES) {
    const table = db[tableName] as unknown as DraftTable;
    let drafts = await table.toArray();
    if (userId) {
      drafts = drafts.filter((d) => d.userId === userId);
    }

    for (const draft of drafts) {
      const related = (await db.outbox.toArray()).filter(
        (row) => row.entityId === draft.id || row.idempotencyKey === draft.id,
      );

      const syncedMatch = related.find(
        (row) => row.status === "synced" && draft.updatedAt <= row.createdAt,
      );

      if (!syncedMatch) continue;

      const pendingOrFailed = related.some(
        (row) => row.status === "pending" || row.status === "failed",
      );
      if (pendingOrFailed) continue;

      try {
        await table.delete(draft.id);
        removed += 1;
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? error.message
            : `Failed to remove stale draft ${draft.id}`,
        );
      }
    }
  }

  const timerRows = await db.meditationTimerState.toArray();
  for (const row of timerRows) {
    if (userId && row.userId !== userId) continue;
    const payload = row.payload as { sessionId?: string; phase?: string } | undefined;
    if (!payload?.sessionId) continue;

    const sessionOutbox = await db.outbox
      .where("entityId")
      .equals(payload.sessionId)
      .filter((r) => r.entityType === TRACKER_ENTITY.meditationSession)
      .toArray();

    const syncedSession = sessionOutbox.find((r) => r.status === "synced");
    if (!syncedSession) continue;

    const failedSession = sessionOutbox.some((r) => r.status === "failed");
    if (failedSession) continue;

    try {
      await db.meditationTimerState.delete(ACTIVE_MEDITATION_TIMER_ID(row.userId));
      removed += 1;
    } catch (error) {
      warnings.push(
        error instanceof Error ? error.message : "Failed to clear meditation timer state",
      );
    }
  }

  return { removed, warnings };
}

/** Board outbox rows have no Dexie drafts; noop placeholder for future layout drafts. */
export function isBoardEntityWithoutDraft(entityType: string): boolean {
  return (
    entityType === BOARD_ENTITY.userModule ||
    entityType === BOARD_ENTITY.dashboardLayout ||
    entityType === BOARD_ENTITY.dashboardCard ||
    entityType === BOARD_ENTITY.dailyModuleStatus ||
    entityType === BOARD_ENTITY.profile
  );
}
