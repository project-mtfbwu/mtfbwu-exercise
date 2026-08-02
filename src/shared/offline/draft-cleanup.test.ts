import { describe, expect, it, vi } from "vitest";
import {
  cleanupDraftsForOutboxRecord,
  draftIdCandidates,
  isBoardEntityWithoutDraft,
  isDefinitionEntityType,
  localDatesFromOutboxRecord,
  reconcileStaleDrafts,
  shouldSkipParentOnlyCleanup,
} from "@/shared/offline/draft-cleanup";
import type { MtfbwuDatabase, OutboxRecord } from "@/shared/offline/db";
import {
  buildHydrationEntryWrites,
  buildTrackerEventWrites,
  buildUserSupplementWrites,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import { BOARD_ENTITY } from "@/shared/offline/board-outbox";

function syncedRecord(
  overrides: Partial<OutboxRecord> & Pick<OutboxRecord, "entityType" | "entityId">,
): OutboxRecord {
  return {
    id: 1,
    idempotencyKey: "idem-1",
    userId: "user-1",
    operationType: "upsert",
    payload: {},
    status: "synced",
    retryCount: 0,
    createdAt: "2026-08-01T10:00:00.000Z",
    lastAttemptAt: "2026-08-01T10:01:00.000Z",
    lastError: null,
    ...overrides,
  };
}

function makeDraftTable(
  initial: Record<string, { id: string; updatedAt: string; userId?: string }>,
) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (id: string) => store.get(id) ?? undefined),
    delete: vi.fn(async (id: string) => {
      store.delete(id);
    }),
    toArray: vi.fn(async () => [...store.values()]),
    _store: store,
  };
}

function makeDailyOverviewCache(
  initial: { id: string; userId: string; localDate: string; updatedAt?: string }[],
) {
  let rows = [...initial];
  return {
    get: vi.fn(async (id: string) => rows.find((r) => r.id === id)),
    delete: vi.fn(async (id: string) => {
      rows = rows.filter((r) => r.id !== id);
    }),
    where: vi.fn((field: string) => ({
      equals: vi.fn((value: string) => ({
        toArray: async () =>
          rows.filter(
            (row) => String((row as unknown as Record<string, unknown>)[field]) === value,
          ),
        filter: (fn: (row: (typeof rows)[number]) => boolean) => ({
          toArray: async () =>
            rows.filter(
              (row) =>
                String((row as unknown as Record<string, unknown>)[field]) === value &&
                fn(row),
            ),
        }),
      })),
    })),
    toArray: vi.fn(async () => rows),
    _rows: () => rows,
  };
}

