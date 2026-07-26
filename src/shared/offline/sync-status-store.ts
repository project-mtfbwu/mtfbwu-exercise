import { create } from "zustand";

export type SyncUiStatus = "idle" | "syncing" | "error";

type SyncStatusState = {
  status: SyncUiStatus;
  pendingCount: number;
  setStatus: (status: SyncUiStatus) => void;
  setPendingCount: (count: number) => void;
};

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  status: "idle",
  pendingCount: 0,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
