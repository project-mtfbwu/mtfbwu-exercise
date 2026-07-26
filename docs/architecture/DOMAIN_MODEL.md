# DOMAIN_MODEL.md

## Ubiquitous language

| Term | Meaning |
| --- | --- |
| Module | Enabled domain surface on the flat-lay board |
| Focus | Selected module lifted into a retro window; board stays behind |
| Template / Plan / Routine | Reusable prescription of work or meals |
| Session / Log | What the user actually performed or consumed |
| Exercise | Catalog movement with equipment + muscle taxonomy |
| Set | One logged or prescribed effort unit |
| Protocol | Special set structure (superset, drop set, etc.) |
| FoodItem | Normalized nutrition entity with source provenance |
| MealLog | Performed intake entries for a time window |
| Tracker | User-configured custom metric or counter |
| Outbox | Pending sync mutations stored locally |

## Critical separation: templates vs performed work

Inspired by patterns observed in workout.cool (`Program*` vs `WorkoutSession*`) and wger (`Routine` / `Day` / `Slot` vs `WorkoutSession` / `WorkoutLog`) — **study only for AGPL wger code**.

| Template side | Performed side |
| --- | --- |
| WorkoutTemplate | WorkoutSession |
| TemplateBlock / TemplateExercise | SessionExercise |
| TemplateSet (targets) | PerformedSet (actuals) |
| MealPlan (optional later) | MealLog / MealEntry |
| RehabProtocol | RehabSession |

**Invariant:** Editing a template never rewrites historical sessions. Sessions may snapshot exercise names/targets at start time.

## Workouts

### Exercise taxonomy

Adopt a catalog inspired by Unlicense datasets (`free-exercise-db` / `exercises.json`):

- `force` (push / pull / static)
- `level`
- `mechanic` (compound / isolation)
- `equipment`
- `primaryMuscles` / `secondaryMuscles`
- `category`
- instructions + optional images

MTFBWU may extend with rehab-specific tags (mobility, isometrics) without breaking catalog import.

### Protocols

Support at minimum:

| Protocol | Model sketch |
| --- | --- |
| Straight sets | Ordered performed sets |
| Superset / circuit | Group id linking session exercises; shared rest rules |
| Drop set | Protocol type on set or exercise; successive load reductions |
| Warm-up / special | Typed set kinds (wger `ExerciseType` includes `warmup`, `dropset`, `myo`, etc. — **study concepts, do not copy AGPL code**) |

Complex auto-progression engines (wger SlotEntry config calculators) are **unsuitable early complexity** — defer beyond initial increments.

## Nutrition

### FoodItem normalization

Every FoodItem records:

- `source` enum: `usda` | `open_food_facts` | `user` | `ai_proposed`
- External ids (`fdcId`, barcode/GTIN, OFF code)
- Normalized macros per 100g (and serving when known)
- `fetchedAt` / cache metadata
- Confidence / review state for AI and crowd sources

Priority rules: `ADR/0004-nutrition-source-priority.md`.

### Meal logging

`MealLog` → `MealEntry[]` referencing FoodItem + quantity + unit. Offline-first.

## Rehab

Treat as structured protocols + sessions (not medical advice). Share exercise catalog where useful; allow protocol notes and pain/RPE fields without becoming a clinical EHR.

## Hydration & meditation

Simple daily/session logs with targets. Appear as flat-lay modules.

## Measurements & progress photos

- Measurements: typed series (weight, body fat %, girths) + custom.
- Progress photos: private Storage objects; metadata (date, pose, notes) in Postgres; never public buckets.

## Calendar

Read-model aggregating sessions, meals, trackers per day. Not a social activity feed.

## Profile & custom trackers

Profile stores units, locale, animation mode, enabled modules.

Custom trackers: schema-driven (`name`, `valueType`, `unit`, `frequency`) + entries. No freeform journal stream.

## AI import

Imported plans/foods land as `ai_proposed` with provenance; user must accept/edit before promotion. See `AI_IMPORT_PIPELINE.md`.

## Anti-concepts

- Post, FeedItem, Follow, Reaction
- DiaryEntry as a first-class social object
- Shared “Odiina” content graph
