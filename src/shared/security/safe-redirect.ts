/**
 * Safe internal redirect helper — blocks open redirects.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = "/today",
): string {
  if (!candidate) return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;
  return trimmed;
}
