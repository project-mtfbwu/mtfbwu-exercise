# Calendar and history

Increment 9 read-model surfaces for browsing days across modules.

## Calendar (`/calendar`)

Module: `src/modules/calendar/`

- Month grid with **activity indicators** per local date
- Day detail panel via `loadDayDetail` — links to domain summaries for selected date
- Query params: `year`, `month`, optional `date`

Dates aggregate by **`local_date`** on domain rows (and **`sleep_date`** for sleep). See ADR [0014](../architecture/ADR/0014-local-date-calendar-aggregation.md).

**Timezone change:** stored dates on historical rows are not recomputed when profile timezone changes; calendar reflects persisted `local_date` / `sleep_date` only.

## Offline sync

Calendar/history read from Supabase after sync. Offline tracker writes replay in dependency order before day indicators update on reconnect.

## History (`/history`)

Module: `src/modules/daily/history-actions.ts`

- Paginated reverse-chronological list of days using `loadDailyOverview`
- Cursor-based pagination (`cursor` query param)
- Each row shows cross-module completion snippet; links to calendar day

## Revalidation

Hydration, meditation, sleep, supplement, and tracker mutations revalidate `/today`, `/calendar`, and `/history`.

## Related

- [DAILY_OVERVIEW.md](./DAILY_OVERVIEW.md)
- [INCREMENT_9_DAILY_SYSTEM.md](./INCREMENT_9_DAILY_SYSTEM.md)
