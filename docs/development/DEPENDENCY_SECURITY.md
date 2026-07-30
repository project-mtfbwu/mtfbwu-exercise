# Dependency security (production audit)

**Reviewed:** 2026-07-26  
**Checkpoint:** remote `d6dd022` / local Increment 1 foundation on `next@16.2.12`  
**Gate:** `pnpm run audit` (production graph; no ignored GHSAs)

## Original advisories

| Package   | Advisory                                                                 | Severity | Vulnerable range (reported) | First patched |
| --------- | ------------------------------------------------------------------------ | -------- | --------------------------- | ------------- |
| `postcss` | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | High     | `<= 8.5.11`                 | `8.5.12`      |
| `postcss` | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | High     | `<= 8.5.17`                 | `8.5.18`      |
| `postcss` | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | Medium   | `< 8.5.10`                  | `8.5.10`      |
| `sharp`   | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | High     | `< 0.35.0`                  | `0.35.0`      |

Minimum PostCSS that clears **all three** PostCSS advisories: **`>= 8.5.18`**.  
Minimum Sharp that clears the libvips advisory: **`>= 0.35.0`**.

## Vulnerable dependency paths (before remediation)

Verified with `pnpm why` / `pnpm list --depth 10` / `next/package.json`:

| Package   | Version  | Relation to Next                                            | Production?        |
| --------- | -------- | ----------------------------------------------------------- | ------------------ |
| `postcss` | `8.4.31` | **direct** dependency of `next@16.2.12`                     | Yes                |
| `sharp`   | `0.34.5` | **optional** dependency of `next@16.2.12` (image optimizer) | Yes when installed |
| `postcss` | `8.5.23` | via `@tailwindcss/postcss` / Vite / Vitest                  | Dev only           |

Only one production PostCSS copy (`8.4.31` via Next) and one Sharp copy (`0.34.5` via Next) were present. Sharp is optional and platform-specific; CI/`ubuntu-latest` and Windows installs both pulled the optional package under Increment 1 allowBuilds settings.

## Latest stable Next.js checked

| Item                                     | Result                         |
| ---------------------------------------- | ------------------------------ |
| Registry `next@latest` (2026-07-26)      | **`16.2.12`** (already pinned) |
| Stable line inspected                    | `16.2.8` … `16.2.12`           |
| Nested `postcss` on those stables        | still **`8.4.31`**             |
| Nested optional `sharp` on those stables | still **`^0.34.5`**            |
| Canary / preview                         | Not used (policy: stable only) |

Upstream status:

