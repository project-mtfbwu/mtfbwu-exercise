"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { ProgressMeter } from "@/shared/ui/flat-lay/progress-meter";
import {
  addHydrationEntryAction,
  deleteHydrationEntryAction,
  listHydrationEntriesAction,
} from "@/modules/hydration/actions";
import {
  formatHydrationAmount,
  hydrationProgress,
} from "@/modules/hydration/calculations";
import {
  HYDRATION_VESSEL_PRESETS,
  type HydrationDaySummary,
} from "@/modules/hydration/types";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildHydrationEntryDeleteWrites,
  buildHydrationEntryWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import type { OfflineRecordStatus } from "@/shared/offline/offline-record-status";
import { OfflineRecordStatusBadge } from "@/shared/ui/flat-lay/offline-record-status-badge";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

export type HydrationFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  dailyRecordId: string;
  hydrationDaySummary?: HydrationDaySummary;
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

export function HydrationFocus({
  titleId,
  userId,
  localDate,
  dailyRecordId,
  hydrationDaySummary,
  onSaved,
  onCancel,
}: HydrationFocusProps) {
  const [entries, setEntries] = useState(hydrationDaySummary?.recentEntries ?? []);
  const [totalMl, setTotalMl] = useState(hydrationDaySummary?.totalMl ?? 0);
  const [custom, setCustom] = useState("250");
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

  const target = hydrationDaySummary?.target ?? null;
  const progress = hydrationProgress({
    totalMl,
    entryCount: entries.length,
    target,
    recentEntries: entries,
  });

  const reload = useCallback(async () => {
    const list = await listHydrationEntriesAction(localDate);
    setEntries(list.slice(0, 5));
    setTotalMl(list.reduce((s, e) => s + e.amountMl, 0));
  }, [localDate]);

  useEffect(() => {
    startTransition(() => {
      void reload();
    });
  }, [reload, startTransition]);

  function addMl(amountMl: number, vesselLabel?: string) {
    setError(null);
    startTransition(async () => {
      if (!online) {
        const entryId = crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.hydrationEntry,
          entityId: entryId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.hydrationEntry,
            writes: buildHydrationEntryWrites({
              entryId,
              userId,
              localDate,
              dailyRecordId,
              amountMl,
              vesselLabel,
            }),
          },
          hydrationDraft: { entryId, payload: { amountMl, vesselLabel } },
        });
        setRecordStatus("queued");
        setTotalMl((v) => v + amountMl);
        onSaved(
          hydrationProgress({
            totalMl: totalMl + amountMl,
            entryCount: entries.length + 1,
            target,
            recentEntries: entries,
          }).label,
        );
        return;
      }
      const result = await addHydrationEntryAction({
        localDate,
        dailyRecordId,
        amountMl,
        vesselLabel,
      });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      setRecordStatus("synced");
      const newTotal = totalMl + amountMl;
      const newCount = entries.length + 1;
      setTotalMl(newTotal);
      await reload();
      onSaved(
        hydrationProgress({
          totalMl: newTotal,
          entryCount: newCount,
          target,
          recentEntries: entries,
        }).label,
      );
    });
  }

  function removeEntry(id: string) {
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.hydrationEntry,
          entityId: id,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.hydrationEntry,
            writes: buildHydrationEntryDeleteWrites({ entryId: id, userId }),
          },
        });
        const removed = entries.find((e) => e.id === id);
        if (removed) {
          setTotalMl((v) => Math.max(0, v - removed.amountMl));
          setEntries((prev) => prev.filter((e) => e.id !== id));
        }
        setRecordStatus("queued");
        return;
      }
      const result = await deleteHydrationEntryAction({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await reload();
    });
  }

  return (
    <FocusPanel
      title="Hydration"
      titleId={titleId}
      accent="cyan"
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            onClick={() => onSaved(progress.label)}
            loading={pending}
          >
            Done
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={pending}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <OfflineRecordStatusBadge status={badgeStatus} />
      {target && !target.confirmedByUser ? (
        <p className="mb-3 text-sm text-[var(--mt-ink-muted)]">
          Target not confirmed — log water freely. Set a target in settings when ready.
        </p>
      ) : null}
      <ProgressMeter
        label="Today"
        value={progress.totalMl / 1000}
        max={progress.targetMl ? progress.targetMl / 1000 : 2}
        unit="L"
        tone="cyan"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {HYDRATION_VESSEL_PRESETS.map((ml) => (
          <PixelButton
            key={ml}
            tone="cyan"
            onClick={() => addMl(ml, `${ml} ml`)}
            disabled={pending}
          >
            +{ml} ml
          </PixelButton>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block text-sm font-bold" htmlFor="hydration-custom">
          Custom (ml)
        </label>
        <input
          id="hydration-custom"
          className="w-28 border-2 border-[var(--mt-ink)] px-2 py-2"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <PixelButton
          tone="neutral"
          disabled={pending}
          onClick={() => {
            const n = Number(custom);
            if (!Number.isFinite(n) || n <= 0) {
              setError("Enter a valid amount.");
              return;
            }
            addMl(n, "Custom");
          }}
        >
          Add
        </PixelButton>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
      {entries.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2">
              <span>
                {formatHydrationAmount(e.amountMl)}
                {e.vesselLabel ? ` · ${e.vesselLabel}` : ""}
              </span>
              <PixelButton
                tone="neutral"
                onClick={() => removeEntry(e.id)}
                disabled={pending}
              >
                Remove
              </PixelButton>
            </li>
          ))}
        </ul>
      ) : null}
    </FocusPanel>
  );
}
