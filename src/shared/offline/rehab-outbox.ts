import {
  getDatabase,
  type ActiveRehabSessionDraft,
  type MtfbwuDatabase,
  type OutboxRecord,
  type RehabSetDraftStatus,
} from "@/shared/offline/db";
import { createPendingRecord } from "@/shared/offline/outbox";

export const REHAB_ENTITY = {
  session: "rehab_session",
  set: "rehab_set",
  observation: "rehab_observation",
  alert: "rehab_alert",
  scheduled: "scheduled_rehab_session",
} as const;

export type RehabEntityType = (typeof REHAB_ENTITY)[keyof typeof REHAB_ENTITY];

type RehabTable =
  | "rehab_sessions"
  | "rehab_session_exercises"
  | "rehab_sets"
  | "rehab_session_observations"
  | "rehab_alert_events"
  | "scheduled_rehab_sessions";

export type RehabWriteOperation = "upsert" | "delete";

export type RehabWrite = {
  table: RehabTable;
  values: Record<string, unknown> | Record<string, unknown>[];
  operation?: RehabWriteOperation;
};

/**
 * Replay order: session → exercises → sets → observations/alerts → finish.
 * Each payload carries ordered writes for idempotent upsert replay.
 */
export type RehabOutboxPayload = {
  kind: "rehab";
  entity: RehabEntityType;
  sessionId?: string;
  sequence?: number;
  expectedSessionVersion?: number;
  writes: RehabWrite[];
  operation?: RehabWriteOperation;
};

export function isRehabOutboxPayload(payload: unknown): payload is RehabOutboxPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as RehabOutboxPayload).kind === "rehab"
  );
}

export async function queueRehabMutation(input: {
  userId: string;
  entityType: RehabEntityType;
  entityId: string;
  payload: RehabOutboxPayload;
  sessionDraft?: Omit<
    ActiveRehabSessionDraft,
    "id" | "userId" | "sessionId" | "createdAt" | "updatedAt"
  >;
  idempotencyKey?: string;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const idempotencyKey =
    input.idempotencyKey ??
    `rehab:${input.entityType}:${input.entityId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: "upsert",
    payload: input.payload,
  });

  await db.transaction("rw", db.outbox, db.activeRehabSessions, async () => {
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
    if (input.sessionDraft && input.entityType === REHAB_ENTITY.session) {
      const now = new Date().toISOString();
      await db.activeRehabSessions.put({
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

export type RehabSetCompletionInput = {
  setId?: string;
  sessionExerciseId: string;
  side?: string;
  reps?: number | null;
  durationSeconds?: number | null;
  holdSeconds?: number | null;
  load?: number | null;
  loadUnit?: string | null;
  assistanceType?: string | null;
  assistanceAmount?: string | null;
  romAchieved?: number | null;
  painBefore?: number | null;
  painDuring?: number | null;
  painAfter?: number | null;
  swelling?: string | null;
  instability?: string | null;
  confidence?: number | null;
  notes?: string | null;
  now?: string;
};

export function buildSetCompletionWrites(input: RehabSetCompletionInput) {
  const setId = input.setId ?? crypto.randomUUID();
  const now = input.now ?? new Date().toISOString();
  const row: Record<string, unknown> = {
    id: setId,
    rehab_session_exercise_id: input.sessionExerciseId,
    side: input.side ?? "not_applicable",
    status: "completed",
    completed_at: now,
    updated_at: now,
    reps: input.reps ?? null,
    duration_seconds: input.durationSeconds ?? null,
    hold_seconds: input.holdSeconds ?? null,
    load: input.load ?? null,
    load_unit: input.loadUnit ?? null,
    assistance_type: input.assistanceType ?? null,
    assistance_amount: input.assistanceAmount ?? null,
    rom_achieved: input.romAchieved ?? null,
    pain_before: input.painBefore ?? null,
    pain_during: input.painDuring ?? null,
    pain_after: input.painAfter ?? null,
    swelling: input.swelling ?? null,
    instability: input.instability ?? null,
    confidence: input.confidence ?? null,
    notes: input.notes ?? null,
  };
  return { setId, writes: [{ table: "rehab_sets" as const, values: row }] };
}

async function putSetDraft(
  db: MtfbwuDatabase,
  input: {
    userId: string;
    sessionId: string;
    setId: string;
    payload: unknown;
    status: RehabSetDraftStatus;
  },
) {
  const now = new Date().toISOString();
  await db.rehabSetDrafts.put({
    id: `${input.sessionId}:${input.setId}`,
    userId: input.userId,
    sessionId: input.sessionId,
    setId: input.setId,
    payload: input.payload,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  });
}

export async function queueSetCompletion(input: {
  userId: string;
  sessionId: string;
  completion: RehabSetCompletionInput;
}): Promise<{ record: OutboxRecord; setId: string }> {
  const { setId, writes } = buildSetCompletionWrites(input.completion);
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.set,
    sessionId: input.sessionId,
    sequence: 3,
    writes,
  };
  const db = getDatabase();
  const idempotencyKey = `rehab:${REHAB_ENTITY.set}:${setId}:${crypto.randomUUID()}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: REHAB_ENTITY.set,
    entityId: setId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.rehabSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId,
      payload: input.completion,
      status: "completed",
    });
  });

  return { record, setId };
}

