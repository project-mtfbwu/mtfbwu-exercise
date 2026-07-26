import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/shared/database/types";
import { getPublicEnv } from "@/shared/config/env";

/** Browser Supabase client (anon key + user session cookies). */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
