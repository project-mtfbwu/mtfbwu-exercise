#!/usr/bin/env node
/**
 * Run EXPLAIN (ANALYZE, BUFFERS) for critical queries against local Supabase.
 * Usage: node scripts/explain-critical-queries.mjs --target=local --user=<uuid>
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

if (arg("target") !== "local") {
  console.error("Refusing: --target=local required");
  process.exit(1);
}

const userId = arg("user");
if (!/^[0-9a-f-]{36}$/i.test(userId)) {
  console.error("Pass --user=<uuid> from seed-recovery-drill output");
  process.exit(1);
}

const dbContainer =
  execSync('docker ps --format "{{.Names}}"')
    .toString()
    .split(/\r?\n/)
    .find((n) => n.startsWith("supabase_db_")) || "";
if (!dbContainer) {
  console.error("No supabase_db_* container");
  process.exit(1);
}

const queries = [
  [
    "calendar_month",
    `explain (analyze, buffers) select * from public.daily_records where user_id = '${userId}' and local_date >= current_date - 31 order by local_date desc;`,
  ],
  [
    "meal_history",
    `explain (analyze, buffers) select id, energy_kcal, consumed_at from public.meal_logs where user_id = '${userId}' and deleted_at is null order by consumed_at desc limit 50;`,
  ],
  [
    "workout_recent",
    `explain (analyze, buffers) select id, title, started_at from public.workout_sessions where user_id = '${userId}' order by started_at desc limit 50;`,
  ],
  [
    "rehab_recent",
    `explain (analyze, buffers) select id, title, started_at from public.rehab_sessions where user_id = '${userId}' and deleted_at is null order by started_at desc limit 50;`,
  ],
  [
    "progress_weights",
    `explain (analyze, buffers) select id, weight_value, recorded_at from public.body_weight_entries where user_id = '${userId}' and deleted_at is null order by recorded_at desc limit 50;`,
  ],
  [
    "tracker_summaries",
    `explain (analyze, buffers) select id, local_date, total_numeric from public.tracker_daily_summaries where user_id = '${userId}' order by local_date desc limit 50;`,
  ],
  [
    "active_progress_photos",
    `explain (analyze, buffers) select p.id, p.private_storage_path from public.progress_photo_sets s join public.progress_photos p on p.progress_photo_set_id = s.id where s.user_id = '${userId}' and s.deleted_at is null and p.deleted_at is null;`,
  ],
];

const outDir = "tmp/explain";
fs.mkdirSync(outDir, { recursive: true });
const results = {};

for (const [name, sql] of queries) {
  const out = execSync(
    `docker exec -i ${dbContainer} psql -U postgres -d postgres -v ON_ERROR_STOP=1`,
    { input: sql, encoding: "utf8" },
  );
  results[name] = out;
  fs.writeFileSync(`${outDir}/${name}.txt`, out);
  console.log(`=== ${name} ===`);
  console.log(out);
}

fs.writeFileSync(
  `${outDir}/summary.json`,
  JSON.stringify(
    {
      target: "local",
      userId,
      createdAt: new Date().toISOString(),
      note: "Local timings only — not production SLOs",
      files: Object.keys(results).map((k) => `${outDir}/${k}.txt`),
    },
    null,
    2,
  ),
);
