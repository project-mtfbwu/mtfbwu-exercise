import "server-only";

import { z } from "zod";
import { envSchemas, getPublicEnv, type PublicEnv } from "@/shared/config/env";

type EnvSource = Record<string, string | undefined>;

export type ServerEnv = PublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  USDA_FDC_API_KEY: string;
  OPEN_FOOD_FACTS_USER_AGENT: string;
  ERROR_MONITORING_DSN?: string;
  RATE_LIMIT_BACKEND: "memory" | "upstash" | "none";
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION?: boolean;
  PRIVATE_BETA_MODE?: boolean;
  PRIVATE_BETA_ALLOWLIST?: string;
  SUPPORT_EMAIL?: string;
  FEATURE_BARCODE?: boolean;
  FEATURE_OCR?: boolean;
  FEATURE_PROGRESS_CAMERA?: boolean;
  FEATURE_ACCOUNT_EXPORT?: boolean;
  FEATURE_ACCOUNT_DELETION?: boolean;
};

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Validate full server env. This module is server-only — bundling into the
 * client graph fails the build via the `server-only` package.
 */
export function getServerEnv(source: EnvSource = process.env): ServerEnv {
  const parsed = envSchemas.serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: source.NEXT_PUBLIC_APP_ENV ?? "local",
    NEXT_PUBLIC_BUILD_SHA: source.NEXT_PUBLIC_BUILD_SHA,
    NEXT_PUBLIC_RELEASE_VERSION: source.NEXT_PUBLIC_RELEASE_VERSION,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    USDA_FDC_API_KEY: source.USDA_FDC_API_KEY,
    OPEN_FOOD_FACTS_USER_AGENT: source.OPEN_FOOD_FACTS_USER_AGENT,
    ERROR_MONITORING_DSN: source.ERROR_MONITORING_DSN,
    RATE_LIMIT_BACKEND: source.RATE_LIMIT_BACKEND ?? "memory",
    UPSTASH_REDIS_REST_URL: source.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: source.UPSTASH_REDIS_REST_TOKEN,
    RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION: source.RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION,
    PRIVATE_BETA_MODE: source.PRIVATE_BETA_MODE,
    PRIVATE_BETA_ALLOWLIST: source.PRIVATE_BETA_ALLOWLIST,
    SUPPORT_EMAIL: source.SUPPORT_EMAIL,
    FEATURE_BARCODE: source.FEATURE_BARCODE,
    FEATURE_OCR: source.FEATURE_OCR,
    FEATURE_PROGRESS_CAMERA: source.FEATURE_PROGRESS_CAMERA,
    FEATURE_ACCOUNT_EXPORT: source.FEATURE_ACCOUNT_EXPORT,
    FEATURE_ACCOUNT_DELETION: source.FEATURE_ACCOUNT_DELETION,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${formatZodError(parsed.error)}`,
    );
  }

  return parsed.data as ServerEnv;
}

/**
 * Soft check used at boot in production to fail fast without leaking values.
 * Rejects localhost APP_URL when APP_ENV is production.
 */
export function assertProductionEnv(source: EnvSource = process.env): void {
  const appEnv = source.NEXT_PUBLIC_APP_ENV ?? "local";
  if (appEnv !== "production" && source.NODE_ENV !== "production") {
    return;
  }

  const env = getServerEnv(source);
  getPublicEnv(source);

  if (appEnv === "production") {
    const url = env.NEXT_PUBLIC_APP_URL.toLowerCase();
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      throw new Error(
        "Production environment must not use a localhost NEXT_PUBLIC_APP_URL",
      );
    }
    if (env.RATE_LIMIT_BACKEND === "upstash") {
      if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error(
          "Production RATE_LIMIT_BACKEND=upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
        );
      }
    }
    if (
      env.RATE_LIMIT_BACKEND === "memory" &&
      source.RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION !== "true"
    ) {
      throw new Error(
        "Production must use RATE_LIMIT_BACKEND=upstash (or explicitly set RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION=true for single-instance)",
      );
    }
  }
}
