const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|cookie|service[_-]?role|api[_-]?key|dsn|refresh[_-]?token|access[_-]?token|ocr|clinician|symptom|photo[_-]?blob|raw[_-]?label/i;

const REDACTED = "[REDACTED]";

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 80)}…[truncated]`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactSensitive(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = redactSensitive(nested, depth + 1);
    }
  }
  return out;
}
