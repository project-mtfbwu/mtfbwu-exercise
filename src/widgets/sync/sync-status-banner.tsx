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
  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";
  const [pending, startTransition] = useTransition();

  const coordinator = useMemo(
    () => createBoardSyncCoordinator(() => createSupabaseBrowserClient()),
    [],
  );

  if (online && status === "idle" && pendingCount === 0) {
    return null;
  }

  const label = !online
    ? `Offline · ${pendingCount} queued`
    : status === "syncing"
      ? "Syncing…"
      : status === "error"
        ? `Sync failed · ${pendingCount} remaining`
        : pendingCount > 0
          ? `${pendingCount} pending sync`
          : null;

  if (!label) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] px-3 py-2 text-sm font-bold text-[var(--mt-ink)]"
    >
      <span>{label}</span>
      {online && pendingCount > 0 ? (
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
