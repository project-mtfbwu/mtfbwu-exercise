# PRODUCT.md — MTFBWU

## One-liner

MTFBWU is a private, modular body-and-training tracker with a GeoCities flat-lay board UI.

## Problem

People track nutrition, training, rehab, hydration, meditation, measurements, and progress photos across fragmented tools. MTFBWU consolidates **personal operational tracking** without becoming a journal or social network.

## Product principles

1. **Private by default** — user owns data; progress photos are sensitive.
2. **Modules, not a feed** — enabled modules sit on one flat-lay board.
3. **Log what happened** — performed sessions and meal logs are first-class, distinct from templates/plans.
4. **Offline capable** — workouts and meals must be loggable without network.
5. **Not a journal** — short notes on logs are fine; freeform diary / social posting is out.
6. **Odiina is separate** — no shared product surface or social features from Odiina.
7. **Honest nutrition** — every food item carries source + provenance; AI suggestions are reviewable.
8. **Accessible motion** — full / reduced / disabled animation modes.

## Personas (initial)

- Solo trainee who lifts, rehabs, and tracks macros
- User who scans packaged food barcodes and logs meals at the gym (often offline)
- User who keeps private progress photos and circumference measurements

## Core domains

| Domain | Primary job |
| --- | --- |
| Nutrition | Search/scan foods, log meals, daily targets |
| Workouts | Templates + performed sessions, sets, protocols |
| Rehab | Protocols and session logs (therapy-adjacent tracking, not clinical advice) |
| Hydration | Daily fluid logging |
| Meditation | Session logging (duration, type) |
| Measurements | Weight, girths, custom metrics over time |
| Progress photos | Private photo sets with date/pose metadata |
| Calendar | Cross-domain day view / scheduling hooks |
| Profile | Preferences, units, animation mode, modules enabled |
| Custom trackers | User-defined countable/measurable trackers |

## Explicit non-goals

- Social follows, likes, comments, public profiles
- General journaling / mood diary as a product pillar
- Coaching marketplace / multi-athlete gym admin (study wger gym features; do not ship them early)
- Medical diagnosis or treatment claims
- Shipping AGPL application forks as the product core

## Success criteria (foundation phase)

- Clear domain model separating templates vs performed work
- Documented offline sync and security posture
- Visual direction locked before UI implementation
- License-safe path for exercise DB + nutrition APIs
- Increment 0 checklist complete before scaffolding Next.js

## Related

- `SYSTEM_ARCHITECTURE.md`
- `DOMAIN_MODEL.md`
- `BUILD_INCREMENTS.md`
