# pnpm dependency build scripts

pnpm ignores dependency `postinstall` / build scripts by default (supply-chain protection).

## Decision (Increment 1)

**Allowlist only `esbuild`.**

| Package         | Decision                                  | Reason                                                                                                                                                                                       |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esbuild`       | **Allowed** (`allowBuilds.esbuild: true`) | Required by Vitest / Vite tooling to materialize its native binary on install                                                                                                                |
| `sharp`         | Denied (`false`)                          | `sharp@0.35+` has **no** install script; prebuilt optional platform packages install without a lifecycle approval. Keep denied unless a future sharp release reintroduces a required script. |
| `unrs-resolver` | Denied (`false`)                          | Optional native resolver — Next/Vitest already succeed without its build script                                                                                                              |

Nested `sharp` / `postcss` security overrides for Next are documented in [`DEPENDENCY_SECURITY.md`](./DEPENDENCY_SECURITY.md).

Configured in `pnpm-workspace.yaml` (pnpm 11; the old `onlyBuiltDependencies` / `ignoredBuiltDependencies` keys are gone):

```yaml
allowBuilds:
  esbuild: true
  sharp: false
  unrs-resolver: false
```

After changing the allowlist on an existing checkout, run once:

```bash
pnpm rebuild esbuild
```

Do **not** run `pnpm approve-builds --all`. Approve additional packages only when a failing install proves a specific trusted package needs its script.

## CI consistency

CI uses the same `pnpm-workspace.yaml` allowlist via `pnpm install --frozen-lockfile`. No separate interactive approval step is required on GitHub Actions once this file is committed.

## If you still see ignored build-script warnings

1. Confirm `allowBuilds.esbuild` is `true`.
2. Re-run `pnpm install` (or `pnpm rebuild esbuild`).
3. Do not broaden the allowlist without documenting why.
