# Staging manual QA

Human browser/device matrix for private-beta operator QA. Do not mark unavailable devices as passed.

## Desktop browsers

| Browser         | Available? | Result | Notes |
| --------------- | ---------- | ------ | ----- |
| Chrome current  |            |        |       |
| Edge current    |            |        |       |
| Firefox current |            |        |       |
| Safari current  |            |        |       |

## Responsive viewports

| Viewport | Result | Notes                                  |
| -------- | ------ | -------------------------------------- |
| 1440×900 |        | Local Playwright smoke covered locally |
| 768×1024 |        | Local Playwright smoke covered locally |
| 390×844  |        | Local Playwright smoke covered locally |

Local Chromium smoke (2026-08-03): **passed** against local Supabase — not a substitute for hosted staging.

## Physical devices

| Device / capability             | Available? | Result | Notes |
| ------------------------------- | ---------- | ------ | ----- |
| Android Chrome                  |            |        |       |
| iPhone Safari                   |            |        |       |
| Camera barcode scan             |            |        |       |
| Nutrition label image capture   |            |        |       |
| Progress photo capture          |            |        |       |
| Photo permissions               |            |        |       |
| Offline / reconnect             |            |        |       |
| Meditation background recovery  |            |        |       |
| VoiceOver / other screen reader |            |        |       |

## Issue template

For every finding:

- Environment (staging URL / SHA)
- Browser / device
- Reproduction steps
- Severity (P0–P3 per staging triage)
- Screenshot or trace when safe (no health PII)
- Expected vs actual
- Recommended fix
- Launch blocker yes/no

## Status this prep

Hosted staging manual QA **not started** (no staging app URL). Local automated a11y/responsive smoke only.
