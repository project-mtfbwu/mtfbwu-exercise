# REFERENCE_CATALOG.md

Catalog of approved visual references in `docs/design-references/`.  
**Inspection date:** 2026-07-26.

These images define **visual DNA**, not exact production pixel layouts. Do not reproduce fake text, wrong macros, illegible glyphs, or accidental overlaps as UI requirements.

## Inventory

| # | Filename | Screen / interaction | Classification |
| --- | --- | --- | --- |
| 01 | `01-master-today-board.png.png` | Full “MTFBWU TODAY” board — all modules visible | flat-lay board |
| 02 | `02-diet-chicken-day.png.png` | Nutrition day board — chicken / 1900 cal template | nutrition, flat-lay board |
| 03 | `03-diet-plant-day.png.png` | Nutrition day board — plant / veg day | nutrition, flat-lay board |
| 04 | `04-diet-fish-day.png.png` | Nutrition day board — fish day (header typo: “MTFFBWU”) | nutrition, flat-lay board |
| 05 | `05-breakfast-focus.png.png` | Breakfast meal logging in focus over nutrition board | focus mode, nutrition |
| 06 | `06-workout-routine-board.png.jpeg` | Mass Phase 1 routine overview board | workout, flat-lay board |
| 07 | `07-workout-focus.png.png` | Today’s Session logging in focus over workout board | focus mode, workout |
| 08 | `08-water-focus.png.png` | Water intake focus over nutrition journal board | focus mode, hydration |
| 10 | `10-optional-tracker-focus.png.png` | Mosaic of TODAY board + many focus windows (meditation, calendar, barcode, AI import, measurements, photos, custom trackers, etc.) | flat-lay board, focus mode, customization, calendar, other |
| 11 | `11-profile-board.png.png` | Profile + board customization overview | profile, customization |
| 12 | `12-customize-board.png.png` | Food-log and workout-log step flows (card → focus → updated card) | nutrition, workout, focus mode, customization |
| 14 | `14-overview.png` | Duplicate of master TODAY board composition | flat-lay board |

**Numbering gaps:** `09`, `13` are not present. Treat as unused slots, not missing required files.

**Duplicate note:** `01-master-today-board.png.png` and `14-overview.png` are the same composition/size. Prefer citing **01** as the canonical master board; **14** is a redundant overview alias.

---

## Per-image notes

### 01 — Master today board (`01-master-today-board.png.png`)

**Useful patterns:** Dark navy grid + pink/purple glow; magenta/black checkered footer strip; glitter “MTFBWU TODAY”; yellow status strip (date, weight, waist, sleep, steps, energy); torn-paper meal cards; retro windows for Workout/Water/Rehab/etc.; segmented progress meters; mini calendar; pixel stickers (“BEAST MODE”, “LEVEL UP!”); blue targets/totals footer with completion %.

**Mistakes not to ship:** Non-functional inconsistent window chrome glyphs; warped Guestbook text; low-contrast footer text; treat “Guestbook” as decorative GeoCities chrome / motivational sticker — **not** a social feature (product forbids feeds/social).

### 02 — Chicken day (`02-diet-chicken-day.png.png`)

**Useful patterns:** Cyan grid on navy; glitter day title; meal torn-paper cards with macro pills; Target + Micros retro windows; totals bar; checklist; supplements; mood scales 1–5; food pixel stickers; slight card rotation.

**Mistakes:** Filler micros at neat 90/100%; melted AI food icons; illegible footer slogan; “Mood + Journal” freeform diary should not become a primary journaling product — keep as optional day notes / custom tracker tone.

### 03 — Plant day (`03-diet-plant-day.png.png`)

**Useful patterns:** Same nutrition-board system as 02 with plant theme accents; high density meal cards; checklist columns; micros bars.

**Mistakes:** Garbled microcopy; tiny text; overlap that would block hit targets — reflow for accessibility.

### 04 — Fish day (`04-diet-fish-day.png.png`)

**Useful patterns:** Same nutrition DNA; template burst sticker (“1900 Cal Template”); Mediterranean-Indian checklist.

**Mistakes:** **“MTFFBWU” typo** — never ship; jagged AI burst edges → clean SVG/CSS; guestbook filler; macro math must be computed live, not copied.

### 05 — Breakfast focus (`05-breakfast-focus.png.png`)

**Useful patterns:** Focus card centered over dimmed board; torn-paper meal panel; header with close + SAVE; action row: Scan Barcode, Scan Label, Search Food, Speak Food, Recent, Saved Meals; numeric steppers; per-row delete; color-coded kcal/P/C/F; SAVE MEAL with floppy-disk motif; board still visible around edges; checkered bottom strip.

**Mistakes:** Blurry guestbook/checklist text; flat shadow — use clearer elevation; small buttons need AA touch targets.

### 06 — Workout routine board (`06-workout-routine-board.png.jpeg`)

