#!/usr/bin/env node
/**
 * Verify restore drill row ownership + RLS presence.
 * Usage:
 *   node scripts/verify-restore.mjs --target=local --confirm=local-verify --db=mtfbwu_restore_drill --user=<uuid>
 */
import { execSync } from "node:child_process";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const target = arg("target", "");
const confirm = arg("confirm", "");
const dbName = arg("db", "mtfbwu_restore_drill");
const userId = arg("user", "");

if (target !== "local" || confirm !== "local-verify") {
  console.error("Refusing without --target=local --confirm=local-verify");
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

const sql = `
select 'profiles' as table_name, count(*)::int as n from public.profiles
union all select 'meal_logs', count(*)::int from public.meal_logs
union all select 'workout_sessions', count(*)::int from public.workout_sessions
union all select 'rehab_sessions', count(*)::int from public.rehab_sessions
union all select 'body_weight_entries', count(*)::int from public.body_weight_entries
union all select 'hydration_entries', count(*)::int from public.hydration_entries;
select count(*)::int as rls_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity;
${
  userId
    ? `select count(*)::int as owned_meals from public.meal_logs where user_id = '${userId}';`
    : "select 0 as owned_meals;"
}
`;

const out = execSync(
  `docker exec -i ${dbContainer} psql -U postgres -d ${dbName} -v ON_ERROR_STOP=1 -t -A -F ','`,
  { input: sql, encoding: "utf8" },
);
console.log(out);
console.log(
  JSON.stringify(
    {
      ok: true,
      dbName,
      note: "Local restore verification only — not a hosted production recovery drill.",
    },
    null,
    2,
  ),
);
