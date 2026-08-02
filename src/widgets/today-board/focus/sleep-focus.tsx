"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  deleteSleepSessionAction,
  listSleepSessionsAction,
  saveSleepSessionAction,
} from "@/modules/sleep/actions";
import {
  formatSleepDuration,
  sleepDateFromBedtime,
  sleepDurationSeconds,
} from "@/modules/sleep/calculations";
import type { SleepDaySummary, SleepSessionView } from "@/modules/sleep/types";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildSleepSessionDeleteWrites,
  buildSleepSessionWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import {
  localDateTimeToUtcIso,
  localTimeFromInstant,
  nextLocalDate,
} from "@/shared/utils/local-date";
import type { OfflineRecordStatus } from "@/shared/offline/offline-record-status";
import { OfflineRecordStatusBadge } from "@/shared/ui/flat-lay/offline-record-status-badge";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

export type SleepFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  timezone: string;
  sleepDaySummary?: SleepDaySummary;
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

function resolveWakeInstant(
  bedtimeAt: string,
  wakeTime: string,
  bedtimeLocalDate: string,
  sessionTimezone: string,
): string {
  let wakeAt = localDateTimeToUtcIso(bedtimeLocalDate, wakeTime, sessionTimezone);
  if (new Date(wakeAt) <= new Date(bedtimeAt)) {
    wakeAt = localDateTimeToUtcIso(
      nextLocalDate(bedtimeLocalDate),
      wakeTime,
      sessionTimezone,
    );
  }
  return wakeAt;
}

export function SleepFocus({
  titleId,
  userId,
  localDate,
  timezone,
  sleepDaySummary,
  onSaved,
  onCancel,
}: SleepFocusProps) {
  const existing = sleepDaySummary?.primarySession;
  const sessionTimezone = existing?.timezone ?? timezone;
  const sessionSleepDate = existing?.sleepDate ?? localDate;

  const [sessions, setSessions] = useState<SleepSessionView[]>(
    sleepDaySummary?.sessions ?? [],
  );
  const [bedtime, setBedtime] = useState(() =>
    existing ? localTimeFromInstant(existing.bedtimeAt, sessionTimezone) : "22:00",
  );
  const [wake, setWake] = useState(() =>
    existing ? localTimeFromInstant(existing.wakeAt, sessionTimezone) : "06:00",
  );
  const [nap, setNap] = useState(existing?.nap ?? false);
  const [error, setError] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<OfflineRecordStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";
  const syncing = useSyncStatusStore((s) => s.status) === "syncing";
  const failedCount = useSyncStatusStore((s) => s.failedCount);

  const badgeStatus: OfflineRecordStatus | null = syncing
    ? "syncing"
    : failedCount > 0 && recordStatus === "queued"
      ? "failed"
      : recordStatus;

  const reload = useCallback(async () => {
    const list = await listSleepSessionsAction(sessionSleepDate);
    setSessions(list);
    const primary = list.find((s) => !s.nap) ?? list[0] ?? null;
    if (primary) {
      setBedtime(localTimeFromInstant(primary.bedtimeAt, primary.timezone));
      setWake(localTimeFromInstant(primary.wakeAt, primary.timezone));
      setNap(primary.nap);
    }
  }, [sessionSleepDate]);

  useEffect(() => {
    startTransition(() => {
      void reload();
    });
  }, [reload, startTransition]);

  function removeSession(id: string) {
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.sleepSession,
          entityId: id,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.sleepSession,
            writes: buildSleepSessionDeleteWrites({ sessionId: id, userId }),
          },
        });
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setRecordStatus("queued");
        return;
      }
      const result = await deleteSleepSessionAction({ id });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      setRecordStatus("synced");
      await reload();
    });
  }

  function save() {
    setError(null);
    const bedtimeAt = localDateTimeToUtcIso(sessionSleepDate, bedtime, sessionTimezone);
    const wakeAt = resolveWakeInstant(bedtimeAt, wake, sessionSleepDate, sessionTimezone);
    const duration = sleepDurationSeconds(bedtimeAt, wakeAt);
    if (duration <= 0) {
      setError("Wake time must be after bedtime.");
      return;
    }
    const sleepDate = existing
      ? sessionSleepDate
      : sleepDateFromBedtime(bedtimeAt, sessionTimezone);

    startTransition(async () => {
      if (!online) {
        const sessionId = existing?.id ?? crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.sleepSession,
          entityId: sessionId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.sleepSession,
            writes: buildSleepSessionWrites({
              sessionId,
              userId,
              timezone: sessionTimezone,
              sleepDate,
              bedtimeAt,
              wakeAt,
              durationSeconds: duration,
              nap,
            }),
          },
          sleepDraft: {
            sessionId,
            payload: { bedtime, wake, nap, sleepDate, timezone: sessionTimezone },
          },
        });
        setRecordStatus("queued");
        onSaved(formatSleepDuration(duration));
        return;
      }
      const result = await saveSleepSessionAction({
        id: existing?.id,
        timezone: sessionTimezone,
        bedtimeAt,
        wakeAt,
        nap,
      });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      setRecordStatus("synced");
      onSaved(formatSleepDuration(duration));
    });
  }

  return (
    <FocusPanel
      title="Sleep"
      titleId={titleId}
      accent="blue"
      onClose={onCancel}
      footer={
        <>
          <PixelButton tone="primary" loading={pending} onClick={save}>
            Save
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={pending}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <OfflineRecordStatusBadge status={badgeStatus} />
      <p className="mb-3 text-xs text-[var(--mt-ink-muted)]">
        Sleep date uses the local calendar day of bedtime ({sessionSleepDate}) in{" "}
        {sessionTimezone}.
        {existing ? " Historical sessions keep their original timezone." : null}
      </p>
      {existing ? (
        <p className="mb-3 text-sm">
          Logged: {formatSleepDuration(existing.durationSeconds)}
        </p>
      ) : null}
      {sessions.length > 0 ? (
        <ul className="mb-4 space-y-1 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <span>
                {formatSleepDuration(s.durationSeconds)}
                {s.nap ? " · nap" : ""} · {localTimeFromInstant(s.bedtimeAt, s.timezone)}–
                {localTimeFromInstant(s.wakeAt, s.timezone)}
              </span>
              <PixelButton
                tone="neutral"
                disabled={pending}
                onClick={() => removeSession(s.id)}
              >
                Remove
              </PixelButton>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Bedtime
          <input
            type="time"
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          Wake
          <input
            type="time"
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={nap} onChange={(e) => setNap(e.target.checked)} />
        Nap (not main sleep)
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
    </FocusPanel>
  );
}
