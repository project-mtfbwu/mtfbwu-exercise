import { describe, expect, it } from "vitest";
import {
  OFFLINE_RECORD_STATUS_LABEL,
  offlineRecordStatusTone,
  type OfflineRecordStatus,
} from "@/shared/offline/offline-record-status";

describe("offlineRecordStatusTone", () => {
  it("maps every Increment 9 status", () => {
    const statuses: OfflineRecordStatus[] = [
      "local_draft",
      "queued",
      "syncing",
      "synced",
      "failed",
      "cleanup_warning",
    ];
    for (const status of statuses) {
      expect(OFFLINE_RECORD_STATUS_LABEL[status].length).toBeGreaterThan(0);
      expect(offlineRecordStatusTone(status)).toBeTruthy();
    }
  });

  it("treats synced as ok and failed as danger", () => {
    expect(offlineRecordStatusTone("synced")).toBe("ok");
    expect(offlineRecordStatusTone("failed")).toBe("danger");
    expect(offlineRecordStatusTone("cleanup_warning")).toBe("danger");
  });
});
