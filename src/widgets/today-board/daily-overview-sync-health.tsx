"use client";

import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

/**
 * Surfaces failed sync / cleanup warnings on the Daily Overview board without
 * folding them into module activity or completion counts (no double-counting).
 */
export function DailyOverviewSyncHealth() {
  const failedCount = useSyncStatusStore((s) => s.failedCount);
  const cleanupWarnings = useSyncStatusStore((s) => s.cleanupWarnings);
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);

  if (failedCount === 0 && cleanupWarnings.length === 0 && pendingCount === 0) {
    return null;
  }

  const parts: string[] = [];
  if (pendingCount > 0)
    parts.push(`${pendingCount} queued (not double-counted in totals)`);
  if (failedCount > 0) parts.push(`${failedCount} sync failed`);
  if (cleanupWarnings.length > 0) {
    parts.push(`cleanup warning: ${cleanupWarnings[cleanupWarnings.length - 1]}`);
  }

  return (
    <div
      role="status"
      className="border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] px-3 py-2 text-sm font-bold text-[var(--mt-ink)]"
    >
      Daily overview sync: {parts.join(" · ")}
    </div>
  );
}
