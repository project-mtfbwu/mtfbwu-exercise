/**
 * Production audit gate for CI/local (`pnpm run audit`).
 *
 * Uses npm's bulk advisories endpoint — the same endpoint pnpm 11 documents
 * for `pnpm audit` (`/-/npm/v1/security/advisories/bulk`) — against versions
 * that appear in the production dependency graph (`pnpm list --prod`).
 *
 * Bare `pnpm audit --prod` currently throws ERR_PNPM_AUDIT_BAD_RESPONSE when
 * the registry returns gzip without Content-Encoding (bundled undici). This
 * runner gunzips when needed and exits non-zero when advisories exist.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "pnpm-lock.yaml");
const BULK_URL = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";

function runPnpm(args) {
  return spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
    cwd: root,
    encoding: "utf8",
    // Windows needs a shell to resolve pnpm.cmd from PATH reliably.
    shell: process.platform === "win32",
  });
}

function listProductionPackageNames() {
  const result = runPnpm(["list", "--prod", "--parseable", "--depth", "Infinity"]);

  if (result.status !== 0) {
    throw new Error(
      `pnpm list --prod failed:\n${result.stderr || result.stdout || result.error}`,
    );
  }

  /** @type {Set<string>} */
  const names = new Set();
  for (const line of (result.stdout || "").split(/\r?\n/)) {
    if (!line.includes(`${path.sep}node_modules${path.sep}`)) continue;
    const parts = line.split(`${path.sep}node_modules${path.sep}`);
    const name = parts[parts.length - 1];
    if (name && name !== "." && !name.startsWith(".")) {
      names.add(name.replace(/\\/g, "/"));
    }
  }
  return names;
}

function versionsFromLockfile(lockText, allowedNames) {
  /** @type {Record<string, Set<string>>} */
  const packages = {};

  for (const line of lockText.split(/\r?\n/)) {
    const match = line.match(/^  ((?:@[^/\s]+\/)?[^@/\s]+)@([^:(\s]+)/);
    if (!match) continue;
    const [, name, version] = match;
    if (!allowedNames.has(name)) continue;
    if (!packages[name]) packages[name] = new Set();
    packages[name].add(version);
  }

  /** @type {Record<string, string[]>} */
  const request = {};
  for (const [name, versions] of Object.entries(packages)) {
    request[name] = [...versions];
  }
  return request;
}

async function postBulk(requestBody) {
  const response = await fetch(BULK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const isGzip = buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  const text = (isGzip ? gunzipSync(buffer) : buffer).toString("utf8");

  if (!response.ok) {
    throw new Error(
      `Bulk advisory endpoint HTTP ${response.status}: ${text.slice(0, 300)}`,
    );
  }

  return JSON.parse(text);
}

function severityRank(severity) {
  switch (String(severity).toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "moderate":
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function dependencyPath(name) {
  const result = runPnpm(["why", name]);
  const out = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return out || "(path unavailable)";
}

async function main() {
  const prodNames = listProductionPackageNames();
  const lockText = readFileSync(lockPath, "utf8");
  const request = versionsFromLockfile(lockText, prodNames);
  const packageCount = Object.keys(request).length;

  console.log(
    `Auditing ${packageCount} production packages via npm bulk advisories (pnpm 11 endpoint)`,
  );
  console.log(`POST ${BULK_URL}`);

  const bulk = await postBulk(request);
  /** @type {Array<Record<string, string>>} */
  const findings = [];

  for (const [name, advisories] of Object.entries(bulk)) {
    if (!Array.isArray(advisories)) continue;
    for (const advisory of advisories) {
      const url = typeof advisory.url === "string" ? advisory.url : "";
      findings.push({
        name,
        title: advisory.title ?? "(no title)",
        severity: advisory.severity ?? "unknown",
        ghsa: url.match(/GHSA-[\w-]+/)?.[0] ?? "",
        url,
        vulnerable_versions: advisory.vulnerable_versions ?? "",
        patched_versions: advisory.patched_versions ?? "",
      });
    }
  }

  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  if (findings.length === 0) {
    console.log("No known vulnerabilities found in the production dependency graph.");
    return 0;
  }

  console.log(`Found ${findings.length} production advisory hit(s):\n`);
  for (const finding of findings) {
    console.log(
      [
        `${finding.severity.toUpperCase()} ${finding.name}`,
        `  title: ${finding.title}`,
        `  ghsa: ${finding.ghsa || "(none)"}`,
        `  vulnerable: ${finding.vulnerable_versions}`,
        `  patched: ${finding.patched_versions || "(see advisory)"}`,
        `  production: yes`,
        `  more: ${finding.url}`,
        `  path:\n${dependencyPath(finding.name)
          .split(/\r?\n/)
          .map((line) => `    ${line}`)
          .join("\n")}`,
      ].join("\n"),
    );
    console.log("");
  }

  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    process.exit(1);
  });
