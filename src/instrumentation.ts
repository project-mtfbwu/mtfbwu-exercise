/**
 * Next.js instrumentation — fail closed on missing production env.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { assertProductionEnv } = await import("@/shared/config/env.server");
  assertProductionEnv();
}