- Next merged sharp `0.35.3` work toward **16.3** ([PR #95507](https://github.com/vercel/next.js/pull/95507)); tracked for stable consumers in [issue #96064](https://github.com/vercel/next.js/issues/96064).
- No **stable** Next release yet advertises `postcss >= 8.5.18` or `sharp >= 0.35.0`.

**Decision:** do **not** upgrade Next (already on latest stable). Apply **temporary, Next-scoped pnpm overrides**.

## Selected remediation

Configured in `pnpm-workspace.yaml` (pnpm 11: overrides live here, not under `package.json#pnpm`):

```yaml
overrides:
  "next>postcss": "8.5.23"
  "next>sharp": "0.35.3"
```

| Override       | Exact version | Why this version                                                                                                        |
| -------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `next>postcss` | **`8.5.23`**  | Latest stable `8.5.x` (≥ `8.5.18`); clears all three GHSAs; already used in this repo’s **dev** graph via Tailwind/Vite |
| `next>sharp`   | **`0.35.3`**  | Latest stable patched `0.35.x` on npm; advisory floor is `0.35.0`; Next’s own bump PR targets `0.35.3`                  |

### Why overrides are safe enough for this repo

- **Narrow scope:** only edges from `next`, not a global force on every package.
- **PostCSS:** pure JS; Next uses it as a pinned CSS toolchain dep. Dev already ran `8.5.23` successfully.
- **Sharp:** Next’s image optimizer (`dist/server/image-optimizer.js`) uses current APIs (`concurrency`, constructor options `limitInputPixels` / `sequentialRead`, `timeout`, `rotate`, `resize`, `avif`/`webp`/`png`/`jpeg`, `toBuffer`). It does **not** call APIs removed in 0.35 (`failOnError`, `paletteBitDepth`, `format.jp2k`, etc.).
- **Node:** sharp `0.35` requires Node `>= 20.9.0`; this repo pins Node **24.18.0**.
- **Install scripts:** sharp `0.35+` **removed** the install script; prebuilt optional platform packages ship as normal optional deps. `allowBuilds.sharp` stays **`false`** (nothing to approve).
- **Not** added as a direct app dependency — Nest override replaces Next’s optional copy.

### Known upstream caveats (documented, not suppressed)

- Some Vercel/Turbopack + musl reports exist for sharp `0.35` with older canaries; this app’s CI uses **ubuntu-latest** + `next build` (webpack production build), not Turbopack deploy. Re-verify after any Next major/minor jump.
- Overrides are **temporary**.

## Compatibility checks performed

- `pnpm install` / `pnpm install --frozen-lockfile`
- `pnpm why postcss` / `pnpm why sharp` / `pnpm list postcss sharp --depth 10`
- Sharp runtime: version print + linked libvips version + in-memory PNG resize
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`
- `pnpm run audit` → **zero** production advisories

Smoke test: `src/shared/media/sharp-smoke.test.ts` (resolves sharp via Next’s package tree; does not hit `/_next/image` HTTP).

## Increment 5 dependencies (barcode + OCR)

| Package          | Version | License    | Install scripts                   | Notes                               |
| ---------------- | ------- | ---------- | --------------------------------- | ----------------------------------- |
| `@zxing/browser` | `0.2.1` | MIT        | none required                     | Dynamic import fallback for barcode |
| `tesseract.js`   | `7.0.0` | Apache-2.0 | `allowBuilds.tesseract.js: false` | Client OCR worker; English only     |

Native `BarcodeDetector` has no npm dependency. Neither package receives camera frames off-device. Re-run `pnpm run audit` after any version bump.

## Supply-chain controls (unchanged)

- Exact `packageManager`: `pnpm@11.17.0`
- Frozen lockfile in CI
- Production audit gate with **no** `ignoreGhsas`, `continue-on-error`, or severity downgrades
- `allowBuilds`: only `esbuild: true`; sharp/unrs-resolver remain denied

## Future removal condition

Remove the overrides when **all** of the following are true:

1. A **stable** Next.js release declares `postcss >= 8.5.18` (or otherwise ships a patched PostCSS).
2. That same stable release declares optional `sharp >= 0.35.0` (preferably current patched `0.35.x`).
3. After removing overrides: `pnpm install`, full verification suite, and `pnpm run audit` stay clean.
4. `pnpm why postcss` / `pnpm why sharp` show no vulnerable nested copies.

### Bot / upgrade guardrails

- Renovate/Dependabot **must not** delete or weaken these overrides without re-running the full audit + sharp smoke + production build.
- Any Next upgrade (even patch) must re-check nested PostCSS/Sharp metadata and re-run `pnpm run audit`.
- Prefer removing overrides over widening them once upstream is fixed.

## Sources

- [npm `next@latest`](https://registry.npmjs.org/next/latest) → `16.2.12`
- [npm `postcss@latest`](https://registry.npmjs.org/postcss/latest) → `8.5.23`
- [npm `sharp@latest`](https://registry.npmjs.org/sharp/latest) → `0.35.3`
- [sharp v0.35.0 release notes](https://github.com/lovell/sharp/releases/tag/v0.35.0)
- [Next PR #95507 — bump sharp@0.35.3](https://github.com/vercel/next.js/pull/95507)
- [Next issue #96064 — 16.2.x still nests vulnerable sharp](https://github.com/vercel/next.js/issues/96064)
- [pnpm overrides (workspace settings)](https://pnpm.io/settings#overrides)
- Related: [`PACKAGE_MANAGER.md`](./PACKAGE_MANAGER.md), [`PNPM_BUILDS.md`](./PNPM_BUILDS.md)
