import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "pending" | "in_progress" | "synced" | "failed";

export type OutboxOperationType = "create" | "update" | "delete" | "upsert" | "custom";

export type OutboxRecord = {
  id?: number;
  idempotencyKey: string;
  userId: string;
  entityType: string;
  entityId: string;
  operationType: OutboxOperationType;
  payload: unknown;
  status: SyncStatus;
  retryCount: number;
  createdAt: string;
  lastAttemptAt: string | null;
  lastError: string | null;
};

/**
 * A complete, device-local nutrition edit waiting to be synchronized. It is
 * deliberately a JSON payload: server row shapes evolve with nutrition
 * migrations while an existing draft must remain recoverable offline.
 */
export type MealLogDraft = {
  id: string;
  userId: string;
  mealLogId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/**
 * A device-local nutrition-label capture waiting on connectivity: either a
 * barcode scanned while offline (no lookup possible yet) or an in-progress
 * OCR review the user has not finished. Also a JSON payload for the same
 * forward-compatibility reason as `MealLogDraft`.
 */
export type LabelCaptureDraft = {
  id: string;
  userId: string;
  barcode: string | null;
  payload: unknown;
  updatedAt: string;
};

/**
 * A device-local in-progress workout session waiting to sync. JSON payload
 * for the same forward-compatibility reason as `MealLogDraft` — the
 * persisted `workout_sessions` shape can evolve independently of an
 * already-started offline draft.
 */
export type ActiveWorkoutSessionDraft = {
  id: string;
  userId: string;
  sessionId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Local lifecycle mirror for a queued `workout_sets` mutation. */
export const WORKOUT_SET_DRAFT_STATUSES = ["pending", "completed", "skipped"] as const;
export type WorkoutSetDraftStatus = (typeof WORKOUT_SET_DRAFT_STATUSES)[number];

export const WORKOUT_SET_MUTATION_KINDS = [
  "complete",
  "skip",
  "unskip",
  "add",
  "update",
  "delete",
] as const;
export type WorkoutSetMutationKind = (typeof WORKOUT_SET_MUTATION_KINDS)[number];

/**
 * A device-local set mutation (complete/skip/unskip/add/update/delete) queued
 * against a session while offline. `localOnly` marks a set created entirely
 * on this device with no synced server row yet — only those may be deleted
 * offline (see `queueSetDelete` in `workout-outbox.ts`).
 */
export type WorkoutSetDraft = {
  id: string;
  userId: string;
  sessionId: string;
  setId: string;
  payload: unknown;
  status?: WorkoutSetDraftStatus;
  localOnly?: boolean;
  mutationKind?: WorkoutSetMutationKind;
  createdAt: string;
  updatedAt: string;
};

/** A device-local `workout_session_notes` entry queued while offline. */
export type WorkoutNoteDraft = {
  id: string;
  userId: string;
  sessionId: string;
  noteId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local in-progress rehab session waiting to sync. */
export type ActiveRehabSessionDraft = {
  id: string;
  userId: string;
  sessionId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export const REHAB_SET_DRAFT_STATUSES = [
  "pending",
  "completed",
  "skipped",
  "stopped",
] as const;
export type RehabSetDraftStatus = (typeof REHAB_SET_DRAFT_STATUSES)[number];

export type RehabSetDraft = {
  id: string;
  userId: string;
  sessionId: string;
  setId: string;
  payload: unknown;
  status?: RehabSetDraftStatus;
  createdAt: string;
  updatedAt: string;
};

export type RehabObservationDraft = {
  id: string;
  userId: string;
  sessionId: string;
  observationId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type RehabAlertDraft = {
  id: string;
  userId: string;
  sessionId: string;
  alertId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local body weight entry waiting to sync (Increment 8). */
export type WeightDraft = {
  id: string;
  userId: string;
  entryId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local body measurement entry waiting to sync (Increment 8). */
export type MeasurementDraft = {
  id: string;
  userId: string;
  entryId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Processed JPEG bytes waiting for Storage upload (Increment 8 offline). */
export type ProgressPhotoBlob = {
  id: string;
  userId: string;
  setId: string;
  photoId: string;
  storagePath: string;
  mimeType: string;
  blob: ArrayBuffer;
  byteLength: number;
  createdAt: string;
};

/** Device-local progress photo metadata waiting to sync (Increment 8). */
export type ProgressPhotoDraft = {
  id: string;
  userId: string;
  setId: string;
  photoId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local progress note waiting to sync (Increment 8). */
export type ProgressNoteDraft = {
  id: string;
  userId: string;
  noteId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local hydration entry waiting to sync (Increment 9). */
export type HydrationDraft = {
  id: string;
  userId: string;
  entryId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local meditation session waiting to sync (Increment 9). */
export type MeditationDraft = {
  id: string;
  userId: string;
  sessionId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** In-progress meditation timer state (Increment 9). */
export type MeditationTimerState = {
  id: string;
  userId: string;
  sessionId: string;
  payload: unknown;
  updatedAt: string;
};

/** Device-local sleep session waiting to sync (Increment 9). */
export type SleepDraft = {
  id: string;
  userId: string;
  sessionId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local supplement intake waiting to sync (Increment 9). */
export type SupplementIntakeDraft = {
  id: string;
  userId: string;
  intakeId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local generic tracker event waiting to sync (Increment 9). */
export type TrackerEventDraft = {
  id: string;
  userId: string;
  eventId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local tracker target waiting to sync (Increment 9). */
export type TrackerTargetDraft = {
  id: string;
  userId: string;
  targetId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local profile preferences waiting to sync (Increment 9). */
export type ProfilePreferenceDraft = {
  id: string;
  userId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local user supplement waiting to sync (Increment 9). */
export type UserSupplementDraft = {
  id: string;
  userId: string;
  supplementId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/** Device-local tracker reminder preference waiting to sync (Increment 9). */
export type TrackerReminderDraft = {
  id: string;
  userId: string;
  reminderId: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
};

/**
 * Optional client cache of daily overview snapshots.
 * Invalidated after confirmed tracker sync for matching local dates.
 */
export type DailyOverviewCacheEntry = {
  id: string;
  userId: string;
  localDate: string;
  payload: unknown;
  updatedAt: string;
};

export class MtfbwuDatabase extends Dexie {
  outbox!: EntityTable<OutboxRecord, "id">;
  mealLogDrafts!: EntityTable<MealLogDraft, "id">;
  labelCaptureDrafts!: EntityTable<LabelCaptureDraft, "id">;
  activeWorkoutSessions!: EntityTable<ActiveWorkoutSessionDraft, "id">;
  workoutSetDrafts!: EntityTable<WorkoutSetDraft, "id">;
  workoutNoteDrafts!: EntityTable<WorkoutNoteDraft, "id">;
  activeRehabSessions!: EntityTable<ActiveRehabSessionDraft, "id">;
  rehabSetDrafts!: EntityTable<RehabSetDraft, "id">;
  rehabObservationDrafts!: EntityTable<RehabObservationDraft, "id">;
  rehabAlertDrafts!: EntityTable<RehabAlertDraft, "id">;
  weightDrafts!: EntityTable<WeightDraft, "id">;
  measurementDrafts!: EntityTable<MeasurementDraft, "id">;
  progressPhotoDrafts!: EntityTable<ProgressPhotoDraft, "id">;
  progressPhotoBlobs!: EntityTable<ProgressPhotoBlob, "id">;
  progressNoteDrafts!: EntityTable<ProgressNoteDraft, "id">;
  hydrationDrafts!: EntityTable<HydrationDraft, "id">;
  meditationDrafts!: EntityTable<MeditationDraft, "id">;
  meditationTimerState!: EntityTable<MeditationTimerState, "id">;
  sleepDrafts!: EntityTable<SleepDraft, "id">;
  supplementIntakeDrafts!: EntityTable<SupplementIntakeDraft, "id">;
  trackerEventDrafts!: EntityTable<TrackerEventDraft, "id">;
  trackerTargetDrafts!: EntityTable<TrackerTargetDraft, "id">;
  profilePreferenceDrafts!: EntityTable<ProfilePreferenceDraft, "id">;
  userSupplementDrafts!: EntityTable<UserSupplementDraft, "id">;
  trackerReminderDrafts!: EntityTable<TrackerReminderDraft, "id">;
  dailyOverviewCache!: EntityTable<DailyOverviewCacheEntry, "id">;

  constructor(name = "mtfbwu") {
    super(name);
    this.version(1).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
    });
    this.version(2).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
    });
    this.version(3).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
    });
    this.version(4).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
    });
    this.version(5).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
    });
    this.version(6).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
      activeRehabSessions: "id, userId, sessionId, updatedAt",
      rehabSetDrafts: "id, userId, sessionId, setId, updatedAt",
      rehabObservationDrafts: "id, userId, sessionId, observationId, updatedAt",
      rehabAlertDrafts: "id, userId, sessionId, alertId, updatedAt",
    });
    this.version(7).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
      activeRehabSessions: "id, userId, sessionId, updatedAt",
      rehabSetDrafts: "id, userId, sessionId, setId, updatedAt",
      rehabObservationDrafts: "id, userId, sessionId, observationId, updatedAt",
      rehabAlertDrafts: "id, userId, sessionId, alertId, updatedAt",
      weightDrafts: "id, userId, entryId, updatedAt",
      measurementDrafts: "id, userId, entryId, updatedAt",
      progressPhotoDrafts: "id, userId, setId, photoId, updatedAt",
      progressNoteDrafts: "id, userId, noteId, updatedAt",
    });
    this.version(8).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
      activeRehabSessions: "id, userId, sessionId, updatedAt",
      rehabSetDrafts: "id, userId, sessionId, setId, updatedAt",
      rehabObservationDrafts: "id, userId, sessionId, observationId, updatedAt",
      rehabAlertDrafts: "id, userId, sessionId, alertId, updatedAt",
      weightDrafts: "id, userId, entryId, updatedAt",
      measurementDrafts: "id, userId, entryId, updatedAt",
      progressPhotoDrafts: "id, userId, setId, photoId, updatedAt",
      progressPhotoBlobs: "id, userId, setId, photoId, createdAt",
      progressNoteDrafts: "id, userId, noteId, updatedAt",
    });
    this.version(9).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
      activeRehabSessions: "id, userId, sessionId, updatedAt",
      rehabSetDrafts: "id, userId, sessionId, setId, updatedAt",
      rehabObservationDrafts: "id, userId, sessionId, observationId, updatedAt",
      rehabAlertDrafts: "id, userId, sessionId, alertId, updatedAt",
      weightDrafts: "id, userId, entryId, updatedAt",
      measurementDrafts: "id, userId, entryId, updatedAt",
      progressPhotoDrafts: "id, userId, setId, photoId, updatedAt",
      progressPhotoBlobs: "id, userId, setId, photoId, createdAt",
      progressNoteDrafts: "id, userId, noteId, updatedAt",
      hydrationDrafts: "id, userId, entryId, updatedAt",
      meditationDrafts: "id, userId, sessionId, updatedAt",
      meditationTimerState: "id, userId, sessionId, updatedAt",
      sleepDrafts: "id, userId, sessionId, updatedAt",
      supplementIntakeDrafts: "id, userId, intakeId, updatedAt",
      trackerEventDrafts: "id, userId, eventId, updatedAt",
      trackerTargetDrafts: "id, userId, targetId, updatedAt",
      profilePreferenceDrafts: "id, userId, updatedAt",
    });
    this.version(10).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
      activeRehabSessions: "id, userId, sessionId, updatedAt",
      rehabSetDrafts: "id, userId, sessionId, setId, updatedAt",
      rehabObservationDrafts: "id, userId, sessionId, observationId, updatedAt",
      rehabAlertDrafts: "id, userId, sessionId, alertId, updatedAt",
      weightDrafts: "id, userId, entryId, updatedAt",
      measurementDrafts: "id, userId, entryId, updatedAt",
      progressPhotoDrafts: "id, userId, setId, photoId, updatedAt",
      progressPhotoBlobs: "id, userId, setId, photoId, createdAt",
      progressNoteDrafts: "id, userId, noteId, updatedAt",
      hydrationDrafts: "id, userId, entryId, updatedAt",
      meditationDrafts: "id, userId, sessionId, updatedAt",
      meditationTimerState: "id, userId, sessionId, updatedAt",
      sleepDrafts: "id, userId, sessionId, updatedAt",
      supplementIntakeDrafts: "id, userId, intakeId, updatedAt",
      trackerEventDrafts: "id, userId, eventId, updatedAt",
      trackerTargetDrafts: "id, userId, targetId, updatedAt",
      profilePreferenceDrafts: "id, userId, updatedAt",
      userSupplementDrafts: "id, userId, supplementId, updatedAt",
      trackerReminderDrafts: "id, userId, reminderId, updatedAt",
    });
    this.version(11).stores({
      outbox: "++id, idempotencyKey, userId, status, entityType, entityId, createdAt",
      mealLogDrafts: "id, userId, mealLogId, updatedAt",
      labelCaptureDrafts: "id, userId, barcode, updatedAt",
      activeWorkoutSessions: "id, userId, sessionId, updatedAt",
      workoutSetDrafts: "id, userId, sessionId, setId, updatedAt",
      workoutNoteDrafts: "id, userId, sessionId, noteId, updatedAt",
      activeRehabSessions: "id, userId, sessionId, updatedAt",
      rehabSetDrafts: "id, userId, sessionId, setId, updatedAt",
      rehabObservationDrafts: "id, userId, sessionId, observationId, updatedAt",
      rehabAlertDrafts: "id, userId, sessionId, alertId, updatedAt",
      weightDrafts: "id, userId, entryId, updatedAt",
      measurementDrafts: "id, userId, entryId, updatedAt",
      progressPhotoDrafts: "id, userId, setId, photoId, updatedAt",
      progressPhotoBlobs: "id, userId, setId, photoId, createdAt",
      progressNoteDrafts: "id, userId, noteId, updatedAt",
      hydrationDrafts: "id, userId, entryId, updatedAt",
      meditationDrafts: "id, userId, sessionId, updatedAt",
      meditationTimerState: "id, userId, sessionId, updatedAt",
      sleepDrafts: "id, userId, sessionId, updatedAt",
      supplementIntakeDrafts: "id, userId, intakeId, updatedAt",
      trackerEventDrafts: "id, userId, eventId, updatedAt",
      trackerTargetDrafts: "id, userId, targetId, updatedAt",
      profilePreferenceDrafts: "id, userId, updatedAt",
      userSupplementDrafts: "id, userId, supplementId, updatedAt",
      trackerReminderDrafts: "id, userId, reminderId, updatedAt",
      dailyOverviewCache: "id, userId, localDate, updatedAt",
    });
  }
}

let dbSingleton: MtfbwuDatabase | null = null;

export function getDatabase(): MtfbwuDatabase {
  if (!dbSingleton) {
    dbSingleton = new MtfbwuDatabase();
  }
  return dbSingleton;
}

/** Test helper — reset singleton between suites. */
export function resetDatabaseSingleton(): void {
  dbSingleton = null;
}
