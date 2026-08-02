import {
  getDatabase,
  type HydrationDraft,
  type MeditationDraft,
  type OutboxRecord,
  type ProfilePreferenceDraft,
  type SleepDraft,
  type SupplementIntakeDraft,
  type TrackerEventDraft,
  type TrackerReminderDraft,
  type TrackerTargetDraft,
  type UserSupplementDraft,
} from "@/shared/offline/db";
import { createPendingRecord } from "@/shared/offline/outbox";

export const TRACKER_ENTITY = {
  hydrationEntry: "hydration_entry",
  meditationSession: "meditation_session",
  sleepSession: "sleep_session",
  supplementIntake: "supplement_intake",
  userSupplement: "user_supplement",
  trackerEvent: "tracker_event",
  trackerTarget: "tracker_target",
  userTracker: "user_tracker",
  trackerReminder: "tracker_reminder",
  profilePreference: "profile_preference",
} as const;

export type TrackerEntityType = (typeof TRACKER_ENTITY)[keyof typeof TRACKER_ENTITY];

export type TrackerTable =
  | "hydration_entries"
  | "meditation_sessions"
  | "sleep_sessions"
  | "supplement_intakes"
  | "user_supplements"
  | "tracker_events"
  | "tracker_targets"
  | "user_trackers"
  | "tracker_reminders"
  | "profile_preferences"
  | "daily_overview_preferences"
  | "profiles";

export type TrackerWrite = {
  table: TrackerTable;
  values: Record<string, unknown> | Record<string, unknown>[];
  operation?: "upsert" | "delete";
  conflictIfServerUpdatedAfter?: string;
};

/**
 * Tracker outbox payload — replay order: definition → target/reminder → event/session/intake.
 * kind discriminator: "tracker"
 */
export type TrackerOutboxPayload = {
  kind: "tracker";
  entity: TrackerEntityType;
  writes: TrackerWrite[];
  sequence?: number;
  dependsOnEntityIds?: string[];
  dependsOnIdempotencyKeys?: string[];
};

const TRACKER_REPLAY_SEQUENCE: Record<TrackerEntityType, number> = {
  user_tracker: 1,
  user_supplement: 1,
  tracker_target: 2,
  tracker_reminder: 2,
  profile_preference: 2,
  hydration_entry: 3,
  meditation_session: 3,
  sleep_session: 3,
  supplement_intake: 3,
  tracker_event: 3,
};

export function isTrackerOutboxPayload(
  payload: unknown,
): payload is TrackerOutboxPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as TrackerOutboxPayload).kind === "tracker"
  );
}

export function trackerReplaySequence(payload: TrackerOutboxPayload): number {
  return payload.sequence ?? TRACKER_REPLAY_SEQUENCE[payload.entity] ?? 99;
}

