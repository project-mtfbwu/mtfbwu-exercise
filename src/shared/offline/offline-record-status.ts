/** Visible offline persistence states for Increment 9 modules. */
export type OfflineRecordStatus =
  "local_draft" | "queued" | "syncing" | "synced" | "failed" | "cleanup_warning";

export const OFFLINE_RECORD_STATUS_LABEL: Record<OfflineRecordStatus, string> = {
  local_draft: "Local draft",
  queued: "Queued",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Sync failed",
  cleanup_warning: "Local cleanup warning",
};

export function offlineRecordStatusTone(
  status: OfflineRecordStatus,
): "neutral" | "warn" | "ok" | "danger" {
  switch (status) {
    case "synced":
      return "ok";
    case "syncing":
    case "queued":
    case "local_draft":
      return "warn";
    case "failed":
    case "cleanup_warning":
      return "danger";
    default:
      return "neutral";
  }
}
