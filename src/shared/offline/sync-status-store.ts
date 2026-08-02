import { create } from "zustand";

export type SyncUiStatus = "idle" | "syncing" | "error";

type SyncStatusState = {
  status: SyncUiStatus;
  pendingCount: number;
  failedCount: number;
  cleanupWarnings: string[];
  setStatus: (status: SyncUiStatus) => void;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  addCleanupWarning: (warning: string) => void;
  clearCleanupWarnings: () => void;
};

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  status: "idle",
  pendingCount: 0,
  failedCount: 0,
  cleanupWarnings: [],
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setFailedCount: (failedCount) => set({ failedCount }),
  addCleanupWarning: (warning) =>
    set((state) => ({
      cleanupWarnings: state.cleanupWarnings.includes(warning)
        ? state.cleanupWarnings
        : [...state.cleanupWarnings, warning],
    })),
  clearCleanupWarnings: () => set({ cleanupWarnings: [] }),
}));
