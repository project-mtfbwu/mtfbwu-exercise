import {
  getDatabase,
  type ActiveWorkoutSessionDraft,
  type MtfbwuDatabase,
  type OutboxRecord,
  type WorkoutSetDraftStatus,
  type WorkoutSetMutationKind,
} from "@/shared/offline/db";
import { createPendingRecord } from "@/shared/offline/outbox";

export const WORKOUT_ENTITY = {
  session: "workout_session",
  set: "workout_set",
  note: "workout_session_note",
  scheduled: "scheduled_workout",
} as const;

export type WorkoutEntityType = (typeof WORKOUT_ENTITY)[keyof typeof WORKOUT_ENTITY];
type WorkoutTable =
  | "workout_sessions"
  | "workout_session_exercises"
  | "workout_sets"
  | "workout_session_notes"
  | "scheduled_workouts";

export type WorkoutWriteOperation = "upsert" | "delete";

export type WorkoutWrite = {
  table: WorkoutTable;
  values: Record<string, unknown> | Record<string, unknown>[];
  /** Defaults to `"upsert"` when omitted — see `applyWorkoutPayload`. */
  operation?: WorkoutWriteOperation;
};

/**
 * Each payload contains primary-keyed rows in dependency order. Replaying an
 * upsert is safe, so retries do not create duplicate workout rows.
 * `sessionId`/`expectedSessionVersion` let the coordinator apply session-level
 * conflict rules without re-parsing individual writes; `sequence` is reserved
 * for callers that need explicit multi-payload ordering within one session
 * (the finish flow below folds pending writes into one payload instead, so it
 * does not need this in practice).
 */
export type WorkoutOutboxPayload = {
  kind: "workout";
  entity: WorkoutEntityType;
  sessionId?: string;
  sequence?: number;
  expectedSessionVersion?: number;
  writes: WorkoutWrite[];
  operation?: WorkoutWriteOperation;
};

/** General-purpose workout mutation queue (session start/finish/discard). */
export async function queueWorkoutMutation(input: {
  userId: string;
  entityType: WorkoutEntityType;
  entityId: string;
  payload: WorkoutOutboxPayload;
  sessionDraft?: Omit<
    ActiveWorkoutSessionDraft,
    "id" | "userId" | "sessionId" | "createdAt" | "updatedAt"
  >;
  idempotencyKey?: string;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const idempotencyKey =
    input.idempotencyKey ??
    `workout:${input.entityType}:${input.entityId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: "upsert",
    payload: input.payload,
  });

  await db.transaction("rw", db.outbox, db.activeWorkoutSessions, async () => {
    const existing = await db.outbox
      .where("idempotencyKey")
      .equals(idempotencyKey)
      .first();
    if (existing) {
      Object.assign(record, existing);
      return;
    }
    const id = await db.outbox.add(record);
    record.id = id;
    if (input.sessionDraft && input.entityType === WORKOUT_ENTITY.session) {
      const now = new Date().toISOString();
      await db.activeWorkoutSessions.put({
        ...input.sessionDraft,
        id: input.entityId,
        userId: input.userId,
        sessionId: input.entityId,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return record;
}

// ---------------------------------------------------------------------------
// Set mutations — complete / skip / unskip / add / update / delete
// ---------------------------------------------------------------------------

export type SetCompletionInput = {
  /** Reuse a synced set's id to update it; omit to create a client-generated id. */
  setId?: string;
  sessionExerciseId: string;
  reps?: number | null;
  loadKg?: number | null;
  loadUnit?: "kg" | "lb" | "bodyweight" | "assisted_bodyweight";
  durationSeconds?: number | null;
  rpe?: number | null;
  now?: string;
};

export type SetCompletionWrites = {
  setId: string;
  writes: WorkoutWrite[];
};

/**
 * Builds the `workout_sets` upsert row for a queued set completion.
 * Client-generated ids make retries idempotent — a replayed write upserts
 * the same primary key instead of duplicating a set. Mirrors
 * `buildMealLogWrites` in `nutrition-outbox.ts`.
 *
 * Known limitation: `loadKg` here is whatever the caller already resolved
 * to kilograms (see `normalizeLoadToKg`/`calculations/units.ts`). Bodyweight
 * loads still require the caller to resolve the user's bodyweight before
 * calling this — it is not resolved offline.
 */
export function buildSetCompletionWrites(input: SetCompletionInput): SetCompletionWrites {
  const setId = input.setId ?? crypto.randomUUID();
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = {
    id: setId,
    workout_session_exercise_id: input.sessionExerciseId,
    status: "completed",
    completed_at: now,
    updated_at: now,
    reps: input.reps ?? null,
    weight_kg: input.loadKg ?? null,
    load_unit: input.loadUnit ?? "kg",
    duration_seconds: input.durationSeconds ?? null,
    rpe: input.rpe ?? null,
  };
  return { setId, writes: [{ table: "workout_sets", values: row }] };
}

/**
 * Queues a set completion payload for sync and records a local draft so the
 * in-progress workout UI can show it as completed before the network round
 * trip finishes.
 */
export async function queueSetCompletion(input: {
  userId: string;
  sessionId: string;
  completion: SetCompletionInput;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const { setId, writes } = buildSetCompletionWrites(input.completion);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.set,
    sessionId: input.sessionId,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `workout:${WORKOUT_ENTITY.set}:${setId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.set,
    entityId: setId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId,
      payload: input.completion,
      status: "completed",
      mutationKind: "complete",
    });
  });

  return { record, setId };
}

