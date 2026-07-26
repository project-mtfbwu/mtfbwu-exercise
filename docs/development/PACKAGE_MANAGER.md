# Package manager (pnpm)

**Pinned exact version: `pnpm@11.17.0`.**

Selected on **2026-07-26** from the official npm registry:

- Source: [registry.npmjs.org/pnpm/latest](https://registry.npmjs.org/pnpm/latest) → `11.17.0`
- Docs: [pnpm 11.0 release notes](https://pnpm.io/blog/releases/11.0), [Migrating v10 → v11](https://pnpm.io/migration), [`pnpm audit`](https://pnpm.io/cli/audit)

## Why pnpm 11

Increment 1 CI failed on `pnpm audit --prod` with pnpm **10.14.0** because that
release still called the retired npm registry audit endpoints.

pnpm 11’s audit client uses the supported bulk advisories endpoint:

`/-/npm/v1/security/advisories/bulk`

Official confirmation: [pnpm 11.0 — “pnpm audit uses the bulk advisories endpoint”](https://pnpm.io/blog/releases/11.0) and [`pnpm audit` docs](https://pnpm.io/cli/audit).

## Pins

| Location                              | Value                                         |
| ------------------------------------- | --------------------------------------------- |
| `package.json` `packageManager`       | `pnpm@11.17.0`                                |
| `package.json` `engines.pnpm`         | `>=11.17.0 <12`                               |
| GitHub Actions `pnpm/action-setup@v6` | reads `packageManager` (no duplicate version) |
| Docs / Corepack instructions          | `pnpm@11.17.0`                                |

## Relevant 10 → 11 behavior for this repo

| Topic               | Impact here                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lockfile            | Regenerated under pnpm 11; resolved versions unchanged for intentional deps                                                                                 |
| Build scripts       | `onlyBuiltDependencies` / `ignoredBuiltDependencies` → `allowBuilds` in `pnpm-workspace.yaml`                                                               |
| Config location     | Non-auth settings moved out of `.npmrc` / `package.json#pnpm` into `pnpm-workspace.yaml`                                                                    |
| `minimumReleaseAge` | v11 default is `1440` (1 day). **We set `minimumReleaseAge: 0`** to preserve Increment 1 install behavior until a deliberate supply-chain policy is adopted |
| Audit filters       | `auditConfig.ignoreCves` → `auditConfig.ignoreGhsas` (GHSA IDs). **This repo has no ignore list**                                                           |
| Frozen lockfile     | Still `pnpm install --frozen-lockfile` in CI                                                                                                                |
| Cache               | CI continues to use `actions/setup-node` `cache: pnpm`                                                                                                      |

## Production dependency security

See [`DEPENDENCY_SECURITY.md`](./DEPENDENCY_SECURITY.md) for PostCSS/Sharp advisories,
temporary `next>` overrides, and removal conditions.

## Production audit gate

```bash
pnpm run audit
```

This runs `scripts/run-prod-audit.mjs`, which:

1. Reads versions from `pnpm-lock.yaml`
2. `POST`s to `/-/npm/v1/security/advisories/bulk` (pnpm 11’s endpoint)
3. Gunzips the body when the registry omits `Content-Encoding`
4. Prints GHSA advisories and exits non-zero when any exist

### Why not bare `pnpm audit --prod` yet

Even on pnpm 11.17.0, Cloudflare sometimes returns a **gzip body without
`Content-Encoding`**. pnpm’s bundled undici then does `res.text()` → `JSON.parse`
and throws `ERR_PNPM_AUDIT_BAD_RESPONSE`. That is a transport bug (registry and/or
pnpm), not a clean advisory result.

We do **not** suppress exit codes, use `continue-on-error`, or treat a one-off
manual probe as success. The CI gate remains a real bulk-advisory audit of the
lockfile.

Revisit bare `pnpm audit --prod` when pnpm or the registry fixes naked-gzip
handling.

## How to upgrade pnpm later

1. Check [registry.npmjs.org/pnpm](https://registry.npmjs.org/pnpm) for the newest **11.x** patch (do not jump majors casually).
2. Update `package.json` `packageManager` and `engines.pnpm` together.
3. Run `corepack prepare pnpm@<version> --activate` (or `npx pnpm@<version>`).
4. Run `pnpm install` and review the lockfile diff for unexpected version drift.
5. Run `pnpm run audit` and the full verification suite.
6. Update this document’s pinned version.
7. Retry bare `pnpm audit --prod`; switch the CI step back if it returns a real advisory result.
