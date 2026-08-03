export type ErrorMonitor = {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (
    message: string,
    level?: "info" | "warning" | "error",
    context?: Record<string, unknown>,
  ) => void;
  setRelease: (release: string) => void;
  setEnvironment: (environment: string) => void;
};

class NoOpErrorMonitor implements ErrorMonitor {
  captureException(): void {}
  captureMessage(): void {}
  setRelease(): void {}
  setEnvironment(): void {}
}

let monitor: ErrorMonitor = new NoOpErrorMonitor();

/**
 * Replaceable error-monitoring boundary.
 * Configure ERROR_MONITORING_DSN later; until then this is a no-op.
 * Never attach meal contents, photos, rehab symptoms, or tokens.
 */
export function createErrorMonitor(): ErrorMonitor {
  const dsn = process.env.ERROR_MONITORING_DSN;
  if (!dsn) {
    monitor = new NoOpErrorMonitor();
    return monitor;
  }
  // Provider wiring reserved — keep no-op until a monitored release is approved.
  monitor = new NoOpErrorMonitor();
  monitor.setEnvironment(process.env.NEXT_PUBLIC_APP_ENV ?? "local");
  monitor.setRelease(
    process.env.NEXT_PUBLIC_RELEASE_VERSION ??
      process.env.NEXT_PUBLIC_BUILD_SHA ??
      "local",
  );
  return monitor;
}

export function getErrorMonitor(): ErrorMonitor {
  return monitor;
}