export type SetSkipInput = {
  setId: string;
  now?: string;
};

export type SetSkipWrites = { setId: string; writes: WorkoutWrite[] };

/** Skips a pending set: `status: skipped`, `completed_at: null`. */
export function buildSetSkipWrites(input: SetSkipInput): SetSkipWrites {
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = {
    id: input.setId,
    status: "skipped",
    completed_at: null,
    updated_at: now,
  };
  return { setId: input.setId, writes: [{ table: "workout_sets", values: row }] };
}

export async function queueSetSkip(input: {
  userId: string;
  sessionId: string;
  setId: string;
  now?: string;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const { setId, writes } = buildSetSkipWrites(input);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.set,
    sessionId: input.sessionId,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `workout:${WORKOUT_ENTITY.set}:${setId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.set,
    entityId: setId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId,
      payload: { setId },
      status: "skipped",
      mutationKind: "skip",
    });
  });

  return { record, setId };
}

/**
 * Reverses an offline skip back to `pending`. Only safe to replay when the
 * remote set is not already `completed` — `applyWorkoutPayload` in
 * `sync-coordinator.ts` enforces that with `isStaleSetWrite`, since a stale
 * unskip must never clear a completion recorded elsewhere.
 */
export function buildSetUnskipWrites(input: SetSkipInput): SetSkipWrites {
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = {
    id: input.setId,
    status: "pending",
    completed_at: null,
    updated_at: now,
  };
  return { setId: input.setId, writes: [{ table: "workout_sets", values: row }] };
}

export async function queueSetUnskip(input: {
  userId: string;
  sessionId: string;
  setId: string;
  now?: string;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const { setId, writes } = buildSetUnskipWrites(input);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.set,
    sessionId: input.sessionId,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `workout:${WORKOUT_ENTITY.set}:${setId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.set,
    entityId: setId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId,
      payload: { setId },
      status: "pending",
      mutationKind: "unskip",
    });
  });

  return { record, setId };
}

export type SetAddInput = {
  /** Client-generated id; omit to generate one. */
  setId?: string;
  sessionExerciseId: string;
  setIndex: number;
  setRole?: string;
  now?: string;
};

export type SetAddWrites = { setId: string; writes: WorkoutWrite[] };

/** Adds a brand-new pending set, entirely client-originated until synced. */
export function buildSetAddWrites(input: SetAddInput): SetAddWrites {
  const setId = input.setId ?? crypto.randomUUID();
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = {
    id: setId,
    workout_session_exercise_id: input.sessionExerciseId,
    set_index: input.setIndex,
    set_role: input.setRole ?? "working",
    status: "pending",
    created_at: now,
    updated_at: now,
  };
  return { setId, writes: [{ table: "workout_sets", values: row }] };
}

