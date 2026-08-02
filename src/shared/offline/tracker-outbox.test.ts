import { describe, expect, it } from "vitest";
import {
  buildHydrationEntryDeleteWrites,
  buildHydrationEntryWrites,
  buildMeditationSessionWrites,
  buildSleepSessionDeleteWrites,
  buildSleepSessionWrites,
  buildSupplementIntakeDeleteWrites,
  buildSupplementIntakeWrites,
  buildTrackerEventWrites,
  buildTrackerReminderWrites,
  buildUserTrackerWrites,
  isTrackerOutboxPayload,
  isTrackerConflict,
  sortTrackerRecordsForReplay,
  trackerDependenciesMet,
  type TrackerOutboxPayload,
} from "@/shared/offline/tracker-outbox";
import type { OutboxRecord } from "@/shared/offline/db";

describe("isTrackerOutboxPayload", () => {
  it("recognizes tracker kind", () => {
    const payload: TrackerOutboxPayload = {
      kind: "tracker",
      entity: "hydration_entry",
      writes: [],
    };
    expect(isTrackerOutboxPayload(payload)).toBe(true);
    expect(isTrackerOutboxPayload({ kind: "progress" })).toBe(false);
  });
});

describe("buildHydrationEntryWrites", () => {
  it("produces hydration_entries upsert", () => {
    const writes = buildHydrationEntryWrites({
      entryId: "e1",
      userId: "u1",
      localDate: "2026-08-01",
      amountMl: 250,
      vesselLabel: "Glass",
    });
    expect(writes).toHaveLength(1);
    expect(writes[0]!.table).toBe("hydration_entries");
    expect((writes[0]!.values as Record<string, unknown>).amount_ml).toBe(250);
  });
});

describe("buildHydrationEntryDeleteWrites", () => {
  it("soft-deletes via deleted_at", () => {
    const writes = buildHydrationEntryDeleteWrites({
      entryId: "e1",
      userId: "u1",
      clientUpdatedAt: "2026-08-01T12:00:00.000Z",
    });
    expect((writes[0]!.values as Record<string, unknown>).deleted_at).toBeTruthy();
    expect(writes[0]!.conflictIfServerUpdatedAfter).toBe("2026-08-01T12:00:00.000Z");
  });
});

describe("buildMeditationSessionWrites", () => {
  it("produces meditation_sessions upsert", () => {
    const writes = buildMeditationSessionWrites({
      sessionId: "s1",
      userId: "u1",
      localDate: "2026-08-01",
      startedAt: "2026-08-01T10:00:00.000Z",
      completedAt: "2026-08-01T10:05:00.000Z",
      durationSeconds: 300,
      meditationType: "mindfulness",
    });
    expect(writes[0]!.table).toBe("meditation_sessions");
    expect((writes[0]!.values as Record<string, unknown>).duration_seconds).toBe(300);
  });
});

describe("buildSleepSessionWrites", () => {
  it("includes timezone and sleep_date", () => {
    const writes = buildSleepSessionWrites({
      sessionId: "s1",
      userId: "u1",
      timezone: "America/New_York",
      sleepDate: "2026-08-01",
      bedtimeAt: "2026-08-02T02:00:00.000Z",
      wakeAt: "2026-08-02T10:00:00.000Z",
      durationSeconds: 28800,
      nap: false,
    });
    const values = writes[0]!.values as Record<string, unknown>;
    expect(values.timezone).toBe("America/New_York");
    expect(values.sleep_date).toBe("2026-08-01");
  });
});

describe("buildSleepSessionDeleteWrites", () => {
  it("soft-deletes via deleted_at", () => {
    const writes = buildSleepSessionDeleteWrites({
      sessionId: "s1",
      userId: "u1",
      clientUpdatedAt: "2026-08-01T12:00:00.000Z",
    });
    expect((writes[0]!.values as Record<string, unknown>).deleted_at).toBeTruthy();
  });
});

describe("buildSupplementIntakeWrites", () => {
  it("stores supplement name in note when no snapshot column", () => {
    const writes = buildSupplementIntakeWrites({
      intakeId: "i1",
      userId: "u1",
      userSupplementId: "us1",
      localDate: "2026-08-01",
      status: "taken",
      supplementName: "Vitamin D",
    });
    expect((writes[0]!.values as Record<string, unknown>).note).toBe(
      "Supplement: Vitamin D",
    );
  });
});

