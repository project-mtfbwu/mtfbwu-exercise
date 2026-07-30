export type ScanDedupeOptions = {
  /** Minimum time, in ms, before the same normalized code is accepted again. */
  cooldownMs: number;
  /** Injectable clock for tests. Defaults to `Date.now`. */
  now?: () => number;
};

export interface ScanDedupe {
  /**
   * Returns `true` if this normalized scan should be acted on (e.g. trigger
   * a product lookup), or `false` if it is a repeat scan within the cooldown
   * window, or the dedupe is currently locked.
   */
  accept(normalized: string): boolean;
  /** Suppresses all scans, e.g. while a lookup for a prior scan is in flight. */
  lock(): void;
  unlock(): void;
  readonly isLocked: boolean;
}

/**
 * Suppresses rapid repeat detections of the same barcode from a continuous
 * scan loop (the same physical code is typically detected many times per
 * second while the camera is pointed at it), and provides a simple lock to
 * pause scanning while a product lookup for the last accepted code is
 * in flight.
 */
export function createScanDedupe(options: ScanDedupeOptions): ScanDedupe {
  const { cooldownMs, now = () => Date.now() } = options;
  let lastValue: string | null = null;
  let lastAcceptedAt = -Infinity;
  let locked = false;

  return {
    get isLocked() {
      return locked;
    },
    accept(normalized: string): boolean {
      if (locked) return false;
      const timestamp = now();
      if (normalized === lastValue && timestamp - lastAcceptedAt < cooldownMs) {
        return false;
      }
      lastValue = normalized;
      lastAcceptedAt = timestamp;
      return true;
    },
    lock() {
      locked = true;
    },
    unlock() {
      locked = false;
    },
  };
}
