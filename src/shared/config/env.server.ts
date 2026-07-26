import "server-only";

import { z } from "zod";
import { envSchemas, getPublicEnv, type PublicEnv } from "@/shared/config/env";

type EnvSource = Record<string, string | undefined>;

export type ServerEnv = PublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
  USDA_FDC_API_KEY: string;
  OPEN_FOOD_FACTS_USER_AGENT: string;
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
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    USDA_FDC_API_KEY: source.USDA_FDC_API_KEY,
    OPEN_FOOD_FACTS_USER_AGENT: source.OPEN_FOOD_FACTS_USER_AGENT,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${formatZodError(parsed.error)}`,
    );
  }

  return parsed.data;
}

/** Soft check used at boot in production to fail fast without leaking values. */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  getServerEnv();
  getPublicEnv();
}
