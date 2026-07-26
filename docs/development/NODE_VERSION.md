# Node version pin

**Pinned exact version: Node.js `24.18.0` (Active LTS, codename Krypton).**

Selected on **2026-07-26** from the official distribution index:

- Source: [nodejs.org/dist/latest-v24.x/](https://nodejs.org/dist/latest-v24.x/) and [nodejs.org/dist/index.json](https://nodejs.org/dist/index.json)
- Release date: **2026-06-23**
- Status: Active LTS (`lts: "Krypton"`)

| Line | Status (2026-07-26)     |
| ---- | ----------------------- |
| 24.x | **Active LTS** (pinned) |
| 22.x | Maintenance LTS         |
| 26.x | Current — **not** used  |

## Why Node 24 LTS

- Production Next.js work targets **Active LTS**, not Current-only releases.
- Node 26 is Current until it enters LTS (~2026-10-28) — do not adopt it for this project yet.

## Where it is pinned

| Location                      | Value                       |
| ----------------------------- | --------------------------- |
| `.nvmrc`                      | `24.18.0`                   |
| `.node-version`               | `24.18.0`                   |
| `package.json` `engines.node` | `>=24.18.0 <25`             |
| GitHub Actions                | `node-version-file: .nvmrc` |
| `packageManager`              | `pnpm@11.17.0`              |
| `.npmrc`                      | `engine-strict=true`        |

`engines.node` allows later **24.x** patches on developer machines without silently jumping to Node 25/26. CI and local version managers use the exact `.nvmrc` patch.

## How upgrades happen

1. Check [nodejs.org/dist/latest-v24.x/](https://nodejs.org/dist/latest-v24.x/) for a newer **24.x** LTS patch (especially security releases).
2. Update `.nvmrc`, `.node-version`, and raise the `engines.node` lower bound together.
3. Refresh this document (version + release date).
4. Verify CI on the new patch before merging.

Do **not** move to Node 26 Current without an explicit project decision after it becomes Active LTS.