**Useful patterns:** Neon purple/cyan grid; glitter routine title; pastel-bodied retro windows; weekly split table; recovery checklist; sticker slogans; high density protocol overview.

**Mistakes:** Identical fake rep schemes across groups; overload for mobile — board collapses responsively; checkboxes must be real controls.

### 07 — Workout focus (`07-workout-focus.png.png`)

**Useful patterns:** “TODAY’S SESSION” retro window over dimmed board; session timer; progress bar; plan sidebar with active exercise highlight; sets table (target/actual/weight/RPE/done); rest timer; protocol card; COMPLETE EXERCISE / SAVE SESSION; SUPERSET NEXT footer strip; board remains visible.

**Mistakes:** Illegible background text; tiny rest buttons; do not copy sample 1–10 set numbers as product logic; ensure strong dimming for focus readability.

### 08 — Water focus (`08-water-focus.png.png`)

**Useful patterns:** WATER INTAKE retro window; goal + fill visualization; quick-add amounts; custom input; recent log table; reminders toggle; notes; ADD WATER / SAVE / CLOSE; cursor cue on collapsed water card; nutrition board behind.

**Mistakes:** Soft AI water bottle art → prefer CSS/SVG meter; redundant repeated totals; yellow-on-light contrast fails; pixel-font essentials → readable UI font.

### 10 — Optional tracker mosaic (`10-optional-tracker-focus.png.png`)

**Useful patterns:** Compact TODAY board tiles with % meters for Breakfast, Workout, Rehab, Water, Meditation, Steps, Measurements, Progress Photos, Supplements; focus windows for food log, workout session, water, **meditation timer**, smoking/custom tracker, measurements delta table, progress photos front/side/back, **calendar with completion icons**, barcode + label scan, workout builder, **AI import** (PDF/image/paste + preview), progress charts. Primary source for deriving missing modules.

**Mistakes:** Lorem/garbled copy; identical fake physique in all photo slots; table alignment drift; chart chrome is illustrative — implement accessible charts later, not poster graphs.

### 11 — Profile board (`11-profile-board.png.png`)

**Useful patterns:** Glitter “MTFBWU PROFILE”; yellow profile stats strip; Customize My Board CTA; 3×3 of profile/photos/measurements/module toggles/layout order/privacy+animation/weekly check-in/achievements/quick actions; toggles including Animate UI; private photos; export/backup affordances.

**Mistakes:** Decorative badges are optional personality — not a social achievements feed. Keep privacy defaults strict.

### 12 — Customize / flow board (`12-customize-board.png.png`)

**Useful patterns:** Step narrative: collapsed card → ADD FOOD methods grid → search → review item → meal summary → updated rotated board card; parallel workout flow with SET SAVED sticker feedback and NEW PR sticker on return. Documents focus → board update loop.

**Mistakes:** Blurry tip text; uneven step spacing; all copy must be live HTML.

### 14 — Overview (`14-overview.png`)

Same DNA as 01. Use only as alias; prefer 01 in citations.

---

## Coverage vs product domains

| Domain | Direct reference | Derivation source |
| --- | --- | --- |
| Flat-lay board | 01, 02–04, 06, 10, 11, 14 | — |
| Nutrition | 02–05, 08, 10, 12 | — |
| Workout | 06, 07, 10, 12 | — |
| Hydration | 01, 08, 10 | — |
| Profile / customize | 11, 12, 10 | — |
| Calendar | Mini in 01; full in 10 | Derive full day-board load from 10 + 01 |
| Meditation | Compact in 01/10; focus in 10 | Derive from FOCUS_MODE + 10 meditation window |
| Rehab | Compact in 01/07/10 | Derive from workout focus chrome + rehab fields in DOMAIN_MODEL |
| Measurements | Compact in 01/10/11; focus in 10 | Derive from 10 measurements window |
| Progress photos | Compact in 01/10/11; focus in 10 | Derive from 10 + privacy rules |
| Barcode / label scan | 05 action row; 10 scanner windows | Derive from 05 + 10 |
| AI import | 10 | Derive from 10 + AI_IMPORT_PIPELINE |
| Custom trackers | 10 Smoking + 11 optional modules | Derive from 10 custom window + ModuleToggle |
| Recipe building | Not present | Derive from nutrition meal card + search/review flow (12) as “saved meal / recipe” — not a separate brand language |

---

## Conflict summary (resolved)

See `DESIGN_SYSTEM.md` § Conflicts. Short version:

1. **Density** — references are poster-dense; production uses the same surfaces with responsive reflow and focus for input.
2. **Guestbook / social chrome** — keep sticker personality; no real guestbook/social.
3. **Journal blocks on diet days** — optional day notes / mood scales only; not Odiina journaling.
4. **Window chrome colors** — allow per-module accent; standardize control semantics (close/save).
5. **01 vs 14** — same board; cite 01.
6. **Glitter text** — decorative brand only; UI copy uses readable fonts.
