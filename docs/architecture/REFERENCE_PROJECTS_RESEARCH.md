# REFERENCE_PROJECTS_RESEARCH.md

Research performed **2026-07-26**. Star counts are recorded for context only — **not** quality proof.

For each reference: architecture, working logic, schemas, tested patterns, maintenance, license, safe reuse, study-only, unsuitable complexity.

---

## 1. Snouzy/workout-cool

| Field | Value |
| --- | --- |
| Inspected | branch `main`, commit `77f25a922b51be7d96bd051c5d2096959f0d61a8` (2026-04-11) |
| Repo | https://github.com/Snouzy/workout-cool |
| License | **MIT** (GitHub license metadata + README) |
| Stack | Next.js App Router, TypeScript, Prisma, PostgreSQL, Feature-Sliced Design, Better Auth (per README) |
| Maintenance | Active enough for product use; last inspected commit was ad-config related. **Uncertain:** long-term roadmap beyond public commits. Stars ~8k — ignore as quality metric. |

### Architecture

FSD-ish layout (`shared` → `entities` → `features` → `widgets` → `app`) described in `README.md`. Prisma schema at `prisma/schema.prisma`.

### Relevant working logic

- **Programs (templates)** vs **WorkoutSession (performed)**: `Program` / `ProgramWeek` / `ProgramSession` / `ProgramSessionExercise` / `ProgramSuggestedSet` vs `WorkoutSession` / `WorkoutSessionExercise` / `WorkoutSet`.
- `UserSessionProgress.workoutSessionId` links enrollment progress to an actual session — clear template≠performance join.
- Exercise attributes via EAV-like `ExerciseAttribute*` + enums for muscles/equipment.
- Sets encode typed values (`WorkoutSetType`: TIME, WEIGHT, REPS, …) with parallel arrays — flexible but easy to misuse.

### Useful schemas (study + MIT-safe inspiration)

Cited file: `prisma/schema.prisma` @ `77f25a9…`

- Separate program tree from session tree
- Suggested sets on programs vs completed sets on sessions
- Muscle/equipment enums as controlled vocabularies

### Tested patterns

Docker/`make dev`, Prisma migrate, CSV exercise import scripts (README). CI depth **not fully audited** in this pass (**uncertain**).

### Safe reuse

- Ideas and MIT-licensed patterns; dependency stack choices.
- Do not wholesale fork UI; MTFBWU visual direction differs.

### Study-only / unsuitable

- Billing/RevenueCat/subscription complexity — defer.
- Multilingual slug explosion on programs — unsuitable early.
- Ad/rewarded video integration in layout — irrelevant.

---

## 2. wger-project/wger

| Field | Value |
| --- | --- |
| Inspected | branch `master`, commit `88f0a63a6b4d25eec2be575782038e3e88fc792e` (2026-07-24) |
| Repo | https://github.com/wger-project/wger |
| License | **AGPL-3.0-or-later** (README); exercise/ingredient *data* may be CC per README note |
| Stack | Django modular apps: `manager`, `exercises`, `nutrition`, `weight`, `measurements`, `gallery`, `gym`, … |
| Maintenance | Long-lived, actively pushed; large issue count. Mature self-host product. |

### Architecture

Classic Django domain apps + REST API + Flutter clients (README). Workout manager models under `wger/manager/models/`.

### Relevant working logic

- **Routine** (plan) vs **WorkoutSession** (performed day) vs **WorkoutLog** (per-set logs) — see `session.py`, `log.py`, `routine.py`, `slot.py`, `slot_entry.py`.
- **Slot** holds multiple **SlotEntry** exercises → natural place for supersets/circuits (conceptual).
- `ExerciseType` in `slot_entry.py` includes `NORMAL`, `WARMUP`, `DROPSET`, `MYO`, `PARTIAL`, `FORCED`, `TUT`, `ISO_HOLD`, `JUMP`.
- Nutrition `Source` enum (`sources.py`): `WGER`, `OPEN_FOOD_FACTS`, `USDA` — mirrors our multi-source need.
- Gallery app for progress photos; measurements app for custom metrics.

### Useful schemas

Conceptual only under AGPL:

- Routine → Day → Slot → SlotEntry → configs
- Session tied to routine/day + impression + time range (`session.py`)
- Ingredient/meal/plan/log nutrition graph (`wger/nutrition/models/`)

### Safe reuse

- **None of the application source code** may be copied into MTFBWU.
- Public API behavior and *ideas* may inform design.
- Ingredient/exercise **data** only if individual entry licenses allow — verify per dataset before import (**uncertain** without per-entry audit).

### Study-only

Entire codebase is study-only for implementation.

### Unsuitable complexity

- SlotEntry progression calculators, custom Python `class_name` plugins, gym multi-user admin — too heavy for early MTFBWU.
- Full Product Opener–scale nutrition mirroring inside Django — we will call OFF/USDA ourselves.

---

## 3. yuhonas/free-exercise-db

| Field | Value |
| --- | --- |
| Inspected | branch `main`, commit `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49` (2026-05-24) |
| Repo | https://github.com/yuhonas/free-exercise-db |
| License | **Unlicense** (public domain dedication) |
| Maintenance | Modest; schema + site tests via CI badge in README |

### Architecture

One JSON file per exercise + `schema.json` + `dist/exercises.json` + Vue browse site.

### Schema (cite `schema.json`)

Fields: `id`, `name`, `force`, `level`, `mechanic`, `equipment`, `primaryMuscles`, `secondaryMuscles`, `instructions`, `category`, `images`. Controlled enums for muscles/equipment/categories.

### Safe reuse

**Yes** — dataset + schema as catalog seed, with attribution courtesy. Validate incomplete nullables noted in README TODO.

### Unsuitable

