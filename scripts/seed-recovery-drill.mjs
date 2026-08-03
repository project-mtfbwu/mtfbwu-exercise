#!/usr/bin/env node
/**
 * Seed synthetic drill data into local primary DB (not production).
 * Usage: node scripts/seed-recovery-drill.mjs --target=local --confirm=local-seed
 */
import { createClient } from "@supabase/supabase-js";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

if (arg("target", "") !== "local" || arg("confirm", "") !== "local-seed") {
  console.error("Refusing without --target=local --confirm=local-seed");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  console.error("Refusing non-local Supabase URL");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `recovery-drill-${Date.now()}@example.test`;
const created = await admin.auth.admin.createUser({
  email,
  password: "RecoveryDrillPass!234",
  email_confirm: true,
});
if (created.error || !created.data.user) {
  console.error(created.error?.message);
  process.exit(1);
}
const userId = created.data.user.id;
const today = new Date().toISOString().slice(0, 10);

await admin.from("profiles").upsert({
  id: userId,
  display_name: "Recovery Drill",
  onboarding_completed: true,
  onboarding_version: 1,
});
await admin.rpc("ensure_user_board_defaults", { p_user_id: userId });

const { data: daily } = await admin
  .from("daily_records")
  .upsert(
    { user_id: userId, local_date: today, timezone: "UTC" },
    { onConflict: "user_id,local_date" },
  )
  .select("id")
  .single();

await admin.from("meal_logs").insert({
  user_id: userId,
  daily_record_id: daily.id,
  meal_type: "lunch",
  label: "Drill meal",
  energy_kcal: 400,
  protein_g: 30,
  carbohydrate_g: 40,
  fat_g: 10,
  fiber_g: 5,
  consumed_at: new Date().toISOString(),
});
await admin.from("workout_sessions").insert({
  user_id: userId,
  daily_record_id: daily.id,
  title: "Drill workout",
  status: "completed",
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  snapshot_json: {},
});
await admin.from("body_weight_entries").insert({
  user_id: userId,
  local_date: today,
  recorded_at: new Date().toISOString(),
  weight_value: 72,
  weight_unit: "kg",
  source: "manual",
  timezone: "UTC",
});
await admin.from("hydration_entries").insert({
  user_id: userId,
  local_date: today,
  amount_ml: 500,
  recorded_at: new Date().toISOString(),
  source: "manual",
});

console.log(
  JSON.stringify({ ok: true, userId, email, dailyRecordId: daily.id }, null, 2),
);
