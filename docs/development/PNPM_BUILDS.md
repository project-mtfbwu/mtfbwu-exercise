# pnpm dependency build scripts

pnpm 10+ ignores dependency `postinstall` / build scripts by default (supply-chain protection).

## Decision (Increment 1)

**Allowlist only `esbuild`.**

| Package         | Decision                              | Reason                                                                                 |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `esbuild`       | **Allowed** (`onlyBuiltDependencies`) | Required by Vitest / Vite tooling to materialize its native binary on install          |
| `sharp`         | Ignored                               | Optional Next image optimizer native build — not required for Increment 1 verification |
| `unrs-resolver` | Ignored                               | Optional native resolver — Next/Vitest already succeed without its build script        |

Configured in both `package.json` → `pnpm` and `pnpm-workspace.yaml` (pnpm 10 reads the allowlist from these):

```yaml
onlyBuiltDependencies:
  - esbuild
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

After adding the allowlist on an existing checkout, run once:

```bash
pnpm rebuild esbuild
```

Subsequent `pnpm install` should not warn about ignored esbuild scripts.

Do **not** run `pnpm approve-builds --all`. Approve additional packages only when a failing install proves a specific trusted package needs its script.

## CI consistency

CI uses the same `package.json` allowlist via `pnpm install --frozen-lockfile`. No separate interactive approval step is required on GitHub Actions once this file is committed.

## If you still see “Ignored build scripts: esbuild”

1. Confirm `pnpm.onlyBuiltDependencies` includes `esbuild`.
2. Re-run `pnpm install` (or `pnpm rebuild esbuild`).
3. Do not broaden the allowlist without documenting why.