export async function queueSetSkip(input: {
  userId: string;
  sessionId: string;
  setId: string;
  sessionExerciseId: string;
}): Promise<OutboxRecord> {
  const now = new Date().toISOString();
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.set,
    sessionId: input.sessionId,
    sequence: 3,
    writes: [
      {
        table: "rehab_sets",
        values: {
          id: input.setId,
          rehab_session_exercise_id: input.sessionExerciseId,
          status: "skipped",
          completed_at: now,
          updated_at: now,
        },
      },
    ],
  };
  const db = getDatabase();
  const record = createPendingRecord({
    idempotencyKey: `rehab:${REHAB_ENTITY.set}:skip:${input.setId}:${crypto.randomUUID()}`,
    userId: input.userId,
    entityType: REHAB_ENTITY.set,
    entityId: input.setId,
    operationType: "upsert",
    payload,
  });
  await db.transaction("rw", db.outbox, db.rehabSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId: input.setId,
      payload: { setId: input.setId },
      status: "skipped",
    });
  });
  return record;
}

export function buildSessionFinishWrites(
  input: {
    sessionId: string;
    startedAt: string;
    now?: string;
  },
  pendingWrites: readonly RehabWrite[] = [],
) {
  const now = input.now ?? new Date().toISOString();
  const start = new Date(input.startedAt).getTime();
  const end = new Date(now).getTime();
  const durationSeconds =
    Number.isFinite(start) && Number.isFinite(end)
      ? Math.max(0, Math.floor((end - start) / 1000))
      : null;
  return {
    writes: [
      ...pendingWrites,
      {
        table: "rehab_sessions" as const,
        values: {
          id: input.sessionId,
          status: "completed",
          completed_at: now,
          duration_seconds: durationSeconds,
          updated_at: now,
        },
      },
    ],
  };
}

async function listPendingSessionWrites(
  db: MtfbwuDatabase,
  sessionId: string,
): Promise<RehabWrite[]> {
  const pending = await db.outbox.where("status").equals("pending").sortBy("createdAt");
  const writes: RehabWrite[] = [];
  for (const record of pending) {
    if (!isRehabOutboxPayload(record.payload)) continue;
    if (record.payload.sessionId !== sessionId) continue;
    if (record.payload.entity === REHAB_ENTITY.session) continue;
    writes.push(...record.payload.writes);
  }
  return writes;
}

export type RehabSetStopInput = {
  setId: string;
  sessionExerciseId: string;
  side?: string;
  painBefore?: number | null;
  painDuring?: number | null;
  painAfter?: number | null;
  swelling?: string | null;
  instability?: string | null;
  confidence?: number | null;
  notes?: string | null;
  now?: string;
};

export function buildSetStopWrites(input: RehabSetStopInput) {
  const now = input.now ?? new Date().toISOString();
  return {
    writes: [
      {
        table: "rehab_sets" as const,
        values: {
          id: input.setId,
          rehab_session_exercise_id: input.sessionExerciseId,
          side: input.side ?? "not_applicable",
          status: "stopped",
          completed_at: now,
          updated_at: now,
          pain_before: input.painBefore ?? null,
          pain_during: input.painDuring ?? null,
          pain_after: input.painAfter ?? null,
          swelling: input.swelling ?? null,
          instability: input.instability ?? null,
          confidence: input.confidence ?? null,
          notes: input.notes ?? null,
        },
      },
    ],
  };
}

