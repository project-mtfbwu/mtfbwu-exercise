import { describe, expect, it } from "vitest";
import {
  WORKOUT_ENTITY,
  buildScheduledStatusWrites,
  buildSessionDiscardWrites,
  buildSessionFinishWrites,
  buildSessionNoteWrites,
  buildSetAddWrites,
  buildSetCompletionWrites,
  buildSetDeleteWrites,
  buildSetSkipWrites,
  buildSetUnskipWrites,
  buildSetUpdateWrites,
  isSessionReopenConflict,
  isSessionVersionConflict,
  isStaleSetWrite,
  isWorkoutOutboxPayload,
} from "@/shared/offline/workout-outbox";
import { createPendingRecord } from "@/shared/offline/outbox";

describe("buildSetCompletionWrites", () => {
  it("builds a completed workout_sets upsert row", () => {
    const { setId, writes } = buildSetCompletionWrites({
      setId: "set-1",
      sessionExerciseId: "exercise-1",
      reps: 8,
      loadKg: 60,
      loadUnit: "kg",
      now: "2026-07-30T12:00:00.000Z",
    });

    expect(setId).toBe("set-1");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      table: "workout_sets",
      values: {
        id: "set-1",
        workout_session_exercise_id: "exercise-1",
        status: "completed",
        completed_at: "2026-07-30T12:00:00.000Z",
        reps: 8,
        weight_kg: 60,
        load_unit: "kg",
      },
    });
  });

  it("generates a client id when setId is omitted", () => {
    const { setId } = buildSetCompletionWrites({
      sessionExerciseId: "exercise-1",
    });
    expect(setId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("buildSetSkipWrites / buildSetUnskipWrites", () => {
  it("skips a set with completed_at cleared", () => {
    const { setId, writes } = buildSetSkipWrites({
      setId: "set-1",
      now: "2026-07-30T12:00:00.000Z",
    });
    expect(setId).toBe("set-1");
    expect(writes[0]).toMatchObject({
      table: "workout_sets",
      values: { id: "set-1", status: "skipped", completed_at: null },
    });
  });

  it("unskips a set back to pending", () => {
    const { writes } = buildSetUnskipWrites({ setId: "set-1" });
    expect(writes[0]).toMatchObject({
      table: "workout_sets",
      values: { id: "set-1", status: "pending", completed_at: null },
    });
  });
});

describe("buildSetAddWrites / buildSetUpdateWrites / buildSetDeleteWrites", () => {
  it("adds a new pending set with a client id", () => {
    const { setId, writes } = buildSetAddWrites({
      sessionExerciseId: "exercise-1",
      setIndex: 3,
      setRole: "backoff",
      now: "2026-07-30T12:00:00.000Z",
    });
    expect(setId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(writes[0]).toMatchObject({
      table: "workout_sets",
      values: {
        workout_session_exercise_id: "exercise-1",
        set_index: 3,
        set_role: "backoff",
        status: "pending",
      },
    });
  });

  it("only writes the fields provided for a partial update", () => {
    const { writes } = buildSetUpdateWrites({ setId: "set-1", reps: 10 });
    const values = writes[0]?.values as Record<string, unknown>;
    expect(values).toMatchObject({ id: "set-1", reps: 10 });
    expect(values.weight_kg).toBeUndefined();
    expect(values.status).toBeUndefined();
  });

  it("marks a delete write with a delete operation", () => {
    const { setId, writes } = buildSetDeleteWrites({ setId: "set-1" });
    expect(setId).toBe("set-1");
    expect(writes[0]).toMatchObject({
      table: "workout_sets",
      operation: "delete",
      values: { id: "set-1" },
    });
  });
});

describe("buildSessionNoteWrites", () => {
  it("builds a workout_session_notes upsert row", () => {
    const { noteId, writes } = buildSessionNoteWrites({
      sessionId: "session-1",
      userId: "user-1",
      body: "Felt strong today",
      now: "2026-07-30T12:00:00.000Z",
    });
    expect(noteId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(writes[0]).toMatchObject({
      table: "workout_session_notes",
      values: {
        workout_session_id: "session-1",
        user_id: "user-1",
        body: "Felt strong today",
        value_text: "Felt strong today",
        note_type: "general",
      },
    });
  });
});

describe("buildSessionFinishWrites", () => {
  it("prepends pending set writes before the session completion write", () => {
    const pendingSetWrites = [
      { table: "workout_sets" as const, values: { id: "set-1", status: "completed" } },
      { table: "workout_sets" as const, values: { id: "set-2", status: "skipped" } },
    ];
    const { writes } = buildSessionFinishWrites(
      {
        sessionId: "session-1",
        expectedVersion: 3,
        completedAt: "2026-07-30T12:00:00.000Z",
        durationSeconds: 1800,
        totalVolume: 450,
      },
      pendingSetWrites,
    );

    expect(writes).toHaveLength(3);
    expect(writes[0]).toBe(pendingSetWrites[0]);
    expect(writes[1]).toBe(pendingSetWrites[1]);
    expect(writes[2]).toMatchObject({
      table: "workout_sessions",
      values: {
        id: "session-1",
        status: "completed",
        completed_at: "2026-07-30T12:00:00.000Z",
        duration_seconds: 1800,
        total_volume: 450,
      },
    });
  });

  it("finishes with no pending writes when none are queued", () => {
    const { writes } = buildSessionFinishWrites({
      sessionId: "session-1",
      expectedVersion: 1,
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]?.table).toBe("workout_sessions");
  });
});

describe("buildSessionDiscardWrites / buildScheduledStatusWrites", () => {
  it("discards a session", () => {
    const { writes } = buildSessionDiscardWrites({
      sessionId: "session-1",
      now: "2026-07-30T12:00:00.000Z",
    });
    expect(writes[0]).toMatchObject({
      table: "workout_sessions",
      values: { id: "session-1", status: "discarded" },
    });
  });

  it("updates a scheduled workout's status", () => {
    const { writes } = buildScheduledStatusWrites({
      scheduledWorkoutId: "scheduled-1",
      status: "started",
    });
    expect(writes[0]).toMatchObject({
      table: "scheduled_workouts",
      values: { id: "scheduled-1", status: "started" },
    });
  });
});

describe("stale-write conflict predicates", () => {
  it("rejects a skip that would clobber a completed set", () => {
    expect(isStaleSetWrite("completed", { status: "skipped" })).toBe(true);
    expect(isStaleSetWrite("completed", { completed_at: null })).toBe(true);
  });

  it("allows editing a completed set's numbers without changing status", () => {
    expect(isStaleSetWrite("completed", {})).toBe(false);
  });

  it("allows completing a pending set", () => {
    expect(isStaleSetWrite("pending", { status: "completed" })).toBe(false);
  });

  it("rejects reopening a completed or discarded session", () => {
    expect(isSessionReopenConflict("completed", "in_progress")).toBe(true);
    expect(isSessionReopenConflict("discarded", "in_progress")).toBe(true);
    expect(isSessionReopenConflict("in_progress", "in_progress")).toBe(false);
  });

  it("flags a session version mismatch only when a version is expected", () => {
    expect(isSessionVersionConflict(3, 2)).toBe(true);
    expect(isSessionVersionConflict(3, 3)).toBe(false);
    expect(isSessionVersionConflict(3, undefined)).toBe(false);
  });
});

describe("isWorkoutOutboxPayload", () => {
  it("accepts workout session, set, note, and scheduled payloads", () => {
    for (const entity of Object.values(WORKOUT_ENTITY)) {
      expect(
        isWorkoutOutboxPayload({
          kind: "workout",
          entity,
          writes: [{ table: "workout_sets", values: { id: "x" } }],
        }),
      ).toBe(true);
    }
  });

  it("rejects non-workout payloads", () => {
    const record = createPendingRecord({
      idempotencyKey: "k",
      userId: "u",
      entityType: "meal_log",
      entityId: "m",
      operationType: "upsert",
      payload: { kind: "nutrition" },
    });
    expect(isWorkoutOutboxPayload(record.payload)).toBe(false);
  });
});
