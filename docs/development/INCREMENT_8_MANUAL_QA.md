# Increment 8 — Manual QA

## Automated pass (CI / local verify)

| Check                                                                                        | Result                                         |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Increment 3–8 SQL/RLS suites                                                                 | Pass when Supabase local is up                 |
| `pnpm typecheck` / `lint` / `format:check` / `test` / `build` / `audit`                      | Pass on completion of crop/camera/quota polish |
| Unit: crop session, managed camera mocks, quota store, replacement order, measurement charts | Pass                                           |

## Desktop browser pass

Run with `pnpm dev` against local Supabase + a signed-in user.

| Viewport | Surfaces                                                                                                                                                 | Status                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1440×900 | Today Progress card, Measurements focus, Progress Photos focus (crop editor + camera panel chrome), `/progress` timeline/charts/compare, Profile summary | **Pending human browser review** (IDE browser MCP unavailable in this completion session) |
| 768×1024 | Same                                                                                                                                                     | Pending                                                                                   |
| 390×844  | Same — confirm no horizontal overflow, reachable photo controls                                                                                          | Pending                                                                                   |

Checklist when reviewing:

- [ ] Board stays visible behind lifted focus cards
- [ ] Crop editor: rotate CW/CCW, reset rotation, crop drag, keyboard numeric crop, retake, choose another, cancel leaves saved slot unchanged
- [ ] Camera panel: Open camera only after click; Close stops stream; file-picker fallback works
- [ ] Weight + measurement charts readable with table fallback
- [ ] Photo comparison side-by-side; missing slot unavailable (not broken image)
- [ ] Empty states / upload failure / offline draft + quota error messaging visible (not console-only)
- [ ] No medical-dashboard styling; no body-shaming language
- [ ] Focus restoration after closing focus panels
- [ ] Touch targets ≥ ~44px where practical
- [ ] `prefers-reduced-motion` / animation mode disabled still usable

## Responsive simulation pass

Use browser DevTools device mode for 1440×900, 768×1024, 390×844. Mark results here when executed:

- Desktop simulation: _not run in agent session_
- Tablet simulation: _not run in agent session_
- Mobile simulation: _not run in agent session_

## Physical-device checks (still untested)

Do **not** claim these passed until exercised on real hardware:

- [ ] Rear camera `getUserMedia` permission grant/deny
- [ ] Switch between multiple cameras
- [ ] Capture → crop → upload on phone Safari/Chrome
- [ ] Insecure-context guidance on non-HTTPS LAN
- [ ] IndexedDB quota-full behavior with large photo drafts
- [ ] Touch crop handles and camera preview size in real safe areas

## Feature checklists

### Measurements

- [ ] Log weight on Today board; board label updates
- [ ] Enable waist + upper arm (L/R) on `/progress`; log left and right values
- [ ] Custom measurement create + log
- [ ] Weight + measurement charts with table fallback

### Progress photos

- [ ] Capture front photo — crop/rotate editor before save
- [ ] Camera preview → capture frame → crop confirm (physical device)
- [ ] Privacy banner visible before capture
- [ ] Replace slot: new Storage object first; old photo survives failed metadata
- [ ] Compare two sets side-by-side
- [ ] Cancel crop does not modify saved slot

### Offline / quota

- [ ] Queue weight offline; sync when online
- [ ] Queue processed photo offline; blob cleaned after successful upload
- [ ] Quota failure shows retry / reduce size / cancel — not silent discard
- [ ] Failed replacement does not remove existing saved photo

### Privacy / a11y

- [ ] Profile progress summary + user-recorded disclaimer
- [ ] No body scores or medical language
- [ ] Comparison controls keyboard accessible; slots labeled

Visual review notes: [INCREMENT_8_VISUAL_REVIEW.md](../design-system/INCREMENT_8_VISUAL_REVIEW.md).
