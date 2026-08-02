"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  createCustomTrackerAction,
  listUserTrackersAction,
  saveTrackerEventAction,
} from "@/modules/trackers/actions";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildTrackerEventWrites,
  buildUserTrackerWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import type { OfflineRecordStatus } from "@/shared/offline/offline-record-status";
import { OfflineRecordStatusBadge } from "@/shared/ui/flat-lay/offline-record-status-badge";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

export type CustomTrackerFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  timezone: string;
  customTrackerSummaries?: { id: string; displayName: string; eventCount: number }[];
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

export function CustomTrackerFocus({
  titleId,
  userId,
  localDate,
  timezone,
  customTrackerSummaries,
  onSaved,
  onCancel,
}: CustomTrackerFocusProps) {
  const [trackers, setTrackers] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [value, setValue] = useState("1");
  const [note, setNote] = useState("");
  const [newTrackerName, setNewTrackerName] = useState("");
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

  const load = useCallback(async () => {
    const all = await listUserTrackersAction();
    const custom = all.filter((t) => !t.trackerDefinitionId && t.enabled);
    setTrackers(custom.map((t) => ({ id: t.id, displayName: t.displayName })));
    if (custom[0]) setSelectedId(custom[0].id);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load, startTransition]);

  function save() {
    if (!selectedId) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setError("Enter a valid value.");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (!online) {
        const eventId = crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.trackerEvent,
          entityId: eventId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.trackerEvent,
            dependsOnEntityIds: [selectedId],
            writes: buildTrackerEventWrites({
              eventId,
              userId,
              userTrackerId: selectedId,
              localDate,
              timezone,
              valueNumeric: numeric,
              note: note || undefined,
            }),
          },
          trackerEventDraft: {
            eventId,
            payload: { userTrackerId: selectedId, valueNumeric: numeric, note },
          },
        });
        const count =
          (customTrackerSummaries?.find((t) => t.id === selectedId)?.eventCount ?? 0) + 1;
        const name = trackers.find((t) => t.id === selectedId)?.displayName ?? "Tracker";
        setRecordStatus("queued");
        onSaved(`${name} · ${count} logged`);
        return;
      }
      const result = await saveTrackerEventAction({
        userTrackerId: selectedId,
        localDate,
        timezone,
        valueNumeric: numeric,
        note: note || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      const count =
        (customTrackerSummaries?.find((t) => t.id === selectedId)?.eventCount ?? 0) + 1;
      const name = trackers.find((t) => t.id === selectedId)?.displayName ?? "Tracker";
      setRecordStatus("synced");
      onSaved(`${name} · ${count} logged`);
    });
  }

  function createTracker() {
    const name = newTrackerName.trim();
    if (!name) {
      setError("Enter a tracker name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (!online) {
        const trackerId = crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.userTracker,
          entityId: trackerId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.userTracker,
            writes: buildUserTrackerWrites({
              trackerId,
              userId,
              customName: name,
              enabled: true,
            }),
          },
        });
        setTrackers((prev) => [...prev, { id: trackerId, displayName: name }]);
        setSelectedId(trackerId);
        setNewTrackerName("");
        setRecordStatus("queued");
        onSaved(`Created ${name} (queued offline)`);
        return;
      }
      const result = await createCustomTrackerAction({ customName: name });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      setNewTrackerName("");
      setRecordStatus("synced");
      await load();
      if (result.id) setSelectedId(result.id);
    });
  }

  return (
    <FocusPanel
      title="Custom tracker"
      titleId={titleId}
      accent="orange"
      onClose={onCancel}
      footer={
        <>
          <PixelButton tone="primary" loading={pending} onClick={save}>
            Log event
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <OfflineRecordStatusBadge status={badgeStatus} />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block text-sm font-bold">
          New tracker
          <input
            className="mt-1 w-full min-w-[12rem] border-2 border-[var(--mt-ink)] px-2 py-2"
            value={newTrackerName}
            onChange={(e) => setNewTrackerName(e.target.value)}
          />
        </label>
        <PixelButton tone="neutral" disabled={pending} onClick={createTracker}>
          Create
        </PixelButton>
      </div>
      {trackers.length === 0 ? (
        <p className="text-sm">No custom trackers enabled. Create one above.</p>
      ) : (
        <>
          <label className="block text-sm font-bold">
            Tracker
            <select
              className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-bold">
            Value
            <input
              className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-bold">
            Note (optional)
            <input
              className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
    </FocusPanel>
  );
}
