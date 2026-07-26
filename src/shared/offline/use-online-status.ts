"use client";

import { useEffect } from "react";
import { useOnlineStore } from "./online-store";

/** Subscribe to browser online/offline events. */
export function useOnlineStatus() {
  const status = useOnlineStore((s) => s.status);
  const setStatus = useOnlineStore((s) => s.setStatus);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sync = () => {
      setStatus(navigator.onLine ? "online" : "offline");
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [setStatus]);

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
  };
}
