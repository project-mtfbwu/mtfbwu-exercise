import { hashRateLimitIdentity } from "@/shared/security/rate-limit-key";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
  backend: "memory" | "upstash" | "none";
};

export type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  /** fail_closed (default for auth/account) vs fail_open for low-risk reads */
  onProviderFailure?: "fail_closed" | "fail_open";
};

export type RateLimitCategory = "auth" | "account" | "expensive" | "read";

export function defaultFailureMode(
  category: RateLimitCategory,
): "fail_closed" | "fail_open" {
  if (category === "read") return "fail_open";
  return "fail_closed";
}

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

export function checkMemoryRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(input.key);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return {
      ok: true,
      remaining: input.limit - 1,
      retryAfterSec: Math.ceil(input.windowMs / 1000),
      limit: input.limit,
      backend: "memory",
    };
  }

  if (existing.count >= input.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      limit: input.limit,
      backend: "memory",
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, input.limit - existing.count),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    limit: input.limit,
    backend: "memory",
  };
}

export type UpstashConfig = {
  url: string;
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Upstash Redis REST sliding fixed-window via INCR + EXPIRE.
 * No SDK required — injectable fetch for CI without network.
 */
export async function checkUpstashRateLimit(
  input: RateLimitInput,
  config: UpstashConfig,
): Promise<RateLimitResult> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 1500;
  const windowSec = Math.max(1, Math.ceil(input.windowMs / 1000));
  const redisKey = `rl:${hashRateLimitIdentity(input.key)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const pipelineBody = [
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec), "NX"],
      ["TTL", redisKey],
    ];
    const response = await fetchImpl(`${config.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipelineBody),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`upstash_http_${response.status}`);
    }
    const payload = (await response.json()) as Array<{ result: number }>;
    const count = Number(payload[0]?.result ?? 0);
    const ttl = Number(payload[2]?.result ?? windowSec);
    if (count > input.limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec),
        limit: input.limit,
        backend: "upstash",
      };
    }
    return {
      ok: true,
      remaining: Math.max(0, input.limit - count),
      retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec),
      limit: input.limit,
      backend: "upstash",
    };
  } finally {
    clearTimeout(timer);
  }
}

export type RateLimitBackendStatus = {
  backend: "memory" | "upstash" | "none";
  configured: boolean;
  available: boolean;
  detail?: string;
};

export function resolveRateLimitBackend(
  env: NodeJS.Dict<string> = process.env,
): RateLimitBackendStatus {
  const backend = (env.RATE_LIMIT_BACKEND ?? "memory") as "memory" | "upstash" | "none";
  if (backend === "none") {
    return { backend, configured: true, available: true };
  }
  if (backend === "memory") {
    return { backend, configured: true, available: true };
  }
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return {
      backend: "upstash",
      configured: false,
      available: false,
      detail: "missing_credentials",
    };
  }
  return { backend: "upstash", configured: true, available: true };
}

export async function checkRateLimit(
  input: RateLimitInput,
  env: NodeJS.Dict<string> = process.env,
  options?: { upstashFetch?: typeof fetch },
): Promise<RateLimitResult> {
  const status = resolveRateLimitBackend(env);
  const failureMode = input.onProviderFailure ?? "fail_closed";

  if (status.backend === "none") {
    return {
      ok: true,
      remaining: input.limit,
      retryAfterSec: 0,
      limit: input.limit,
      backend: "none",
    };
  }

  if (status.backend === "memory") {
    if (
      env.NEXT_PUBLIC_APP_ENV === "production" &&
      env.RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION !== "true"
    ) {
      // Production multi-instance must not silently use memory.
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: 60,
        limit: input.limit,
        backend: "memory",
      };
    }
    return checkMemoryRateLimit(input);
  }

  // upstash
  if (!status.configured || !status.available) {
    if (failureMode === "fail_open") {
      return checkMemoryRateLimit(input);
    }
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: 60,
      limit: input.limit,
      backend: "upstash",
    };
  }

  try {
    return await checkUpstashRateLimit(input, {
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
      fetchImpl: options?.upstashFetch,
    });
  } catch {
    if (failureMode === "fail_open") {
      return checkMemoryRateLimit(input);
    }
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: 30,
      limit: input.limit,
      backend: "upstash",
    };
  }
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Try again shortly.",
      retryAfterSec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

/** Test helper. */
export function clearMemoryRateLimits(): void {
  memoryStore.clear();
}

export { hashRateLimitIdentity };
