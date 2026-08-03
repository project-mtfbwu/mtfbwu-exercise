import { redactSensitive } from "@/shared/observability/redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = {
  requestId?: string;
  route?: string;
  action?: string;
  environment?: string;
  /** Prefer hashed/omitted in production call sites. */
  userIdHash?: string;
  entityType?: string;
  operation?: string;
  durationMs?: number;
  result?: "ok" | "error" | "denied";
  errorCode?: string;
  [key: string]: unknown;
};

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...((redactSensitive(fields) as LogFields) ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