export async function queueSetAdd(input: {
  userId: string;
  sessionId: string;
  set: SetAddInput;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const { setId, writes } = buildSetAddWrites(input.set);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.set,
    sessionId: input.sessionId,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `workout:${WORKOUT_ENTITY.set}:${setId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.set,
    entityId: setId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    // `localOnly: true` is what later lets `queueSetDelete` remove this set
    // offline — a set that only ever existed on this device is safe to drop
    // without a server round trip.
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId,
      payload: input.set,
      status: "pending",
      mutationKind: "add",
      localOnly: true,
    });
  });

  return { record, setId };
}

export type SetUpdateInput = {
  setId: string;
  reps?: number | null;
  loadKg?: number | null;
  loadUnit?: "kg" | "lb" | "bodyweight" | "assisted_bodyweight";
  durationSeconds?: number | null;
  rpe?: number | null;
  now?: string;
};

export type SetUpdateWrites = { setId: string; writes: WorkoutWrite[] };

/**
 * Partial edit of a pending (or otherwise not-yet-final) set's numbers —
 * only the provided fields are written, so replaying does not clobber
 * fields another queued mutation already changed.
 */
export function buildSetUpdateWrites(input: SetUpdateInput): SetUpdateWrites {
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = { id: input.setId, updated_at: now };
  if (input.reps !== undefined) row.reps = input.reps;
  if (input.loadKg !== undefined) row.weight_kg = input.loadKg;
  if (input.loadUnit !== undefined) row.load_unit = input.loadUnit;
  if (input.durationSeconds !== undefined) row.duration_seconds = input.durationSeconds;
  if (input.rpe !== undefined) row.rpe = input.rpe;
  return { setId: input.setId, writes: [{ table: "workout_sets", values: row }] };
}

export async function queueSetUpdate(input: {
  userId: string;
  sessionId: string;
  update: SetUpdateInput;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const { setId, writes } = buildSetUpdateWrites(input.update);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.set,
    sessionId: input.sessionId,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `workout:${WORKOUT_ENTITY.set}:${setId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.set,
    entityId: setId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId,
      payload: input.update,
      mutationKind: "update",
    });
  });

  return { record, setId };
}

export type SetDeleteInput = { setId: string };
export type SetDeleteWrites = { setId: string; writes: WorkoutWrite[] };

export function buildSetDeleteWrites(input: SetDeleteInput): SetDeleteWrites {
  return {
    setId: input.setId,
    writes: [
      {
        table: "workout_sets",
        values: { id: input.setId },
        operation: "delete",
      },
    ],
  };
}

/**
 * Deletes a set offline. Only allowed for sets this device itself created
 * and that have never synced — checked via the tracked `localOnly` draft
 * flag, not a caller-supplied boolean, so a stale/forged call cannot delete
 * a set that already exists on the server.
 */
