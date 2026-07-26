# SECURITY_AND_PRIVACY.md

## Threat posture

MTFBWU holds **sensitive personal health and body data**, including private progress photos. Assume clients can be hostile; **Postgres RLS** and Storage policies are mandatory.

## Auth (Supabase Auth)

- Use Supabase Auth for identity; app `profiles.id` = `auth.users.id`.
- Browser uses anon/publishable key only.
- Service role key: server-only (USDA proxy, admin jobs) — never in client bundles or Dexie.

Official guidance: Supabase Auth + RLS docs (`https://supabase.com/docs/guides/auth`, `https://supabase.com/docs/guides/database/postgres/row-level-security`).

## RLS baseline

- Enable RLS on every exposed user table.
- Default deny; policies: `auth.uid() = user_id` (or `id` for profiles).
- No public read on meals, sessions, measurements, photos metadata.

## Storage (progress photos)

From Supabase Storage docs:

- Policies on `storage.objects`; no uploads without policies.
- Private buckets only for progress photos.
- Path layout: `{user_id}/...` and policies comparing `(storage.foldername(name))[1] = auth.uid()::text` (exact helper usage per current Supabase docs).
- Treat `storage` schema as read-only metadata; mutate via Storage API.
- Service role bypasses RLS — restrict server use.

## Nutrition API keys

USDA FoodData Central ([API Guide](https://fdc.nal.usda.gov/api-guide/)):

- API key must not be published in repositories or client code; leaked keys are deactivated.
- Default rate limit ~1000 req/h/IP; use server-side caching and batch `/foods`.
- Data is CC0 / public domain; cite FoodData Central.

Open Food Facts:

- Respect rate limits (product reads ~15/min/IP; search ~10/min/IP per OFF API docs).
- Custom `User-Agent: MTFBWU/version (contact)`.
- Prefer local/cached product reads; bulk via exports if volume grows.
- Database licensed ODbL; contents DbCL; images CC-BY-SA — track attribution obligations.
- Do **not** copy AGPL Product Opener server code into this repo; use the HTTP API / exports.

## Offline device risk

- IndexedDB readable by anything running as the user in the browser profile.
- Logout clears local DB.
- Optional future: passcode lock for photo gallery (product decision TBD).

## AI imports

- Default: no photo upload to external AI.
- Provenance + review required (`AI_IMPORT_PIPELINE.md`).

## PII minimization

- Collect only fields needed for tracking.
- No social graph.
- Support export/delete account in a later increment (GDPR-ready design).

## Barcode camera

- `@zxing/browser` (MIT) runs locally in-browser; frames need not leave device for decode.
- Only the decoded barcode value is sent to our backend/OFF cache lookup.

## Checklist before any production data

- [ ] RLS enabled + policies tested with anon key
- [ ] Private photo bucket policies tested
- [ ] USDA key only in server env
- [ ] OFF User-Agent + caching
- [ ] No service role in client
- [ ] Security review for photo paths

## Related

- `ADR/0002-supabase-dexie.md`
- `ADR/0004-nutrition-source-priority.md`
- Supabase skill / official docs when implementing