Vue frontend — not needed. Some duplicate images (README). Not a session logger.

---

## 4. wrkout/exercises.json

| Field | Value |
| --- | --- |
| Inspected | branch `master`, commit `5994bea047eee4d39a2c0872be3dd8fdd258ba31` (2025-02-16) |
| Repo | https://github.com/wrkout/exercises.json |
| License | **Unlicense** |
| Maintenance | Quieter than free-exercise-db; README points commercial wrkout.xyz for larger paid dataset |

### Architecture

Per-exercise folders with `exercise.json`; build scripts to combined JSON/SQL.

### Safe reuse

Public domain dataset OK; prefer `free-exercise-db` restructuring unless we need original layout. **Do not** assume commercial wrkout.xyz assets are free.

### Note

Ancestor of free-exercise-db (acknowledged in free-exercise-db README).

---

## 5. Dexie/Dexie.js (org: dexie)

| Field | Value |
| --- | --- |
| Inspected | branch `master`, commit `962052f7b4e15493a3a76644482d5e1ae1fd4677` (2026-06-16) |
| Repo | https://github.com/dexie/Dexie.js |
| License | **Apache-2.0** (`LICENSE`) |
| Docs | https://dexie.org/docs/Tutorial/Design |

### Architecture / patterns

Versioned `stores()`, transactions, upgrade hooks, populate event, CRUD hooks for sync addons.

### Safe reuse

**Yes** — primary offline DB dependency candidate.

### Unsuitable

Building a custom sync engine via hooks without tests; Dexie Cloud (if considered later) is a separate product decision (**not researched in depth here** — **uncertain** fit).

---

## 6. zxing-js/browser

| Field | Value |
| --- | --- |
| Inspected | branch `master`, commit `9ad027d88d4533bd6d29f9d8d7e517e23cd361ff` (2026-07-06) |
| Repo | https://github.com/zxing-js/browser |
| License | **MIT** |
| Peer | `@zxing/library` |

### Working logic

`BrowserMultiFormatReader` / `BrowserQRCodeReader`: decode from video device, image, canvas. Continuous scan with `controls.stop()`.

### Safe reuse

**Yes** for in-browser barcode scanning (grocery barcodes are typically 1D — use multi-format reader).

### Caveats

Camera permission UX; torch support device-dependent; 55 open issues — verify on target mobile browsers during implementation (**uncertain** reliability matrix).

---

## 7. openfoodfacts/openfoodfacts-server

| Field | Value |
| --- | --- |
| Inspected | branch `main`, commit `69753d5dbac2c7c9187e9bd36ad7d2624b659680` (2026-07-25) |
| Repo | https://github.com/openfoodfacts/openfoodfacts-server |
| License | **AGPL-3.0** (application); data ODbL / DbCL / image CC-BY-SA per API docs |
| API docs | https://openfoodfacts.github.io/openfoodfacts-server/api/ |

### Architecture

Perl Product Opener monolith — unsuitable to embed.

### Working logic for us

- Prefer **API v3** product read by barcode; structured search still on v2.
- Rate limits + User-Agent requirements.
- Staging vs production.
- Bulk: CSV/JSONL exports if high volume; optional self-host (AGPL) — **we will not vendor server code**.

### Safe reuse

HTTP API + published data dumps under their licenses; SDKs if license-compatible. **No** copying server source.

---

## Official documentation (APIs & platform)

### USDA FoodData Central API

- Guide: https://fdc.nal.usda.gov/api-guide/
- Endpoints: `/food/{fdcId}`, `/foods`, `/foods/list`, `/foods/search`
- Key via data.gov; **never publish key**
- Rate limit default 1000/hour/IP; 429 on exceed
- License: CC0 / public domain; cite FDC
- **MTFBWU rule:** server-side only + cache into `food_items`

### Open Food Facts Product API

- Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
- v3 recommended; barcode product GET; cache aggressively
- Fill API usage form; custom User-Agent

### Supabase Auth, Postgres, Storage, RLS

- RLS must be on for exposed schemas; anon denied until policies exist
- Storage access-control via `storage.objects` policies + helpers (`foldername`, etc.)
- Docs consulted: RLS guide, Storage access-control / schema design pages

### Next.js App Router & PWA

- Installation / App Router: https://nextjs.org/docs/app/getting-started/installation
- PWA: https://nextjs.org/docs/app/guides/progressive-web-apps (manifest; Serwist suggested for SW)
- **Not initialized yet** per project phase

---

## Cross-cutting findings for MTFBWU

| Concern | Takeaway |
| --- | --- |
| Templates vs sessions | Dual trees (workout-cool MIT + wger AGPL concepts) |
| Taxonomy | free-exercise-db schema is the best permissive seed |
| Supersets / drop sets | Group ids + protocol enums; study wger Slot/ExerciseType; avoid progression engine |
| Offline | Dexie outbox |
| Barcode | zxing browser local decode → OFF/USDA resolve |
| Nutrition sources | Explicit source enum (as wger `Source`); normalize + priority ADR |
| OFF caching | Required by rate limits |
| USDA | Server-side |
| Photos | Private Storage + RLS; wger gallery is study-only |
| AI import | Our pipeline; not present as reusable OSS here |
| License risk | **AGPL: wger + OFF server = no code copy** |

---

## Uncertain findings (explicit)

1. Whether any wger *exercise/ingredient rows* we might later import are uniformly CC — **needs per-source check**.
2. Dexie Cloud vs DIY outbox — not decided; DIY assumed.
3. Real-device zxing performance for UPC/EAN in low light.
4. Design reference **images missing** from repo at research time.
5. workout-cool test coverage and production reliability not audited beyond README/schema.
6. Exact Supabase helper signature versions may change — re-read docs at implementation time.
