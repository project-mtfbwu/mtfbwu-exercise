import { create } from "zustand";

export type OnlineStatus = "online" | "offline" | "unknown";

type OnlineState = {
  status: OnlineStatus;
  setStatus: (status: OnlineStatus) => void;
};

export const useOnlineStore = create<OnlineState>((set) => ({
  status: "unknown",
  setStatus: (status) => set({ status }),
}));
