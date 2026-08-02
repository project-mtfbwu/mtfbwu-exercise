"use client";

import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import { useOnlineStore } from "@/shared/offline/online-store";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { createBoardSyncCoordinator } from "@/shared/offline/sync-coordinator";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import { useMemo, useTransition } from "react";

export function SyncStatusBanner() {
  const status = useSyncStatusStore((s) => s.status);
  const pendingCount = useSyncStatusStore((s) => s.pendingCount);
  const failedCount = useSyncStatusStore((s) => s.failedCount);
  const cleanupWarnings = useSyncStatusStore((s) => s.cleanupWarnings);
  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";
  const [pending, startTransition] = useTransition();

  const coordinator = useMemo(
    () => createBoardSyncCoordinator(() => createSupabaseBrowserClient()),
    [],
  );

  const hasCleanupWarning = cleanupWarnings.length > 0;
  const showBanner =
    !online ||
    status !== "idle" ||
    pendingCount > 0 ||
    failedCount > 0 ||
    hasCleanupWarning;

  if (!showBanner) return null;

  const parts: string[] = [];
  if (!online) {
    parts.push(`Offline · ${pendingCount} queued`);
  } else if (status === "syncing") {
    parts.push("Syncing…");
  } else if (failedCount > 0) {
    parts.push(`${failedCount} sync failed`);
    if (pendingCount > 0) parts.push(`${pendingCount} remaining`);
  } else if (status === "error") {
    parts.push(`Sync failed · ${pendingCount} remaining`);
  } else if (pendingCount > 0) {
    parts.push(`${pendingCount} pending sync`);
  }

  if (hasCleanupWarning) {
    parts.push(`cleanup warning: ${cleanupWarnings[cleanupWarnings.length - 1]}`);
  }

  const label = parts.join(" · ");

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] px-3 py-2 text-sm font-bold text-[var(--mt-ink)]"
    >
      <span>{label}</span>
      {online && (pendingCount > 0 || failedCount > 0) ? (
        <PixelButton
          tone="primary"
          loading={pending}
          onClick={() => {
            startTransition(async () => {
              await coordinator.flush();
            });
          }}
        >
          Retry sync
        </PixelButton>
      ) : null}
    </div>
  );
}
