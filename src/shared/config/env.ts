import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

const appEnvSchema = z.enum(["local", "preview", "production"]).default("local");

/**
 * Browser-safe public env. Never put secrets here.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: appEnvSchema,
  NEXT_PUBLIC_BUILD_SHA: z.string().min(1).optional(),
  NEXT_PUBLIC_RELEASE_VERSION: z.string().min(1).optional().default("0.1.0-beta.1"),
});

const boolish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    return v === "true" || v === "1";
  });

/**
 * Server-only secrets schema (values validated via `env.server.ts` only).
 */
const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  USDA_FDC_API_KEY: z.string().min(1),
  OPEN_FOOD_FACTS_USER_AGENT: z
    .string()
    .min(1)
    .optional()
    .default("MTFBWU/0.1.0 (nutrition@local)"),
  ERROR_MONITORING_DSN: z.string().min(1).optional(),
  RATE_LIMIT_BACKEND: z.enum(["memory", "upstash", "none"]).optional().default("memory"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  RATE_LIMIT_ALLOW_MEMORY_IN_PRODUCTION: boolish,
  PRIVATE_BETA_MODE: boolish,
  PRIVATE_BETA_ALLOWLIST: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),
  FEATURE_BARCODE: boolish,
  FEATURE_OCR: boolish,
  FEATURE_PROGRESS_CAMERA: boolish,
  FEATURE_ACCOUNT_EXPORT: boolish,
  FEATURE_ACCOUNT_DELETION: boolish,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type AppEnvironment = z.infer<typeof appEnvSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/** Validate public env (safe for client and server). */
export function getPublicEnv(source: EnvSource = process.env): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: source.NEXT_PUBLIC_APP_ENV ?? "local",
    NEXT_PUBLIC_BUILD_SHA: source.NEXT_PUBLIC_BUILD_SHA,
    NEXT_PUBLIC_RELEASE_VERSION: source.NEXT_PUBLIC_RELEASE_VERSION,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables: ${formatZodError(parsed.error)}`,
    );
  }

  return parsed.data;
}

export const envSchemas = {
  publicEnvSchema,
  serverEnvSchema,
};