describe("buildSupplementIntakeDeleteWrites", () => {
  it("soft-deletes via deleted_at", () => {
    const writes = buildSupplementIntakeDeleteWrites({
      intakeId: "i1",
      userId: "u1",
    });
    expect((writes[0]!.values as Record<string, unknown>).deleted_at).toBeTruthy();
  });
});

describe("buildTrackerReminderWrites", () => {
  it("persists local_time and days_of_week", () => {
    const writes = buildTrackerReminderWrites({
      reminderId: "r1",
      userId: "u1",
      userTrackerId: "t1",
      localTime: "09:00",
      timezone: "America/New_York",
      daysOfWeek: [1, 3, 5],
      enabled: true,
      reminderType: "tracker",
    });
    const values = writes[0]!.values as Record<string, unknown>;
    expect(values.local_time).toBe("09:00");
    expect(values.days_of_week).toEqual([1, 3, 5]);
    expect(values.enabled).toBe(true);
  });
});

describe("buildTrackerEventWrites", () => {
  it("supports numeric custom tracker values", () => {
    const writes = buildTrackerEventWrites({
      eventId: "ev1",
      userId: "u1",
      userTrackerId: "ut1",
      localDate: "2026-08-01",
      timezone: "UTC",
      valueNumeric: 3,
    });
    expect((writes[0]!.values as Record<string, unknown>).value_numeric).toBe(3);
  });
});

describe("buildUserTrackerWrites", () => {
  it("supports archive via archived_at", () => {
    const writes = buildUserTrackerWrites({
      trackerId: "t1",
      userId: "u1",
      archivedAt: "2026-08-01T00:00:00.000Z",
      enabled: false,
    });
    expect((writes[0]!.values as Record<string, unknown>).archived_at).toBeTruthy();
  });
});

describe("sortTrackerRecordsForReplay", () => {
  it("orders definition before event", () => {
    const records: OutboxRecord[] = [
      {
        idempotencyKey: "b",
        userId: "u1",
        entityType: "tracker_event",
        entityId: "e1",
        operationType: "upsert",
        payload: {
          kind: "tracker",
          entity: "tracker_event",
          writes: [],
        },
        status: "pending",
        retryCount: 0,
        createdAt: "2026-08-01T10:00:00.000Z",
        lastAttemptAt: null,
        lastError: null,
      },
      {
        idempotencyKey: "a",
        userId: "u1",
        entityType: "user_tracker",
        entityId: "t1",
        operationType: "upsert",
        payload: {
          kind: "tracker",
          entity: "user_tracker",
          writes: [],
        },
        status: "pending",
        retryCount: 0,
        createdAt: "2026-08-01T09:00:00.000Z",
        lastAttemptAt: null,
        lastError: null,
      },
    ];
    const sorted = sortTrackerRecordsForReplay(records);
    expect(sorted[0]!.entityType).toBe("user_tracker");
    expect(sorted[1]!.entityType).toBe("tracker_event");
  });
});

describe("trackerDependenciesMet", () => {
  it("defers child when parent entity not synced", () => {
    const record: OutboxRecord = {
      idempotencyKey: "k",
      userId: "u1",
      entityType: "tracker_event",
      entityId: "e1",
      operationType: "upsert",
      payload: {
        kind: "tracker",
        entity: "tracker_event",
        dependsOnEntityIds: ["t1"],
        writes: [],
      },
      status: "pending",
      retryCount: 0,
      createdAt: "2026-08-01T10:00:00.000Z",
      lastAttemptAt: null,
      lastError: null,
    };
    expect(trackerDependenciesMet(record, new Set(), new Set())).toBe(false);
    expect(trackerDependenciesMet(record, new Set(["t1"]), new Set())).toBe(true);
  });
});

describe("isTrackerConflict", () => {
  it("detects server-newer stale writes", () => {
    expect(
      isTrackerConflict("2026-08-02T00:00:00.000Z", "2026-08-01T00:00:00.000Z"),
    ).toBe(true);
    expect(
      isTrackerConflict("2026-08-01T00:00:00.000Z", "2026-08-02T00:00:00.000Z"),
    ).toBe(false);
  });
});