export function sortTrackerRecordsForReplay(records: OutboxRecord[]): OutboxRecord[] {
  return [...records].sort((a, b) => {
    const pa = isTrackerOutboxPayload(a.payload) ? trackerReplaySequence(a.payload) : 50;
    const pb = isTrackerOutboxPayload(b.payload) ? trackerReplaySequence(b.payload) : 50;
    if (pa !== pb) return pa - pb;
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
}

export function trackerDependenciesMet(
  record: OutboxRecord,
  syncedEntityIds: ReadonlySet<string>,
  syncedIdempotencyKeys: ReadonlySet<string>,
): boolean {
  if (!isTrackerOutboxPayload(record.payload)) return true;
  const entityDeps = record.payload.dependsOnEntityIds ?? [];
  const keyDeps = record.payload.dependsOnIdempotencyKeys ?? [];
  return (
    entityDeps.every((id) => syncedEntityIds.has(id)) &&
    keyDeps.every((key) => syncedIdempotencyKeys.has(key))
  );
}

export function isTrackerConflict(
  serverUpdatedAt: string | undefined | null,
  clientUpdatedAt: string | undefined,
): boolean {
  if (!clientUpdatedAt || !serverUpdatedAt) return false;
  return serverUpdatedAt > clientUpdatedAt;
}

export function buildHydrationEntryWrites(input: {
  entryId: string;
  userId: string;
  localDate: string;
  dailyRecordId?: string;
  amountMl: number;
  vesselLabel?: string;
}): TrackerWrite[] {
  return [
    {
      table: "hydration_entries",
      values: {
        id: input.entryId,
        user_id: input.userId,
        daily_record_id: input.dailyRecordId ?? null,
        local_date: input.localDate,
        occurred_at: new Date().toISOString(),
        amount_ml: input.amountMl,
        vessel_label: input.vesselLabel ?? null,
        source: "manual",
      },
    },
  ];
}

export function buildHydrationEntryDeleteWrites(input: {
  entryId: string;
  userId: string;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = new Date().toISOString();
  return [
    {
      table: "hydration_entries",
      values: {
        id: input.entryId,
        user_id: input.userId,
        deleted_at: now,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt ?? now,
    },
  ];
}

export function buildMeditationSessionWrites(input: {
  sessionId: string;
  userId: string;
  localDate: string;
  dailyRecordId?: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  meditationType: string;
}): TrackerWrite[] {
  return [
    {
      table: "meditation_sessions",
      values: {
        id: input.sessionId,
        user_id: input.userId,
        daily_record_id: input.dailyRecordId ?? null,
        local_date: input.localDate,
        started_at: input.startedAt,
        completed_at: input.completedAt,
        duration_seconds: input.durationSeconds,
        meditation_type: input.meditationType,
        completed: true,
      },
    },
  ];
}

export function buildSleepSessionDeleteWrites(input: {
  sessionId: string;
  userId: string;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = new Date().toISOString();
  return [
    {
      table: "sleep_sessions",
      values: {
        id: input.sessionId,
        user_id: input.userId,
        deleted_at: now,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt ?? now,
    },
  ];
}

export function buildSupplementIntakeDeleteWrites(input: {
  intakeId: string;
  userId: string;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = new Date().toISOString();
  return [
    {
      table: "supplement_intakes",
      values: {
        id: input.intakeId,
        user_id: input.userId,
        deleted_at: now,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt ?? now,
    },
  ];
}

export function buildSleepSessionWrites(input: {
  sessionId: string;
  userId: string;
  timezone: string;
  sleepDate: string;
  bedtimeAt: string;
  wakeAt: string;
  durationSeconds: number;
  quality?: number | null;
  nap?: boolean;
  interruptions?: number | null;
  note?: string | null;
  deletedAt?: string | null;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "sleep_sessions",
      values: {
        id: input.sessionId,
        user_id: input.userId,
        sleep_date: input.sleepDate,
        timezone: input.timezone,
        bedtime_at: input.bedtimeAt,
        wake_at: input.wakeAt,
        duration_seconds: input.durationSeconds,
        quality: input.quality ?? null,
        interruptions: input.interruptions ?? null,
        nap: input.nap ?? false,
        note: input.note ?? null,
        source: "manual",
        deleted_at: input.deletedAt ?? null,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildSupplementIntakeWrites(input: {
  intakeId: string;
  userId: string;
  userSupplementId: string;
  localDate: string;
  dailyRecordId?: string;
  status: "taken" | "skipped" | "partial";
  amount?: number | null;
  unit?: string | null;
  supplementName?: string | null;
  note?: string | null;
  deletedAt?: string | null;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  const note =
    input.note ?? (input.supplementName ? `Supplement: ${input.supplementName}` : null);
  return [
    {
      table: "supplement_intakes",
      values: {
        id: input.intakeId,
        user_id: input.userId,
        user_supplement_id: input.userSupplementId,
        daily_record_id: input.dailyRecordId ?? null,
        local_date: input.localDate,
        taken_at: now,
        status: input.status,
        amount: input.amount ?? null,
        unit: input.unit ?? null,
        note,
        deleted_at: input.deletedAt ?? null,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildUserSupplementWrites(input: {
  supplementId: string;
  userId: string;
  supplementDefinitionId?: string | null;
  customName?: string | null;
  brand?: string | null;
  servingAmount?: number | null;
  servingUnit?: string | null;
  instructionsText?: string | null;
  active?: boolean;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "user_supplements",
      values: {
        id: input.supplementId,
        user_id: input.userId,
        supplement_definition_id: input.supplementDefinitionId ?? null,
        custom_name: input.customName ?? null,
        brand: input.brand ?? null,
        serving_amount: input.servingAmount ?? null,
        serving_unit: input.servingUnit ?? null,
        instructions_text: input.instructionsText ?? null,
        active: input.active ?? true,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildTrackerEventWrites(input: {
  eventId: string;
  userId: string;
  userTrackerId: string;
  localDate: string;
  timezone: string;
  valueNumeric?: number | null;
  valueBoolean?: boolean | null;
  valueText?: string | null;
  durationSeconds?: number | null;
  unit?: string | null;
  note?: string | null;
  deletedAt?: string | null;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "tracker_events",
      values: {
        id: input.eventId,
        user_id: input.userId,
        user_tracker_id: input.userTrackerId,
        local_date: input.localDate,
        timezone: input.timezone,
        occurred_at: now,
        value_numeric: input.valueNumeric ?? null,
        value_boolean: input.valueBoolean ?? null,
        value_text: input.valueText ?? null,
        duration_seconds: input.durationSeconds ?? null,
        unit: input.unit ?? null,
        note: input.note ?? null,
        source: "manual",
        deleted_at: input.deletedAt ?? null,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildUserTrackerWrites(input: {
  trackerId: string;
  userId: string;
  customName?: string | null;
  customDescription?: string | null;
  unit?: string | null;
  enabled?: boolean;
  archivedAt?: string | null;
  trackerDefinitionId?: string | null;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "user_trackers",
      values: {
        id: input.trackerId,
        user_id: input.userId,
        tracker_definition_id: input.trackerDefinitionId ?? null,
        custom_name: input.customName ?? null,
        custom_description: input.customDescription ?? null,
        unit: input.unit ?? null,
        enabled: input.enabled ?? true,
        archived_at: input.archivedAt ?? null,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildTrackerTargetWrites(input: {
  userTrackerId: string;
  effectiveFrom: string;
  targetValue?: number | null;
  targetUnit?: string | null;
  targetFrequency?: string;
  daysOfWeek?: number[] | null;
  confirmedByUser?: boolean;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "tracker_targets",
      values: {
        user_tracker_id: input.userTrackerId,
        effective_from: input.effectiveFrom,
        target_value: input.targetValue ?? null,
        target_unit: input.targetUnit ?? null,
        target_frequency: input.targetFrequency ?? "daily",
        days_of_week: input.daysOfWeek ?? null,
        confirmed_by_user: input.confirmedByUser ?? true,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildTrackerReminderWrites(input: {
  reminderId: string;
  userId: string;
  userTrackerId?: string | null;
  userSupplementId?: string | null;
  localTime: string;
  timezone: string;
  daysOfWeek?: number[];
  enabled?: boolean;
  reminderType?: string;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "tracker_reminders",
      values: {
        id: input.reminderId,
        user_id: input.userId,
        user_tracker_id: input.userTrackerId ?? null,
        user_supplement_id: input.userSupplementId ?? null,
        local_time: input.localTime,
        timezone: input.timezone,
        days_of_week: input.daysOfWeek ?? [],
        enabled: input.enabled ?? true,
        reminder_type: input.reminderType ?? "tracker",
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildProfilePreferenceWrites(input: {
  userId: string;
  preferredName?: string | null;
  weekStartsOn?: number;
  timeFormat?: "12h" | "24h";
  weightUnit?: string;
  lengthUnit?: string;
  volumeUnit?: string;
  showStreaks?: boolean;
  showWeeklySummary?: boolean;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "profile_preferences",
      values: {
        user_id: input.userId,
        preferred_name: input.preferredName,
        week_starts_on: input.weekStartsOn,
        time_format: input.timeFormat,
        weight_unit: input.weightUnit,
        length_unit: input.lengthUnit,
        volume_unit: input.volumeUnit,
        show_streaks: input.showStreaks,
        show_weekly_summary: input.showWeeklySummary,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export function buildProfileSettingsWrites(input: {
  userId: string;
  displayName?: string;
  timezone?: string;
  unitsSystem?: string;
  animationMode?: string;
  clientUpdatedAt?: string;
}): TrackerWrite[] {
  const now = input.clientUpdatedAt ?? new Date().toISOString();
  return [
    {
      table: "profiles",
      values: {
        id: input.userId,
        display_name: input.displayName,
        timezone: input.timezone,
        units_system: input.unitsSystem,
        animation_mode: input.animationMode,
        updated_at: now,
      },
      conflictIfServerUpdatedAfter: input.clientUpdatedAt,
    },
  ];
}

export async function queueTrackerMutation(input: {
  userId: string;
  entityType: TrackerEntityType;
  entityId: string;
  payload: TrackerOutboxPayload;
  hydrationDraft?: Omit<HydrationDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  meditationDraft?: Omit<MeditationDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  sleepDraft?: Omit<SleepDraft, "id" | "userId" | "createdAt" | "updatedAt">;
  supplementDraft?: Omit<
    SupplementIntakeDraft,
    "id" | "userId" | "createdAt" | "updatedAt"
  >;
  userSupplementDraft?: Omit<
    UserSupplementDraft,
    "id" | "userId" | "createdAt" | "updatedAt"
  >;
  trackerEventDraft?: Omit<
    TrackerEventDraft,
    "id" | "userId" | "createdAt" | "updatedAt"
  >;
  trackerTargetDraft?: Omit<
    TrackerTargetDraft,
    "id" | "userId" | "createdAt" | "updatedAt"
  >;
  trackerReminderDraft?: Omit<
    TrackerReminderDraft,
    "id" | "userId" | "createdAt" | "updatedAt"
  >;
  profilePreferenceDraft?: Omit<
    ProfilePreferenceDraft,
    "id" | "userId" | "createdAt" | "updatedAt"
  >;
  idempotencyKey?: string;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const idempotencyKey =
    input.idempotencyKey ??
    `tracker:${input.entityType}:${input.entityId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: "upsert",
    payload: input.payload,
  });

  await db.transaction(
    "rw",
    [
      db.outbox,
      db.hydrationDrafts,
      db.meditationDrafts,
      db.meditationTimerState,
      db.sleepDrafts,
      db.supplementIntakeDrafts,
      db.userSupplementDrafts,
      db.trackerEventDrafts,
      db.trackerTargetDrafts,
      db.trackerReminderDrafts,
      db.profilePreferenceDrafts,
    ],
    async () => {
      const existing = await db.outbox
        .where("idempotencyKey")
        .equals(idempotencyKey)
        .first();
      if (existing) return;
      await db.outbox.add(record);
      const now = new Date().toISOString();
      if (input.hydrationDraft) {
        await db.hydrationDrafts.put({
          id: input.hydrationDraft.entryId,
          userId: input.userId,
          ...input.hydrationDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.meditationDraft) {
        await db.meditationDrafts.put({
          id: input.meditationDraft.sessionId,
          userId: input.userId,
          ...input.meditationDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.sleepDraft) {
        await db.sleepDrafts.put({
          id: input.sleepDraft.sessionId,
          userId: input.userId,
          ...input.sleepDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.supplementDraft) {
        await db.supplementIntakeDrafts.put({
          id: input.supplementDraft.intakeId,
          userId: input.userId,
          ...input.supplementDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.userSupplementDraft) {
        await db.userSupplementDrafts.put({
          id: input.userSupplementDraft.supplementId,
          userId: input.userId,
          ...input.userSupplementDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.trackerEventDraft) {
        await db.trackerEventDrafts.put({
          id: input.trackerEventDraft.eventId,
          userId: input.userId,
          ...input.trackerEventDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.trackerTargetDraft) {
        await db.trackerTargetDrafts.put({
          id: input.trackerTargetDraft.targetId,
          userId: input.userId,
          ...input.trackerTargetDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.trackerReminderDraft) {
        await db.trackerReminderDrafts.put({
          id: input.trackerReminderDraft.reminderId,
          userId: input.userId,
          ...input.trackerReminderDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (input.profilePreferenceDraft) {
        await db.profilePreferenceDrafts.put({
          id: input.userId,
          userId: input.userId,
          ...input.profilePreferenceDraft,
          createdAt: now,
          updatedAt: now,
        });
      }
    },
  );

  return record;
}
