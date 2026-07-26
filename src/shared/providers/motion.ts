export type MotionPreference = "full" | "reduced" | "off";

export const MOTION_STORAGE_KEY = "mtfbwu.motionPreference";

export type MotionResolution = {
  preference: MotionPreference;
  source: "user" | "system" | "default";
};

export function isMotionPreference(value: unknown): value is MotionPreference {
  return value === "full" || value === "reduced" || value === "off";
}

/**
 * Resolve effective motion preference.
 * Explicit user override wins; otherwise system prefers-reduced-motion maps to "reduced".
 * Mapping note: architecture docs historically said `disabled`; production code uses `off`.
 */
export function resolveMotionPreference(options: {
  userOverride: MotionPreference | null;
  prefersReducedMotion: boolean;
}): MotionResolution {
  if (options.userOverride) {
    return { preference: options.userOverride, source: "user" };
  }
  if (options.prefersReducedMotion) {
    return { preference: "reduced", source: "system" };
  }
  return { preference: "full", source: "default" };
}

export function readStoredMotionPreference(
  storage: Pick<Storage, "getItem"> | null,
): MotionPreference | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(MOTION_STORAGE_KEY);
    return isMotionPreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredMotionPreference(
  storage: Pick<Storage, "setItem" | "removeItem"> | null,
  preference: MotionPreference | null,
): void {
  if (!storage) return;
  try {
    if (preference === null) {
      storage.removeItem(MOTION_STORAGE_KEY);
      return;
    }
    storage.setItem(MOTION_STORAGE_KEY, preference);
  } catch {
    // Ignore quota / private mode failures.
  }
}
