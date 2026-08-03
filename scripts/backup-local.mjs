#!/usr/bin/env node
/**
 * Local backup drill — never targets production by default.
 * Usage:
 *   node scripts/backup-local.mjs --target=local --confirm=local-backup
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
const outDir = path.resolve(arg("out", "tmp/backups"));

if (target !== "local") {
  console.error("Refusing: --target must be explicitly 'local' (not production).");
  process.exit(1);
}
if (confirm !== "local-backup") {
  console.error("Refusing: pass --confirm=local-backup");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dumpPath = path.join(outDir, `mtfbwu-local-${stamp}.sql`);

const dbContainer =
  execSync('docker ps --format "{{.Names}}"')
    .toString()
    .split(/\r?\n/)
    .find((n) => n.startsWith("supabase_db_")) || "";

if (!dbContainer) {
  console.error("No supabase_db_* container running. Start local Supabase first.");
  process.exit(1);
}

console.log(`Backing up ${dbContainer} -> ${dumpPath}`);
execSync(
  `docker exec ${dbContainer} pg_dump -U postgres -d postgres --schema=public --no-owner --no-acl`,
  { stdio: ["ignore", fs.openSync(dumpPath, "w"), "inherit"] },
);

const meta = {
  target: "local",
  createdAt: new Date().toISOString(),
  dumpPath,
  dbContainer,
  note: "Local drill only. Hosted Supabase PITR/backup remains operator-owned.",
};
fs.writeFileSync(
  path.join(outDir, `mtfbwu-local-${stamp}.meta.json`),
  JSON.stringify(meta, null, 2),
);
console.log(JSON.stringify(meta, null, 2));
