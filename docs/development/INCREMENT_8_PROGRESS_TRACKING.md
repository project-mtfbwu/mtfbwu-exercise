# Increment 8 — Progress tracking

User-recorded body weight, body measurements, private progress photos, comparisons, notes, and summary preferences.

See also:

- [WEIGHT_AND_MEASUREMENTS.md](./WEIGHT_AND_MEASUREMENTS.md)
- [PROGRESS_PHOTOS.md](./PROGRESS_PHOTOS.md)
- [PROGRESS_COMPARISONS.md](./PROGRESS_COMPARISONS.md)
- [PROGRESS_OFFLINE_SYNC.md](./PROGRESS_OFFLINE_SYNC.md)
- [PROGRESS_PRIVACY.md](./PROGRESS_PRIVACY.md)
- [INCREMENT_8_TEST_PLAN.md](./INCREMENT_8_TEST_PLAN.md)
- [INCREMENT_8_MANUAL_QA.md](./INCREMENT_8_MANUAL_QA.md)
- ADRs [0011](../architecture/ADR/0011-private-progress-photo-storage.md), [0012](../architecture/ADR/0012-progress-comparisons-without-automated-body-analysis.md)
- Architecture pointer: [INCREMENT_8_PROGRESS_TRACKING.md](../architecture/INCREMENT_8_PROGRESS_TRACKING.md)

## Migrations

| File                                                     | Contents                    |
| -------------------------------------------------------- | --------------------------- |
| `20260801120000_increment8_progress_tracking.sql`        | Tables, RLS, Storage bucket |
| `20260801120100_increment8_measurement_catalog_seed.sql` | Curated measurement catalog |

## Modules

- `src/modules/measurements/` — units, CRUD, calculations
- `src/modules/progress-photos/` — private upload, crop session, managed camera, preprocess (2048px max), signed URLs, replacement safety, offline quota helpers
- `src/modules/progress/` — timeline, comparisons, summary prefs, board day summary

## UI

- Today board: Measurements focus, Progress photos focus (camera → crop → upload / offline queue)
- `/progress` — timeline, weight chart (SVG), measurement trend chart, measurement enablement, photo comparison viewer
- Profile — private progress summary counts

## Dexie

v8 adds `progressPhotoBlobs` (processed JPEG `ArrayBuffer`) for resumable offline photo upload. See [PROGRESS_OFFLINE_SYNC.md](./PROGRESS_OFFLINE_SYNC.md).

## Deferred (genuine)

- Moving-average chart overlay
- Accessible photo overlay slider
- PDF export of progress summary
- Periodic Storage orphan sweeper job
- Physical-device camera / quota QA (see INCREMENT_8_MANUAL_QA.md)
- Increment 9 (hydration / meditation / calendar)
- Chart libraries, AI body analysis / scoring / body-fat from photos
