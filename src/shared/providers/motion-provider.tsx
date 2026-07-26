"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  MOTION_STORAGE_KEY,
  readStoredMotionPreference,
  resolveMotionPreference,
  writeStoredMotionPreference,
  type MotionPreference,
  type MotionResolution,
} from "./motion";

type MotionContextValue = {
  /** Hydration-safe: false until client subscription is active. */
  ready: boolean;
  resolution: MotionResolution;
  setUserPreference: (preference: MotionPreference | null) => void;
};

const MotionContext = createContext<MotionContextValue | null>(null);

const SSR_RESOLUTION: MotionResolution = {
  preference: "full",
  source: "default",
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeMotionOverride(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("mtfbwu-motion-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("mtfbwu-motion-change", onStoreChange);
  };
}

function getMotionOverrideSnapshot() {
  return readStoredMotionPreference(window.localStorage);
}

function getMotionOverrideServerSnapshot(): MotionPreference | null {
  return null;
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const userOverride = useSyncExternalStore(
    subscribeMotionOverride,
    getMotionOverrideSnapshot,
    getMotionOverrideServerSnapshot,
  );

  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const setUserPreference = useCallback((preference: MotionPreference | null) => {
    writeStoredMotionPreference(window.localStorage, preference);
    window.dispatchEvent(new Event("mtfbwu-motion-change"));
  }, []);

  const resolution = useMemo(() => {
    if (!ready) {
      return SSR_RESOLUTION;
    }
    return resolveMotionPreference({ userOverride, prefersReducedMotion });
  }, [ready, userOverride, prefersReducedMotion]);

  const value = useMemo(
    () => ({ ready, resolution, setUserPreference }),
    [ready, resolution, setUserPreference],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionPreference(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    throw new Error("useMotionPreference must be used within MotionPreferenceProvider");
  }
  return ctx;
}

export { MOTION_STORAGE_KEY };
