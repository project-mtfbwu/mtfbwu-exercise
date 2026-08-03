#!/usr/bin/env node
/**
 * Restore a local dump into an isolated database name inside local Supabase.
 * Usage:
 *   node scripts/restore-local.mjs --target=local --confirm=local-restore --dump=tmp/backups/x.sql --db=mtfbwu_restore_drill
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const target = arg("target", "");
const confirm = arg("confirm", "");
const dump = arg("dump", "");
const dbName = arg("db", "mtfbwu_restore_drill");

if (target !== "local") {
  console.error("Refusing: --target must be 'local'");
  process.exit(1);
}
if (confirm !== "local-restore") {
  console.error("Refusing: pass --confirm=local-restore");
  process.exit(1);
}
if (!dump || !fs.existsSync(dump)) {
  console.error("Missing --dump path");
  process.exit(1);
}
if (dbName === "postgres") {
  console.error("Refusing unsafe overwrite of primary local postgres DB");
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

execSync(
  `docker exec ${dbContainer} psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`,
  { stdio: "inherit" },
);
execSync(
  `docker exec ${dbContainer} psql -U postgres -d postgres -c "CREATE DATABASE ${dbName};"`,
  { stdio: "inherit" },
);

const abs = path.resolve(dump);
console.log(`Restoring ${abs} into ${dbName}`);
// Local dumps may include non-superuser SET lines; continue past those and verify tables after.
execSync(`docker exec -i ${dbContainer} psql -U postgres -d ${dbName}`, {
  stdio: [fs.openSync(abs, "r"), "inherit", "inherit"],
});
const check = execSync(
  `docker exec ${dbContainer} psql -U postgres -d ${dbName} -tAc "select to_regclass('public.profiles')::text;"`,
  { encoding: "utf8" },
).trim();
if (!check || !check.includes("profiles")) {
  console.error(`Restore incomplete: public.profiles missing (got '${check}')`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, dbName, dump: abs }, null, 2));
