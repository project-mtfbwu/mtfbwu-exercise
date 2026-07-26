# FOCUS_MODE.md

## Normal mode

- All **enabled** modules appear together on `FlatLayBoard`.
- Cards may use slight rotation and overlap (refs `01`, `06`, `10`).
- Important daily status stays visible (yellow status strip + optional targets footer).
- Stickers are decorative.

## Focus mode (canonical behavior)

Derived from refs `05`, `07`, `08`, `12`:

1. User activates a `FlatLayCard`.
2. Card visually lifts from its board position into a focus panel (`TornPaperPanel` or `RetroWindow`).
3. Board remains mounted behind; dimmed (~40–60%), not removed, not replaced by a blank route skin.
4. Panel expands into the real input UI (live controls).
5. Save persists; Close/Save returns panel to origin; collapsed card shows updated values.
6. Focus returns to the card (accessibility).

### Desktop / tablet / mobile

See `RESPONSIVE_BEHAVIOR.md`. Mobile stays in paper/window identity with clear Save/Close and safe areas.

---

## Module focus specifications

### Nutrition / meal (referenced: `05`, `12`)

- Actions: barcode, label scan, search, speak, recent, saved meals
- Item rows with steppers, macros, delete
- Meal totals + Save meal
- Board nutrition context remains dimmed behind

### Workout session (referenced: `07`, `12`)

- Session timer, progress, plan list, active exercise
- Sets table: target/actual, weight, RPE, done
- Rest timer; protocol note; supersets via “next” cue / group
- Complete exercise / Save session

### Hydration (referenced: `08`)

- Goal, meter, quick-add, custom amount, recent log, reminders toggle, notes, Save/Close

---

### Meditation focus (derived — primary cue: `10`)

**Chrome:** `RetroWindow` accent purple; board behind (ref `01` meditation tile).

**Contents:**

- Timer (`Timer`) with remaining time
- Duration presets (5 / 10 / 12 / 20 / custom)
- Meditation type (`SegmentedControl` or select): breath / body scan / guided / silent
- Breathing pattern (optional select: box / 4-7-8 / custom)
- Optional audio toggle (off by default; no autoplay surprise)
- Stress before (1–10)
- Stress after (1–10) shown on finish
- Actions: Start, Pause, Finish, Save

**Collapsed card:** `12 / 20 min` + segmented meter (as in `01`/`10`).

---

### Rehab focus (derived — cards in `01`, `07`, `10`)

**Chrome:** `RetroWindow` or `TornPaperPanel`; accent orange/pink.

**Contents:**

- Protocol name
- Exercise (search from catalog)
- Side: Left / Right / Bilateral / N/A
- Sets, Reps, Hold (seconds), Tempo
- Range restriction (text)
- Clinician warning callout (non-alarmist, always visible when set)
- Pain before / during / after (0–10)
- Swelling (none/mild/mod/severe)
- Stability (1–10)
- Completion checkbox / Save

**Collapsed card:** `2/3 sessions` style meter.

---

### Measurements focus (derived — `10`, `11`)

**Contents:**

- Date
- Weight, waist, chest, hips, arms, thighs, calves (`MeasurementInput`)
- Previous value + change (delta with text, not color-only)
- Save

**Collapsed card:** weight + waist + delta arrows with text.

---

### Progress photos focus (derived — `10`, `11`)

**Contents:**

- Slots: Front, Side, Back (`PhotoCard`)
- Camera guides (silhouette overlay CSS)
- Weekly set label
- Retake / Upload
- Privacy status badge (“Private — only you”)
- Compare dates (pick two sets) — later OK to stub
- Never public by default (`SECURITY_AND_PRIVACY.md`)

---

### Calendar mode (derived — `01` mini + `10` full)

**Chrome:** paper calendar in focus or board-level calendar module.

**Contents:**

- Month grid (`CalendarTile`)
- Compact completion icons (food/workout/water/etc.)
- Selected day highlight
- Planned vs completed distinction (outline vs filled icon)
- Activate date → load that day’s board state (same DNA, different data)

**Not** a social activity feed.

---

### Barcode mode (derived — `05`, `10`)

**Contents:**

- Camera focus area inside `RetroWindow`
- Flash toggle, camera switch
- Manual code input
- Found product → review macros → Add to meal
- Missing product → create user FoodItem / needs_review flow
- Pause decorative motion while scanning

---

### AI-import mode (derived — `10` + `AI_IMPORT_PIPELINE.md`)

**Contents:**

- Sources: PDF, image, screenshot, handwriting, typed text, voice
- Extraction preview table
- Uncertainty warnings (highlight low-confidence rows)
- Confirm / edit
- Save as **draft template** (not auto-completed sessions)
- Provenance stored

---

### Custom module focus (derived — `10` Smoking window + `11` toggles)

**Contents:**

- Tracker name
- Icon / sticker picker
- Value type (number, duration, boolean, scale)
- Unit
- Target
- Frequency (daily / weekly / per session)
- Board visibility toggle
- Calendar visibility toggle
- Log entry + Save

Custom trackers must not reinvent a general journal.

---

### Recipe building (no dedicated ref)

Derive from nutrition flow (`12`): Saved meal / recipe = named ingredient list + per-serving macros, reusable from meal focus “Saved Meals”. Same paper/window DNA — no new aesthetic.

---

## Dirty state

If the user closes with unsaved changes: accessible confirm dialog (not only color). Prefer explicit Save.