function mockDb(input: {
  hydrationDrafts?: Record<string, { id: string; updatedAt: string; userId?: string }>;
  sleepDrafts?: Record<string, { id: string; updatedAt: string; userId?: string }>;
  supplementIntakeDrafts?: Record<
    string,
    { id: string; updatedAt: string; userId?: string }
  >;
  userSupplementDrafts?: Record<
    string,
    { id: string; updatedAt: string; userId?: string }
  >;
  meditationDrafts?: Record<string, { id: string; updatedAt: string; userId?: string }>;
  trackerEventDrafts?: Record<string, { id: string; updatedAt: string; userId?: string }>;
  trackerTargetDrafts?: Record<
    string,
    { id: string; updatedAt: string; userId?: string }
  >;
  trackerReminderDrafts?: Record<
    string,
    { id: string; updatedAt: string; userId?: string }
  >;
  profilePreferenceDrafts?: Record<
    string,
    { id: string; updatedAt: string; userId?: string }
  >;
  dailyOverviewCache?: {
    id: string;
    userId: string;
    localDate: string;
    updatedAt?: string;
  }[];
  outbox?: OutboxRecord[];
  timer?: { id: string; userId: string; payload: unknown } | null;
}) {
  const hydrationDrafts = makeDraftTable(input.hydrationDrafts ?? {});
  const meditationDrafts = makeDraftTable(input.meditationDrafts ?? {});
  const sleepDrafts = makeDraftTable(input.sleepDrafts ?? {});
  const supplementIntakeDrafts = makeDraftTable(input.supplementIntakeDrafts ?? {});
  const userSupplementDrafts = makeDraftTable(input.userSupplementDrafts ?? {});
  const trackerEventDrafts = makeDraftTable(input.trackerEventDrafts ?? {});
  const trackerTargetDrafts = makeDraftTable(input.trackerTargetDrafts ?? {});
  const trackerReminderDrafts = makeDraftTable(input.trackerReminderDrafts ?? {});
  const profilePreferenceDrafts = makeDraftTable(input.profilePreferenceDrafts ?? {});
  const dailyOverviewCache = makeDailyOverviewCache(input.dailyOverviewCache ?? []);
  const meditationTimerState = {
    get: vi.fn(async (id: string) =>
      input.timer && input.timer.id === id ? input.timer : undefined,
    ),
    delete: vi.fn(async () => undefined),
    toArray: vi.fn(async () => (input.timer ? [input.timer] : [])),
  };
  const outboxRows = input.outbox ?? [];
  const outbox = {
    where: vi.fn((field: string) => ({
      equals: vi.fn((value: string) => ({
        toArray: async () =>
          outboxRows.filter(
            (row) => String((row as unknown as Record<string, unknown>)[field]) === value,
          ),
        filter: (fn: (row: OutboxRecord) => boolean) => ({
          toArray: async () =>
            outboxRows.filter(
              (row) =>
                String((row as unknown as Record<string, unknown>)[field]) === value &&
                fn(row),
            ),
        }),
      })),
    })),
    toArray: vi.fn(async () => outboxRows),
    filter: vi.fn((fn: (row: OutboxRecord) => boolean) => ({
      toArray: async () => outboxRows.filter(fn),
    })),
  };

  return {
    hydrationDrafts,
    meditationDrafts,
    sleepDrafts,
    supplementIntakeDrafts,
    userSupplementDrafts,
    trackerEventDrafts,
    trackerTargetDrafts,
    trackerReminderDrafts,
    profilePreferenceDrafts,
    dailyOverviewCache,
    meditationTimerState,
    outbox,
  } as unknown as MtfbwuDatabase;
}

describe("draftIdCandidates", () => {
  it("includes entityId and idempotencyKey", () => {
    expect(
      draftIdCandidates({
        entityId: "e1",
        idempotencyKey: "k1",
      } as OutboxRecord),
    ).toEqual(["e1", "k1"]);
  });
});

describe("shouldSkipParentOnlyCleanup", () => {
  it("always returns false (parent draft still cleaned by draftBindings)", () => {
    expect(shouldSkipParentOnlyCleanup(TRACKER_ENTITY.userTracker)).toBe(false);
    expect(shouldSkipParentOnlyCleanup(TRACKER_ENTITY.trackerEvent)).toBe(false);
  });
});

describe("isDefinitionEntityType", () => {
  it("recognizes definition entities that unblock children", () => {
    expect(isDefinitionEntityType(TRACKER_ENTITY.userTracker)).toBe(true);
    expect(isDefinitionEntityType(TRACKER_ENTITY.userSupplement)).toBe(true);
    expect(isDefinitionEntityType(TRACKER_ENTITY.trackerEvent)).toBe(false);
    expect(isDefinitionEntityType(TRACKER_ENTITY.supplementIntake)).toBe(false);
  });
});

describe("isBoardEntityWithoutDraft", () => {
  it("recognizes board entities without drafts", () => {
    expect(isBoardEntityWithoutDraft(BOARD_ENTITY.dailyModuleStatus)).toBe(true);
    expect(isBoardEntityWithoutDraft(TRACKER_ENTITY.hydrationEntry)).toBe(false);
  });
});

