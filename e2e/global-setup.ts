import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

export type E2EUser = {
  email: string;
  password: string;
  id?: string;
  displayName: string;
  onboardingCompleted: boolean;
};

export const E2E_FIXTURE_PATH = path.join(process.cwd(), "e2e", ".auth", "users.json");

export const E2E_USERS: Record<string, E2EUser> = {
  completed: {
    email: "e2e-completed@example.test",
    password: "E2eTestPass!234",
    displayName: "E2E Completed",
    onboardingCompleted: true,
  },
  onboarding: {
    email: "e2e-onboarding@example.test",
    password: "E2eTestPass!234",
    displayName: "E2E Onboarding",
    onboardingCompleted: false,
  },
  disposable: {
    email: "e2e-disposable@example.test",
    password: "E2eTestPass!234",
    displayName: "E2E Disposable",
    onboardingCompleted: true,
  },
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} for Playwright setup`);
  return value;
}

export function createServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function ensureE2EUser(user: E2EUser): Promise<E2EUser> {
  const admin = createServiceClient();
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.data.users.find(
    (u) => u.email?.toLowerCase() === user.email.toLowerCase(),
  );

  let userId = existing?.id;
  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.displayName },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "failed to create e2e user");
    }
    userId = created.data.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, {
      password: user.password,
      email_confirm: true,
    });
  }

  await admin.from("profiles").upsert({
    id: userId,
    display_name: user.displayName,
    onboarding_completed: user.onboardingCompleted,
    onboarding_step: user.onboardingCompleted ? 12 : 1,
    onboarding_version: user.onboardingCompleted ? 1 : 0,
  });

  if (user.onboardingCompleted) {
    await admin.rpc("ensure_user_board_defaults", { p_user_id: userId });
  }

  return { ...user, id: userId };
}

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(E2E_FIXTURE_PATH), { recursive: true });
  const saved: Record<string, E2EUser> = {};
  for (const [key, user] of Object.entries(E2E_USERS)) {
    saved[key] = await ensureE2EUser(user);
  }
  fs.writeFileSync(E2E_FIXTURE_PATH, JSON.stringify(saved, null, 2));
}
