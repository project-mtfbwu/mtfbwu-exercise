import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveBuildIdentifier } from "@/shared/config/app-identity";
import { resolveRateLimitBackend } from "@/shared/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Readiness — env present + lightweight DB reachability + limiter status. No secrets. */
export async function GET() {
  const missing: string[] = [];
  for (const key of [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        reason: "missing_env",
        missingCount: missing.length,
        buildSha: resolveBuildIdentifier(),
      },
      { status: 503 },
    );
  }

  let dbOk = false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.from("module_definitions").select("key").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const rateLimit = resolveRateLimitBackend(process.env);
  const rateLimitOk =
    rateLimit.backend === "none" ||
    rateLimit.backend === "memory" ||
    (rateLimit.backend === "upstash" && rateLimit.configured);

  if (!dbOk) {
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        reason: "database_unreachable",
        buildSha: resolveBuildIdentifier(),
        rateLimit: {
          backend: rateLimit.backend,
          configured: rateLimit.configured,
          available: rateLimit.available,
        },
      },
      { status: 503 },
    );
  }

  if (!rateLimitOk) {
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        reason: "rate_limit_misconfigured",
        buildSha: resolveBuildIdentifier(),
        rateLimit: {
          backend: rateLimit.backend,
          configured: rateLimit.configured,
          available: rateLimit.available,
        },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    ready: true,
    buildSha: resolveBuildIdentifier(),
    env: process.env.NEXT_PUBLIC_APP_ENV ?? "local",
    rateLimit: {
      backend: rateLimit.backend,
      configured: rateLimit.configured,
      available: rateLimit.available,
    },
  });
}