describe("localDatesFromOutboxRecord", () => {
  it("extracts local_date from tracker writes", () => {
    const record = syncedRecord({
      entityType: TRACKER_ENTITY.hydrationEntry,
      entityId: "e1",
      payload: {
        kind: "tracker",
        entity: TRACKER_ENTITY.hydrationEntry,
        writes: buildHydrationEntryWrites({
          entryId: "e1",
          userId: "user-1",
          localDate: "2026-08-01",
          dailyRecordId: "dr-1",
          amountMl: 250,
        }),
      },
    });
    expect(localDatesFromOutboxRecord(record)).toEqual(["2026-08-01"]);
  });

  it("returns empty for non-tracker payloads", () => {
    expect(
      localDatesFromOutboxRecord(
        syncedRecord({
          entityType: BOARD_ENTITY.dailyModuleStatus,
          entityId: "s1",
          payload: { kind: "board" },
        }),
      ),
    ).toEqual([]);
  });
});

describe("cleanupDraftsForOutboxRecord", () => {
  it("no-ops when outbox is not synced", async () => {
    const db = mockDb({
      hydrationDrafts: { e1: { id: "e1", updatedAt: "2026-08-01T09:00:00.000Z" } },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.hydrationEntry,
        entityId: "e1",
        status: "pending",
      }),
    );
    expect(result.cleaned).toEqual([]);
    expect(db.hydrationDrafts.delete).not.toHaveBeenCalled();
  });

  it("deletes stale hydration draft after synced outbox", async () => {
    const db = mockDb({
      hydrationDrafts: {
        e1: { id: "e1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.hydrationEntry,
        entityId: "e1",
      }),
    );
    expect(result.cleaned).toContain("e1");
    expect(db.hydrationDrafts.delete).toHaveBeenCalledWith("e1");
  });

  it("deletes stale sleep draft after synced outbox", async () => {
    const db = mockDb({
      sleepDrafts: {
        s1: { id: "s1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.sleepSession,
        entityId: "s1",
      }),
    );
    expect(result.cleaned).toContain("s1");
    expect(db.sleepDrafts.delete).toHaveBeenCalledWith("s1");
  });

  it("cleans userSupplement draft without deleting supplement intake draft", async () => {
    const db = mockDb({
      userSupplementDrafts: {
        us1: { id: "us1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
      supplementIntakeDrafts: {
        i1: { id: "i1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.userSupplement,
        entityId: "us1",
      }),
    );
    expect(result.cleaned).toContain("us1");
    expect(db.userSupplementDrafts.delete).toHaveBeenCalledWith("us1");
    expect(db.supplementIntakeDrafts.delete).not.toHaveBeenCalled();
  });

  it("cleans tracker target, reminder, and profile preference drafts", async () => {
    const db = mockDb({
      trackerTargetDrafts: {
        t1: { id: "t1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
      trackerReminderDrafts: {
        r1: { id: "r1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
      profilePreferenceDrafts: {
        "user-1": {
          id: "user-1",
          updatedAt: "2026-08-01T09:00:00.000Z",
          userId: "user-1",
        },
      },
    });

    const targetResult = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.trackerTarget,
        entityId: "t1",
      }),
    );
    expect(targetResult.cleaned).toContain("t1");

    const reminderResult = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.trackerReminder,
        entityId: "r1",
      }),
    );
    expect(reminderResult.cleaned).toContain("r1");

    const prefResult = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.profilePreference,
        entityId: "pref-1",
        userId: "user-1",
      }),
    );
    expect(prefResult.cleaned).toContain("user-1");
  });

  it("deletes stale meditation draft after synced outbox", async () => {
    const db = mockDb({
      meditationDrafts: {
        m1: { id: "m1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.meditationSession,
        entityId: "m1",
      }),
    );
    expect(result.cleaned).toContain("m1");
    expect(db.meditationDrafts.delete).toHaveBeenCalledWith("m1");
  });

  it("invalidates dailyOverviewCache for matching local_date", async () => {
    const db = mockDb({
      dailyOverviewCache: [
        {
          id: "cache:2026-08-01",
          userId: "user-1",
          localDate: "2026-08-01",
        },
        {
          id: "cache:2026-08-02",
          userId: "user-1",
          localDate: "2026-08-02",
        },
      ],
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.trackerEvent,
        entityId: "ev1",
        payload: {
          kind: "tracker",
          entity: TRACKER_ENTITY.trackerEvent,
          writes: buildTrackerEventWrites({
            eventId: "ev1",
            userId: "user-1",
            userTrackerId: "ut1",
            localDate: "2026-08-01",
            timezone: "UTC",
            valueNumeric: 1,
          }),
        },
      }),
    );
    expect(result.cleaned).toContain("cache:2026-08-01");
    expect(result.cleaned).not.toContain("cache:2026-08-02");
    expect(db.dailyOverviewCache.delete).toHaveBeenCalledWith("cache:2026-08-01");
  });

  it("invalidates all dailyOverviewCache rows for definition sync without local_date", async () => {
    const db = mockDb({
      dailyOverviewCache: [
        { id: "cache:a", userId: "user-1", localDate: "2026-08-01" },
        { id: "cache:b", userId: "user-1", localDate: "2026-08-02" },
        { id: "cache:c", userId: "user-2", localDate: "2026-08-01" },
      ],
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.userSupplement,
        entityId: "us1",
        payload: {
          kind: "tracker",
          entity: TRACKER_ENTITY.userSupplement,
          writes: buildUserSupplementWrites({
            supplementId: "us1",
            userId: "user-1",
            customName: "Vitamin D",
          }),
        },
      }),
    );
    expect(result.cleaned).toContain("cache:a");
    expect(result.cleaned).toContain("cache:b");
    expect(result.cleaned).not.toContain("cache:c");
  });

  it("keeps draft when updated after outbox createdAt", async () => {
    const db = mockDb({
      hydrationDrafts: { e1: { id: "e1", updatedAt: "2026-08-01T11:00:00.000Z" } },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.hydrationEntry,
        entityId: "e1",
      }),
    );
    expect(result.cleaned).toEqual([]);
    expect(db.hydrationDrafts.delete).not.toHaveBeenCalled();
  });

  it("clears meditation timer when session syncs", async () => {
    const db = mockDb({
      timer: {
        id: "meditation-timer:user-1",
        userId: "user-1",
        payload: { sessionId: "sess-1", phase: "completed_queued" },
      },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.meditationSession,
        entityId: "sess-1",
      }),
    );
    expect(result.cleaned).toContain("meditation-timer:user-1");
    expect(db.meditationTimerState.delete).toHaveBeenCalled();
  });

  it("cleans parent user_tracker draft without touching child event drafts", async () => {
    const db = mockDb({
      trackerEventDrafts: {
        ev1: { id: "ev1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
    });
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.userTracker,
        entityId: "ut-1",
      }),
    );
    expect(result.cleaned).toEqual([]);
    expect(db.trackerEventDrafts.delete).not.toHaveBeenCalled();
  });

  it("returns warning without throwing on delete error", async () => {
    const db = mockDb({
      hydrationDrafts: { e1: { id: "e1", updatedAt: "2026-08-01T09:00:00.000Z" } },
    });
    vi.mocked(db.hydrationDrafts.delete).mockRejectedValueOnce(new Error("db locked"));
    const result = await cleanupDraftsForOutboxRecord(
      db,
      syncedRecord({
        entityType: TRACKER_ENTITY.hydrationEntry,
        entityId: "e1",
      }),
    );
    expect(result.warning).toBe("db locked");
  });

  it("is idempotent when draft already removed", async () => {
    const db = mockDb({});
    const record = syncedRecord({
      entityType: TRACKER_ENTITY.hydrationEntry,
      entityId: "missing",
    });
    const first = await cleanupDraftsForOutboxRecord(db, record);
    const second = await cleanupDraftsForOutboxRecord(db, record);
    expect(first.cleaned).toEqual([]);
    expect(second.cleaned).toEqual([]);
  });
});

describe("reconcileStaleDrafts", () => {
  it("processes synced outbox rows", async () => {
    const db = mockDb({
      hydrationDrafts: {
        e1: { id: "e1", updatedAt: "2026-08-01T09:00:00.000Z", userId: "user-1" },
      },
      outbox: [
        syncedRecord({
          entityType: TRACKER_ENTITY.hydrationEntry,
          entityId: "e1",
        }),
      ],
    });
    const result = await reconcileStaleDrafts(db, "user-1");
    expect(result.removed).toBeGreaterThan(0);
  });
});
