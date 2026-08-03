import { describe, expect, it, vi } from "vitest";
import {
  checkMemoryRateLimit,
  checkRateLimit,
  checkUpstashRateLimit,
  clearMemoryRateLimits,
  defaultFailureMode,
  rateLimitResponse,
  resolveRateLimitBackend,
} from "@/shared/security/rate-limit";
import {
  authRateLimitKey,
  hashRateLimitIdentity,
} from "@/shared/security/rate-limit-key";
import { safeInternalPath } from "@/shared/security/safe-redirect";
import { redactSensitive } from "@/shared/observability/redact";

describe("redactSensitive", () => {
  it("redacts password and token fields", () => {
    const out = redactSensitive({
      password: "secret",
      access_token: "abc",
      ok: true,
    }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.access_token).toBe("[REDACTED]");
    expect(out.ok).toBe(true);
  });
});

describe("rate-limit keys", () => {
  it("hashes email and never embeds raw email", () => {
    const key = authRateLimitKey("signin", "Person@Example.com");
    expect(key).not.toContain("person@example.com");
    expect(key).toContain(hashRateLimitIdentity("Person@Example.com"));
  });
});

describe("checkMemoryRateLimit", () => {
  it("blocks after limit and sets Retry-After", () => {
    clearMemoryRateLimits();
    const key = `test-${Date.now()}`;
    expect(checkMemoryRateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    expect(checkMemoryRateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true);
    const blocked = checkMemoryRateLimit({ key, limit: 2, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    const response = rateLimitResponse(blocked);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("Upstash adapter contract", () => {
  it("increments via mocked REST pipeline without network", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify([{ result: 1 }, { result: 1 }, { result: 60 }]),
        {
          status: 200,
        },
      );
    });
    const result = await checkUpstashRateLimit(
      { key: "k", limit: 5, windowMs: 60_000 },
      {
        url: "https://example.upstash.io",
        token: "test-token",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result.ok).toBe(true);
    expect(result.backend).toBe("upstash");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("fail-closes when upstash is selected but unconfigured", async () => {
    const result = await checkRateLimit(
      {
        key: "auth",
        limit: 1,
        windowMs: 60_000,
        onProviderFailure: "fail_closed",
      },
      {
        RATE_LIMIT_BACKEND: "upstash",
      },
    );
    expect(result.ok).toBe(false);
    expect(result.backend).toBe("upstash");
  });

  it("fail-opens to memory for read category when provider errors", async () => {
    clearMemoryRateLimits();
    const fetchImpl = vi.fn(async () => {
      throw new Error("timeout");
    });
    const result = await checkRateLimit(
      {
        key: `read-${Date.now()}`,
        limit: 10,
        windowMs: 60_000,
        onProviderFailure: defaultFailureMode("read"),
      },
      {
        RATE_LIMIT_BACKEND: "upstash",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
      },
      { upstashFetch: fetchImpl as unknown as typeof fetch },
    );
    expect(result.ok).toBe(true);
    expect(result.backend).toBe("memory");
  });

  it("reports backend status without credentials", () => {
    const status = resolveRateLimitBackend({
      RATE_LIMIT_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "secret",
    });
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("secret");
  });

  it("blocks silent memory use in production", async () => {
    const result = await checkRateLimit(
      { key: "prod", limit: 5, windowMs: 60_000 },
      {
        RATE_LIMIT_BACKEND: "memory",
        NEXT_PUBLIC_APP_ENV: "production",
      },
    );
    expect(result.ok).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("allows relative app paths", () => {
    expect(safeInternalPath("/today")).toBe("/today");
    expect(safeInternalPath("/settings?x=1")).toBe("/settings?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeInternalPath("//evil.com")).toBe("/today");
    expect(safeInternalPath("https://evil.com")).toBe("/today");
    expect(safeInternalPath("today")).toBe("/today");
  });
});
