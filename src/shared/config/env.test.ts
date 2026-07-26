import { describe, expect, it } from "vitest";
import { envSchemas, getPublicEnv } from "@/shared/config/env";

const valid = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  USDA_FDC_API_KEY: "usda-key",
  OPEN_FOOD_FACTS_USER_AGENT: "MTFBWU/0.1.0 (test@example.com)",
};

describe("environment validation", () => {
  it("accepts valid public env", () => {
    const env = getPublicEnv(valid);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toContain("supabase.co");
  });

  it("rejects missing public keys", () => {
    expect(() =>
      getPublicEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      }),
    ).toThrow(/Invalid public environment/);
  });

  it("accepts full server schema values", () => {
    const parsed = envSchemas.serverEnvSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.USDA_FDC_API_KEY).toBe("usda-key");
      expect(parsed.data.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role");
    }
  });

  it("rejects incomplete server schema", () => {
    const parsed = envSchemas.serverEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: valid.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: valid.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: valid.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps server schema stricter than public", () => {
    const publicKeys = Object.keys(envSchemas.publicEnvSchema.shape);
    const serverKeys = Object.keys(envSchemas.serverEnvSchema.shape);
    expect(serverKeys).toEqual(
      expect.arrayContaining([
        ...publicKeys,
        "SUPABASE_SERVICE_ROLE_KEY",
        "USDA_FDC_API_KEY",
        "OPEN_FOOD_FACTS_USER_AGENT",
      ]),
    );
  });
});
