# USDA FoodData Central integration

`src/modules/nutrition/usda/client.ts` is a `server-only` client for FoodData
Central search and detail requests. It validates responses, clamps search page
size, times out after seven seconds, and retries only transient failures once.

Set `USDA_FDC_API_KEY` only in server environment configuration. Never expose
it through `NEXT_PUBLIC_*`, browser code, Dexie, source control, or logs.
Route handlers normalize the validated response into the nutrition model and
may populate server-managed catalog/cache rows.

Use server caching and batch lookups to stay within current USDA limits. USDA
data is public domain/CC0; attribute FoodData Central where displayed or
exported. Offline users can only select previously cached/curated/custom foods.
