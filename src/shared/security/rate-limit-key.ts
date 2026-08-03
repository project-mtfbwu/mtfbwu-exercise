import { createHash } from "node:crypto";

/** Privacy-safe rate-limit key material — never persist raw email or IP. */
export function hashRateLimitIdentity(raw: string): string {
  return createHash("sha256").update(raw.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function authRateLimitKey(
  action: "signin" | "signup" | "forgot",
  email: string,
): string {
  return `auth-${action}:${hashRateLimitIdentity(email)}`;
}

export function accountRateLimitKey(action: "export" | "delete", userId: string): string {
  return `account-${action}:${hashRateLimitIdentity(userId)}`;
}

export function ipRateLimitKey(route: string, ip: string): string {
  return `${route}:ip:${hashRateLimitIdentity(ip)}`;
}