export async function queueSetDelete(input: {
  userId: string;
  sessionId: string;
  setId: string;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const db = getDatabase();
  const existingDraft = await db.workoutSetDrafts.get(input.setId);
  if (!existingDraft?.localOnly) {
    throw new Error("Only client-added, unsynced sets can be deleted offline.");
  }

  const { writes } = buildSetDeleteWrites({ setId: input.setId });
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.set,
    sessionId: input.sessionId,
    operation: "delete",
    writes,
  };
  const idempotencyKey = `workout:${WORKOUT_ENTITY.set}:${input.setId}:delete:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.set,
    entityId: input.setId,
    operationType: "delete",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await db.workoutSetDrafts.delete(input.setId);
  });

  return { record, setId: input.setId };
}

async function putSetDraft(
  db: MtfbwuDatabase,
  entry: {
    userId: string;
    sessionId: string;
    setId: string;
    payload: unknown;
    status?: WorkoutSetDraftStatus;
    mutationKind: WorkoutSetMutationKind;
    localOnly?: boolean;
  },
): Promise<void> {
  const existing = await db.workoutSetDrafts.get(entry.setId);
  const now = new Date().toISOString();
  await db.workoutSetDrafts.put({
    id: entry.setId,
    userId: entry.userId,
    sessionId: entry.sessionId,
    setId: entry.setId,
    payload: entry.payload,
    status: entry.status ?? existing?.status,
    localOnly: entry.localOnly ?? existing?.localOnly ?? false,
    mutationKind: entry.mutationKind,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// Session notes
// ---------------------------------------------------------------------------

export type SessionNoteInput = {
  noteId?: string;
  sessionId: string;
  userId: string;
  body: string;
  noteType?: string;
  bodyArea?: string | null;
  now?: string;
};

export type SessionNoteWrites = { noteId: string; writes: WorkoutWrite[] };

export function buildSessionNoteWrites(input: SessionNoteInput): SessionNoteWrites {
  const noteId = input.noteId ?? crypto.randomUUID();
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = {
    id: noteId,
    workout_session_id: input.sessionId,
    user_id: input.userId,
    body: input.body,
    value_text: input.body,
    note_type: input.noteType ?? "general",
    body_area: input.bodyArea ?? null,
    updated_at: now,
  };
  return { noteId, writes: [{ table: "workout_session_notes", values: row }] };
}

export async function queueSessionNote(input: {
  note: SessionNoteInput;
}): Promise<{ record: OutboxRecord; noteId: string }> {
  const { noteId, writes } = buildSessionNoteWrites(input.note);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.note,
    sessionId: input.note.sessionId,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `workout:${WORKOUT_ENTITY.note}:${noteId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.note.userId,
    entityType: WORKOUT_ENTITY.note,
    entityId: noteId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.workoutNoteDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    const now = new Date().toISOString();
    await db.workoutNoteDrafts.put({
      id: noteId,
      userId: input.note.userId,
      sessionId: input.note.sessionId,
      noteId,
      payload: input.note,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { record, noteId };
}

// ---------------------------------------------------------------------------
// Session finish / discard
// ---------------------------------------------------------------------------

export type SessionFinishInput = {
  sessionId: string;
  expectedVersion: number;
  completedAt?: string;
  durationSeconds?: number | null;
  totalVolume?: number | null;
  sessionRpe?: number | null;
  notes?: string | null;
};

export type SessionFinishWrites = { writes: WorkoutWrite[] };

/**
 * Pure half of `queueSessionFinish`: builds the session-completion write and
 * prepends any already-queued set writes so the whole thing replays as one
 * ordered payload (Option A from the offline-sync brief — simpler than a
 * `dependsOnKeys` sequencing scheme). A completed session with pending set
 * writes still missing would otherwise finish with stale-looking data if the
 * network drops mid-sync; bundling makes that impossible to observe.
 */
export function buildSessionFinishWrites(
  input: SessionFinishInput,
  pendingSetWrites: readonly WorkoutWrite[] = [],
): SessionFinishWrites {
  const now = input.completedAt ?? new Date().toISOString();
  const sessionRow: Record<string, unknown> = {
    id: input.sessionId,
    status: "completed",
    completed_at: now,
    duration_seconds: input.durationSeconds ?? null,
    total_volume: input.totalVolume ?? null,
    session_rpe: input.sessionRpe ?? null,
    notes: input.notes ?? null,
  };
  return {
    writes: [...pendingSetWrites, { table: "workout_sessions", values: sessionRow }],
  };
}

/** Chronological writes from every still-pending queued set mutation for a session. */
async function listPendingSetWrites(
  db: MtfbwuDatabase,
  sessionId: string,
): Promise<WorkoutWrite[]> {
  const pending = await db.outbox.where("status").equals("pending").sortBy("createdAt");
  const writes: WorkoutWrite[] = [];
  for (const record of pending) {
    if (!isWorkoutOutboxPayload(record.payload)) continue;
    if (record.payload.entity !== WORKOUT_ENTITY.set) continue;
    if (record.payload.sessionId !== sessionId) continue;
    writes.push(...record.payload.writes);
  }
  return writes;
}

/**
 * Queues the finish mutation with every pending set write for this session
 * folded in first (see `buildSessionFinishWrites`). The original per-set
 * outbox rows are left in place — upserts are idempotent by primary key, so
 * the coordinator applying both is a harmless no-op, not a double-write.
 */
export async function queueSessionFinish(input: {
  userId: string;
  finish: SessionFinishInput;
}): Promise<{ record: OutboxRecord }> {
  const db = getDatabase();
  const pendingSetWrites = await listPendingSetWrites(db, input.finish.sessionId);
  const { writes } = buildSessionFinishWrites(input.finish, pendingSetWrites);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.session,
    sessionId: input.finish.sessionId,
    expectedSessionVersion: input.finish.expectedVersion,
    writes,
  };
  const idempotencyKey = `workout:${WORKOUT_ENTITY.session}:finish:${input.finish.sessionId}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.session,
    entityId: input.finish.sessionId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.activeWorkoutSessions, async () => {
    const existing = await db.outbox
      .where("idempotencyKey")
      .equals(idempotencyKey)
      .first();
    if (existing) {
      Object.assign(record, existing);
      return;
    }
    const id = await db.outbox.add(record);
    record.id = id;
    await db.activeWorkoutSessions.delete(input.finish.sessionId);
  });

  return { record };
}

export type SessionDiscardInput = {
  sessionId: string;
  expectedVersion?: number;
  now?: string;
};

export type SessionDiscardWrites = { writes: WorkoutWrite[] };

export function buildSessionDiscardWrites(
  input: SessionDiscardInput,
): SessionDiscardWrites {
  const now = input.now ?? new Date().toISOString();
  return {
    writes: [
      {
        table: "workout_sessions",
        values: { id: input.sessionId, status: "discarded", updated_at: now },
      },
    ],
  };
}

export async function queueSessionDiscard(input: {
  userId: string;
  discard: SessionDiscardInput;
}): Promise<{ record: OutboxRecord }> {
  const db = getDatabase();
  const { writes } = buildSessionDiscardWrites(input.discard);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.session,
    sessionId: input.discard.sessionId,
    expectedSessionVersion: input.discard.expectedVersion,
    writes,
  };
  const idempotencyKey = `workout:${WORKOUT_ENTITY.session}:discard:${input.discard.sessionId}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.session,
    entityId: input.discard.sessionId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.activeWorkoutSessions, async () => {
    const existing = await db.outbox
      .where("idempotencyKey")
      .equals(idempotencyKey)
      .first();
    if (existing) {
      Object.assign(record, existing);
      return;
    }
    const id = await db.outbox.add(record);
    record.id = id;
    await db.activeWorkoutSessions.delete(input.discard.sessionId);
  });

  return { record };
}

// ---------------------------------------------------------------------------
// Scheduled workout status
// ---------------------------------------------------------------------------

export type ScheduledStatusInput = {
  scheduledWorkoutId: string;
  status: "planned" | "started" | "completed" | "cancelled";
  now?: string;
};

export type ScheduledStatusWrites = { writes: WorkoutWrite[] };

export function buildScheduledStatusWrites(
  input: ScheduledStatusInput,
): ScheduledStatusWrites {
  const now = input.now ?? new Date().toISOString();
  return {
    writes: [
      {
        table: "scheduled_workouts",
        values: { id: input.scheduledWorkoutId, status: input.status, updated_at: now },
      },
    ],
  };
}

export async function queueScheduledStatus(input: {
  userId: string;
  status: ScheduledStatusInput;
}): Promise<{ record: OutboxRecord }> {
  const db = getDatabase();
  const { writes } = buildScheduledStatusWrites(input.status);
  const payload: WorkoutOutboxPayload = {
    kind: "workout",
    entity: WORKOUT_ENTITY.scheduled,
    writes,
  };
  const idempotencyKey = `workout:${WORKOUT_ENTITY.scheduled}:${input.status.scheduledWorkoutId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: WORKOUT_ENTITY.scheduled,
    entityId: input.status.scheduledWorkoutId,
    operationType: "upsert",
    payload,
  });
  const id = await db.outbox.add(record);
  record.id = id;
  return { record };
}

// ---------------------------------------------------------------------------
// Conflict rules — pure, shared with `sync-coordinator.ts#applyWorkoutPayload`
// ---------------------------------------------------------------------------

/**
 * A remote `workout_sets` row already `completed` can only be overwritten by
 * another completion — never by a skip, a reopen to `pending`, or any write
 * that nulls `completed_at`. Guards against a stale offline skip/unskip
 * clobbering a completion that synced from another device in the meantime.
 */
export function isStaleSetWrite(
  existingStatus: string | null | undefined,
  incoming: { status?: unknown; completed_at?: unknown },
): boolean {
  if (existingStatus !== "completed") return false;
  return (
    incoming.completed_at === null ||
    incoming.status === "skipped" ||
    incoming.status === "pending"
  );
}

/** A `completed`/`discarded` session can never be reopened by a stale `in_progress` write. */
export function isSessionReopenConflict(
  existingStatus: string | null | undefined,
  incomingStatus: unknown,
): boolean {
  return (
    (existingStatus === "completed" || existingStatus === "discarded") &&
    incomingStatus === "in_progress"
  );
}

/** Optimistic-concurrency check for destructive session writes (e.g. discard). */
export function isSessionVersionConflict(
  existingVersion: number | null | undefined,
  expectedVersion: number | undefined,
): boolean {
  if (expectedVersion === undefined) return false;
  if (existingVersion === null || existingVersion === undefined) return false;
  return existingVersion !== expectedVersion;
}

export function isWorkoutOutboxPayload(value: unknown): value is WorkoutOutboxPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<WorkoutOutboxPayload>;
  return (
    payload.kind === "workout" &&
    (payload.entity === WORKOUT_ENTITY.session ||
      payload.entity === WORKOUT_ENTITY.set ||
      payload.entity === WORKOUT_ENTITY.note ||
      payload.entity === WORKOUT_ENTITY.scheduled) &&
    Array.isArray(payload.writes)
  );
}
