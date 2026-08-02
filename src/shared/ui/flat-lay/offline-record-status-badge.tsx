"use client";

import {
  OFFLINE_RECORD_STATUS_LABEL,
  offlineRecordStatusTone,
  type OfflineRecordStatus,
} from "@/shared/offline/offline-record-status";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import { cn } from "@/shared/utils/cn";

export type OfflineRecordStatusBadgeProps = {
  status: OfflineRecordStatus | null;
  /** When true, also surface the latest cleanup warning from the sync store. */
  includeCleanupWarning?: boolean;
  className?: string;
};

const toneClass: Record<ReturnType<typeof offlineRecordStatusTone>, string> = {
  ok: "border-[var(--mt-neon-green)] bg-[var(--mt-paper)]",
  warn: "border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)]",
  danger: "border-[var(--mt-danger)] bg-[var(--mt-paper-warm)]",
  neutral: "border-[var(--mt-ink)] bg-[var(--mt-paper)]",
};

/**
 * Per-module offline persistence badge — distinguishes draft / queued / syncing /
 * synced / failed / cleanup warning so users never guess whether data was stored.
 */
export function OfflineRecordStatusBadge({
  status,
  includeCleanupWarning = true,
  className,
}: OfflineRecordStatusBadgeProps) {
  const cleanupWarnings = useSyncStatusStore((s) => s.cleanupWarnings);
  const latestCleanup =
    includeCleanupWarning && cleanupWarnings.length > 0
      ? cleanupWarnings[cleanupWarnings.length - 1]
      : null;

  if (!status && !latestCleanup) return null;

  const displayStatus: OfflineRecordStatus =
    latestCleanup && (!status || status === "synced")
      ? "cleanup_warning"
      : (status ?? "cleanup_warning");

  const label =
    displayStatus === "cleanup_warning" && latestCleanup
      ? `${OFFLINE_RECORD_STATUS_LABEL.cleanup_warning}: ${latestCleanup}`
      : OFFLINE_RECORD_STATUS_LABEL[displayStatus];

  return (
    <p
      role="status"
      className={cn(
        "mb-3 border-2 px-2 py-1 text-xs font-bold text-[var(--mt-ink)]",
        toneClass[offlineRecordStatusTone(displayStatus)],
        className,
      )}
    >
      {label}
    </p>
  );
}
