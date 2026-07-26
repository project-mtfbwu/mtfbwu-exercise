import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

/**
 * Browser-safe public env. Never put secrets here.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/**
 * Server-only secrets schema (values validated via `env.server.ts` only).
 */
const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  USDA_FDC_API_KEY: z.string().min(1),
  OPEN_FOOD_FACTS_USER_AGENT: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

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