export async function queueSetStop(input: {
  userId: string;
  sessionId: string;
  stop: RehabSetStopInput;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const { writes } = buildSetStopWrites(input.stop);
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.set,
    sessionId: input.sessionId,
    sequence: 3,
    writes,
  };
  const record = createPendingRecord({
    idempotencyKey: `rehab:${REHAB_ENTITY.set}:stop:${input.stop.setId}:${crypto.randomUUID()}`,
    userId: input.userId,
    entityType: REHAB_ENTITY.set,
    entityId: input.stop.setId,
    operationType: "upsert",
    payload,
  });
  await db.transaction("rw", db.outbox, db.rehabSetDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putSetDraft(db, {
      userId: input.userId,
      sessionId: input.sessionId,
      setId: input.stop.setId,
      payload: input.stop,
      status: "stopped",
    });
  });
  return record;
}

export type RehabObservationInput = {
  observationId?: string;
  sessionId: string;
  observationType: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  side?: string;
  bodyArea?: string | null;
  now?: string;
};

export function buildObservationWrites(input: RehabObservationInput) {
  const observationId = input.observationId ?? crypto.randomUUID();
  const now = input.now ?? new Date().toISOString();
  return {
    observationId,
    writes: [
      {
        table: "rehab_session_observations" as const,
        values: {
          id: observationId,
          rehab_session_id: input.sessionId,
          observation_type: input.observationType,
          value_numeric: input.valueNumeric ?? null,
          value_text: input.valueText ?? null,
          side: input.side ?? "not_applicable",
          body_area: input.bodyArea ?? null,
          created_at: now,
        },
      },
    ],
  };
}

async function putObservationDraft(
  db: MtfbwuDatabase,
  input: {
    userId: string;
    sessionId: string;
    observationId: string;
    payload: unknown;
  },
) {
  const now = new Date().toISOString();
  await db.rehabObservationDrafts.put({
    id: `${input.sessionId}:${input.observationId}`,
    userId: input.userId,
    sessionId: input.sessionId,
    observationId: input.observationId,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  });
}

export async function queueObservation(input: {
  userId: string;
  observation: RehabObservationInput;
}): Promise<{ record: OutboxRecord; observationId: string }> {
  const { observationId, writes } = buildObservationWrites(input.observation);
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.observation,
    sessionId: input.observation.sessionId,
    sequence: 4,
    writes,
  };
  const db = getDatabase();
  const record = createPendingRecord({
    idempotencyKey: `rehab:${REHAB_ENTITY.observation}:${observationId}:${crypto.randomUUID()}`,
    userId: input.userId,
    entityType: REHAB_ENTITY.observation,
    entityId: observationId,
    operationType: "upsert",
    payload,
  });
  await db.transaction("rw", db.outbox, db.rehabObservationDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putObservationDraft(db, {
      userId: input.userId,
      sessionId: input.observation.sessionId,
      observationId,
      payload: input.observation,
    });
  });
  return { record, observationId };
}

export type RehabAlertAckInput = {
  alertId: string;
  sessionId: string;
  now?: string;
};

export function buildAlertAckWrites(input: RehabAlertAckInput) {
  const now = input.now ?? new Date().toISOString();
  return {
    writes: [
      {
        table: "rehab_alert_events" as const,
        values: {
          id: input.alertId,
          acknowledged_at: now,
        },
      },
    ],
  };
}

async function putAlertDraft(
  db: MtfbwuDatabase,
  input: {
    userId: string;
    sessionId: string;
    alertId: string;
    payload: unknown;
  },
) {
  const now = new Date().toISOString();
  await db.rehabAlertDrafts.put({
    id: `${input.sessionId}:${input.alertId}`,
    userId: input.userId,
    sessionId: input.sessionId,
    alertId: input.alertId,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  });
}

