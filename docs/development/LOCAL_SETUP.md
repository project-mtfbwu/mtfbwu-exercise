# Local setup

## Node

Pin **Node.js 24.18.0** (Active LTS “Krypton”, released 2026-06-23).

See `docs/development/NODE_VERSION.md` for why Node 24 LTS was chosen and how upgrades are performed.

```bash
nvm install
nvm use
node -v   # v24.18.0
```

Why not Node 26? It is **Current**, not Active LTS yet. Production work targets Active/Maintenance LTS only.

## pnpm

Pin **pnpm 11.17.0** (see `docs/development/PACKAGE_MANAGER.md`).

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm -v   # 11.17.0
```

If Corepack is blocked on Windows, use `npx pnpm@11.17.0` for commands, or install pnpm via an approved team method.

### Dependency build scripts

pnpm blocks dependency lifecycle scripts until allowlisted. This repo allowlists **only** `esbuild` via `allowBuilds` in `pnpm-workspace.yaml`. See `docs/development/PNPM_BUILDS.md`.

## Install & run

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Optional: Supabase local

See `docs/development/SUPABASE_LOCAL.md` and `supabase/README.md`.

## Windows note

Paths with spaces (e.g. `mtfbwu exercise`) work; quote paths in scripts when needed.