export async function queueAlert(input: {
  userId: string;
  alert: RehabAlertAckInput;
}): Promise<OutboxRecord> {
  const { writes } = buildAlertAckWrites(input.alert);
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.alert,
    sessionId: input.alert.sessionId,
    sequence: 5,
    writes,
  };
  const db = getDatabase();
  const record = createPendingRecord({
    idempotencyKey: `rehab:${REHAB_ENTITY.alert}:ack:${input.alert.alertId}:${crypto.randomUUID()}`,
    userId: input.userId,
    entityType: REHAB_ENTITY.alert,
    entityId: input.alert.alertId,
    operationType: "upsert",
    payload,
  });
  await db.transaction("rw", db.outbox, db.rehabAlertDrafts, async () => {
    const id = await db.outbox.add(record);
    record.id = id;
    await putAlertDraft(db, {
      userId: input.userId,
      sessionId: input.alert.sessionId,
      alertId: input.alert.alertId,
      payload: input.alert,
    });
  });
  return record;
}

export async function queueSessionFinish(input: {
  userId: string;
  sessionId: string;
  startedAt: string;
  expectedSessionVersion?: number;
}): Promise<OutboxRecord> {
  const db = getDatabase();
  const pendingWrites = await listPendingSessionWrites(db, input.sessionId);
  const { writes } = buildSessionFinishWrites(
    {
      sessionId: input.sessionId,
      startedAt: input.startedAt,
    },
    pendingWrites,
  );
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.session,
    sessionId: input.sessionId,
    sequence: 6,
    expectedSessionVersion: input.expectedSessionVersion,
    writes,
  };
  const idempotencyKey = `rehab:${REHAB_ENTITY.session}:finish:${input.sessionId}`;
  const record = createPendingRecord({
    idempotencyKey,
    userId: input.userId,
    entityType: REHAB_ENTITY.session,
    entityId: input.sessionId,
    operationType: "upsert",
    payload,
  });

  await db.transaction("rw", db.outbox, db.activeRehabSessions, async () => {
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
    await db.activeRehabSessions.delete(input.sessionId);
  });

  return record;
}

export async function queueSessionDiscard(input: {
  userId: string;
  sessionId: string;
  expectedSessionVersion?: number;
}): Promise<OutboxRecord> {
  const now = new Date().toISOString();
  const payload: RehabOutboxPayload = {
    kind: "rehab",
    entity: REHAB_ENTITY.session,
    sessionId: input.sessionId,
    sequence: 6,
    expectedSessionVersion: input.expectedSessionVersion,
    writes: [
      {
        table: "rehab_sessions",
        values: {
          id: input.sessionId,
          status: "discarded",
          completed_at: now,
          updated_at: now,
        },
      },
    ],
  };
  return queueRehabMutation({
    userId: input.userId,
    entityType: REHAB_ENTITY.session,
    entityId: input.sessionId,
    payload,
    idempotencyKey: `rehab:${REHAB_ENTITY.session}:discard:${input.sessionId}`,
  });
}

export function isSessionReopenConflict(
  existingStatus: string | undefined,
  incomingStatus: unknown,
): boolean {
  if (existingStatus !== "completed" && existingStatus !== "discarded") return false;
  return incomingStatus === "in_progress" || incomingStatus === "paused";
}

export function isSessionVersionConflict(
  existingVersion: number | undefined,
  expectedVersion: number | undefined,
): boolean {
  if (expectedVersion == null || existingVersion == null) return false;
  return existingVersion !== expectedVersion;
}

export function isStaleSetWrite(
  existingStatus: string | undefined,
  incoming: { status?: unknown; completed_at?: unknown },
): boolean {
  if (existingStatus !== "completed" && existingStatus !== "stopped") return false;
  if (incoming.status === "skipped" || incoming.status === "pending") return true;
  return false;
}

export function isStoppedToCompletedConflict(
  existingStatus: string | undefined,
  incomingStatus: unknown,
): boolean {
  return existingStatus === "stopped" && incomingStatus === "completed";
}

export function isAlertAckRemovalConflict(
  existingAcknowledgedAt: string | null | undefined,
  incomingAcknowledgedAt: unknown,
): boolean {
  return Boolean(existingAcknowledgedAt) && incomingAcknowledgedAt == null;
}
