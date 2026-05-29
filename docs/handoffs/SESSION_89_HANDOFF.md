# Session 89 — Sentence Match + Sorting Mat + Term Reports Grammar Overhaul + Bingo Duplex Lock + Super-Admin Polish

**Date:** May 5, 2026 (evening, after Session 88)
**Commits:** 14 pushed to `origin/main` from `22272ab7` through `405db7eb`

## Headline

Five distinct workstreams shipped in one session:

1. **Sentence Match Picture Generator** — new tool, mirrors 3-Part Card flow but with landscape sentence strips
2. **Sorting Mat Generator** — new tool, A4 mats with 2/3/4 labelled circles
3. **Term Reports overhaul** — fixed grammar artifacts, merged closing into body block, made closing visible (was white-on-white)
4. **Bingo Calling Card duplex calibration** — locked header geometry to fix few-mm cutting drift
5. **Super-admin polish** — bulk-clean leads, show owner email + name on Schools rows

User will physically print and test the bingo cards tomorrow on industrial printers (which they confirmed are mechanically exact, so any residual drift would still be a software issue worth chasing).

---

## 1. Sentence Match Picture Generator

`/admin/sentence-match-generator` + `/montree/library/tools/sentence-match-generator`

**Architecture:** reuses the existing `<CardGenerator>` component via two new optional props instead of forking a parallel module.

| Prop | Purpose |
|------|---------|
| `textConfig` | Overrides 9 user-facing strings (bulk tab label, instructions, placeholder, info section copy) with sentence-match copy. Defaults preserve 3-Part-Card behaviour exactly. |
| `layoutMode: 'square' \| 'strip'` | Default `'square'` = unchanged 3-part behaviour. `'strip'` = landscape sentence strips. |

**Strip layout (Montessori sentence-strip standard):**

| Card | Outer size (default 6.5cm height) | Per A4 |
|------|------------------------------------|--------|
| Control | 21 × 6.5 cm — sentence-left + picture-right in ONE bordered piece | 4 |
| Picture | 6.5 × 6.5 cm — matches picture portion of control | 12 (3×4) |
| Sentence | 14.5 × 6.5 cm — matches sentence portion of control | 4 |

**Identical-overlay invariant:** standalone sentence card + standalone picture card laid side-by-side reconstruct the control card's 21cm × 6.5cm footprint exactly. The internal gap inside the control (1cm = 0.5cm sentence right-padding + 0.5cm picture left-padding) is the join.

**Adaptive font sizing (took several iterations):**
- Final algorithm: `computeUniformStripFontSize()` finds the largest font size where EVERY sentence in the batch fits on one line within the control's narrower text area (12.5cm internal at default).
- That single uniform size is applied to ALL control sentence portions AND ALL standalone sentence cards in the same print job.
- Fallback to multi-line wrapping if any sentence is too long to fit at MIN_PT (14pt).
- Char-width estimate `CHAR_W = 0.52` (was 0.6 — Comic Sans MS is narrower than the conservative estimate).

**Files:**
- `components/card-generator/CardGenerator.tsx` — `textConfig`, `layoutMode`, dispatch
- `components/card-generator/CardPreview.tsx` — strip-mode preview row, third-card-label override
- `components/card-generator/print-utils.ts` — `generateStripCards`, `generateStripImagesOnly`, `generateStripSentencesOnly`, `computeStripLayout`, `computeUniformStripFontSize`, `adaptiveStripFontSize`
- `app/admin/sentence-match-generator/page.tsx`
- `app/montree/library/tools/sentence-match-generator/page.tsx`
- `app/montree/library/tools/page.tsx` — TOOLS array entry (`📖 Sentence Match Picture Generator`)
- `lib/montree/i18n/*.ts` — 4 keys × 12 locales

**🚨 Architectural rule:** the strip-layout uniform-font calculation is calibrated to the NARROWER (control sentence portion) text area. This is intentional — it guarantees the same font size will render correctly in both the control and standalone-sentence card.

---

## 2. Sorting Mat Generator

`/admin/sorting-mat-generator` + `/montree/library/tools/sorting-mat-generator`

**New component family** (not reusing CardGenerator — different concept).

A4 sorting mats with 2, 3, or 4 labelled circles. Children sort items into the correct circle by category (sounds, colours, numbers, anything).

**Layouts:**
- 2 circles → side-by-side, 9.5cm diameter each
- 3 circles → triangular (2 top + 1 bottom centred), 9cm diameter each
- 4 circles → 2×2 grid, 9cm diameter each

**Settings:** number of circles, mat title (optional), per-circle text label (anything), border colour, font family. Default labels for 3 circles: `sh`, `ch`, `th`.

**Files:**
- `components/sorting-mat-generator/types.ts` — `SortingMatCount`, `SortingMatConfig`
- `components/sorting-mat-generator/print-utils.ts` — `generateSortingMat`, `getLayoutSpec`, `renderCircle`
- `components/sorting-mat-generator/SortingMatGenerator.tsx` — main component
- `app/admin/sorting-mat-generator/page.tsx`
- `app/montree/library/tools/sorting-mat-generator/page.tsx`
- `app/montree/library/tools/page.tsx` — TOOLS array entry (`🎯 Sorting Mat Generator`)
- `lib/montree/i18n/*.ts` — 4 keys × 12 locales

---

## 3. Term Reports Overhaul (`scripts/generate-term-reports.mjs`)

User flagged grammar issues in v7 reports. Audit found three concrete bugs and one critical visual bug.

**Output:** `term-reports-v8/` (v7 preserved untouched for comparison). 20 PPTXs + bundle ZIP.

### 3a. Mask-then-scrub (the big fix)

`scrubHallucinatedWorks()` was matching capitalised phrases inside parenthesised work names — e.g. it'd see `Classified Cards (Nomenclature Cards)` and process the inner `Nomenclature Cards` as a separate phrase, replacing it with "your work" and producing `Classified Cards (Nomenclature Cards) (your work)`.

**Fix:** before running the regex, mask every allowed work name with a unique placeholder (`__WORK0__`, `__WORK1__`, ...) sorted by length DESCENDING so longer matches preempt shorter ones. Run the regex on the masked text. Restore placeholders. The regex literally cannot see inside parenthesised work names anymore.

### 3b. Haiku grammar polish pass

Final pass with Haiku model after Sonnet writes + structural scrub. Catches verb-tense errors (`helped you learned` → `helped you learn`), subject-verb agreement, awkward phrasing. ~$0.001 per report.

**Defensive design:**
- Wrapped in try/catch — if Haiku fails entirely, returns unpolished
- After polish, re-runs `postProcess()` with the dedup regex (Haiku shouldn't reintroduce duplicates but if it does, we catch them)
- Sanity check: if the polished output doesn't contain a work name that was in the unpolished input, falls back to unpolished (Haiku could have stripped a name accidentally)

### 3c. Tighter dedup regex (Pattern C)

Now catches three patterns:
- `Work Work` → `Work` (Pattern A — full work doubled)
- `Work (Work)` → `Work` (Pattern B — full work parenthetical)
- `Work (X) (X)` → `Work (X)` (Pattern C — repeated parenthetical suffix from inside the work name) ← **the bug**

### 3d. Stronger system prompt

Explicit ban on duplicated parenthetical suffixes with correct/wrong examples. Common verb-tense pitfalls called out by name (`helped you LEARN` not `helped you learned`).

### 3e. Closing color fix (bg1 → tx1)

PPTX template ships with the `ClosingText` shape's text colour set to `schemeClr bg1` — which resolves to white. **The closing was being rendered in white-on-white in every report.** v7 only worked by accident: Sonnet sometimes wrote the closing as the last sentence of the body, which lives in a different text box with proper dark colour.

`fillTemplate()` now patches the `ClosingText` shape's `bg1` colour references to `tx1` (dark) so the closing is visible.

### 3f. Closing merged into body block (uniform formatting)

The template's `ClosingText` shape uses italic 13pt Calibri — visually different from the body's regular 14pt. User wanted one continuous text block.

**Fix:** `fillTemplate()` now appends the closing to `PARA_CIRCLE` content with a line break, so it flows as the last paragraph of the body shape with the same regular 14pt formatting. The dedicated `ClosingText` shape is filled with empty string.

### 3g. Output folder + early-return shape fix

- Output to `term-reports-v8/` (v7 preserved)
- `loadLanguageProgress()` early returns now return `{ top4: [], allWorks: [] }` instead of `[]` — fixed a crash on Kevin/Ryan when their Supabase queries had transient null returns

**🚨 Architectural rules locked in this session:**
- `montree_child_progress.status='mastered'` is the SOLE source of truth for MD on parent-facing reports. Photo count alone NEVER implies mastery (existing rule, restated).
- Mask allowed work names BEFORE running scrub regex.
- Haiku polish is best-effort with fallback to unpolished. Never crash the report on polish failure.
- Closing belongs in the body block (`PARA_CIRCLE`), not a separate `ClosingText` shape. Template's `ClosingText` shape stays empty.

**Audit results across all 20 v8 reports:**
- ✅ Zero scrub artifacts (no `(your work)` patterns, no `(X) (X)` duplicates)
- ✅ Zero verb-tense errors (no `helped you VERBED` patterns)
- ✅ Every capitalised phrase in body matches a real Montessori work in the curriculum (97 Whale Class language works cross-referenced)
- ✅ All have warm/glowing tone (4–7 warm words per report)
- ✅ Returning vs graduating closing language correctly applied
- ✅ Closing in body block with uniform 14pt regular formatting (verified Amy: all 5 runs sz=1400, no italic, tx1)

**One issue caught and fixed during audit:** Kevin's first regen had `"what a wonderful year watching you grow"` — missing linking verb. Regenerated to `"what a wonderful year you have had!"`. Pattern flagged in audit; only one occurrence in 20.

---

## 4. Bingo Calling Card Duplex Calibration

User cuts cards after duplex print and reported a few mm of drift. Flip-on-short-edge (printer default) gives mostly-correct alignment with mm-level offset. Flip-on-long-edge "doesn't work at all" (intentional — software is calibrated for short-edge col-mirror).

**Diagnosis:** front and back headers had different text lengths:
- Front: `"Picture Side · Page X of Y · Print duplex, flip on short edge"` (~55 chars)
- Back: `"Word Side (mirror-printed for duplex) · Page X of Y"` (~52 chars)

Different rendered heights → grid below started at slightly different Y position on the back → cumulative few-mm offset in cut lines.

**Fix in three files:**
- `public/tools/picture-bingo-generator.html`
- `app/montree/library/tools/phonics-fast/bingo/page.tsx`
- `app/montree/library/tools/phonics-fast/reverse-bingo/page.tsx`

**CSS lock:**
```css
.calling-header {
  height: 18mm;          /* fixed height, no variation */
  margin-bottom: 4mm;    /* fixed margin */
  overflow: hidden;
}
.calling-header h2 { white-space: nowrap; line-height: 1.1; }
.calling-header p { white-space: nowrap; line-height: 1.2; }
```

**Text normalised:** front/back headers now use similar character counts, both single-line.

**🚨 Architectural rule:** SHORT-edge flip is canonical for these calling cards. The col-mirror logic in the back-page render is calibrated for short-edge geometry. Long-edge flip will mismatch words to pictures. Info banner now warns about this explicitly.

**Pending verification:** user will print and cut tomorrow on industrial printers. If still drifting (industrial printers are mechanically exact, so any residual would be software), the next move is to set `.page { width: 198mm }` to eliminate the page-padding-vs-printable-area scaling difference.

---

## 5. Super-Admin Polish

### 5a. Leads bulk-clean

User had 50 junk leads and was deleting one-by-one.

**Three new clean-up modes:**
- **🧹 Clear all New (N)** — one click wipes every lead with `status='new'`. Header button, count-aware, hidden when 0.
- **🧹 Clear Declined (N)** — same pattern for declined leads.
- **☑️ Select mode** — toggle reveals per-lead checkboxes. Action bar above list with "Select all", "Select all New", "Clear", "🗑️ Delete N selected", "Done". Whole row is clickable to toggle in select mode; action buttons (Provision/Message/Notes) stop propagation.

**API extension:** `DELETE /api/montree/leads` now accepts THREE modes:
- `?lead_id=X` (legacy single-id, unchanged)
- Body `{ lead_ids: [...] }` (multi-select, capped at 1000)
- Body `{ status: 'new'|'contacted'|'onboarded'|'declined' }` (purge by status)

Returns `{ success, deleted: <count> }`. Cleans up associated DMs in every mode.

**Files:**
- `app/api/montree/leads/route.ts`
- `hooks/useLeadOperations.ts` — `bulkDeleteLeadsByIds`, `bulkDeleteLeadsByStatus`
- `components/montree/super-admin/LeadsTab.tsx` — UI
- `app/montree/super-admin/page.tsx` — wiring

### 5b. Schools row: owner email + name visible

Previously the row showed `owner_name OR owner_email` (whichever existed). User wanted both visible with clear icons.

Now displays:
```
School Name
👤 Owner Name
📧 owner@email.com  ← clickable mailto link
🔑 LOGIN-CODE
```

If neither name nor email is set, shows `no contact info` in italic.

**Files:**
- `components/montree/super-admin/SchoolsTab.tsx` — stacked display + icon prefixes

---

## Commits this session (chronological)

```
22272ab7 — Sentence Match Picture Generator (initial textConfig prop)
05af8c36 — Sentence Match strip layout (sentence-left + picture-right)
2a8428f5 — Identical-overlay sizing (sentence card = sentence portion of control)
437b79ef — Adaptive font base bump
a7210c82 — Tighter font sizing (CHAR_W 0.6→0.52)
f24c2dc4 — Single-line preference
25e81524 — Uniform batch font size across the print job
d5c90def — Super-admin Leads bulk-clean (status purge + multi-select)
7a341a4a — Sorting Mat Generator
4311160c — Show owner email on Schools rows
7f4bfd65 — Icon prefixes (👤/📧/🔑) for owner info
8966ea0f — Term reports grammar overhaul (mask-then-scrub + Haiku polish + tighter dedup)
f1aaa011 — Term reports closing colour fix (bg1 → tx1)
405db7eb — Term reports closing merged into body + bingo calling card duplex lock
```

---

## 🚨 Next session priorities

1. **🚨 User to verify bingo calling cards on industrial printer** (tomorrow). Print one fresh 4×4 batch duplex with short-edge flip, cut along indent guides. If still drifting, follow up with `.page { width: 198mm }` patch (eliminates browser scale-to-fit offset).

2. **User to read v8 term reports** end-to-end. Verify uniform formatting on a few (Amy, Hayden) and overall warmth. v8 zip at `~/Desktop/Master Brain/ACTIVE/whale/term-reports-v8/Whale_Class_Language_Term_Reports.zip`.

3. **Verify the new Library Tools tiles render on production:** open `/montree/library/tools` after Railway redeploys (auto-deploys on push). Should see 📖 Sentence Match Generator and 🎯 Sorting Mat Generator next to the 3-Part Card Generator.

4. **End-to-end test the Sentence Match Generator** on a fresh classroom — upload a photo, type a sentence, hit "Print All Cards", confirm 3 print sets render at correct dimensions (control 21×6.5cm, picture 6.5×6.5cm, sentence 14.5×6.5cm).

5. **End-to-end test the Sorting Mat Generator** — pick 3 circles, change the labels, change colour, hit Print Mat, verify A4 output.

6. **Test super-admin Leads bulk clean** — confirm `Clear all New` button works on the 50 junk leads.

7. **Carry-over from earlier sessions:**
   - Run migration 184 (`montree_principal_agent_log`) in Supabase if not yet done
   - Run migration 185 was already done (Principal Vault)
   - Send the 3 hot lead Gmail drafts (Ardtona, FAMM, Тамі) — Session 84/87 carry-over
   - Update CLAUDE.md lead state — Paint Pots BOUNCED, Ardtona email correction, Copenhagen email verification

8. **Potential future work mentioned in user discussion:**
   - Two-stage Language Presentation flow (Stage 1 = teacher picks photos manually with optional AI-suggest button; Stage 2 = AI writes captions around chosen photos). User confirmed direction but I cancelled the build mid-stream when grammar fix took priority. Pick this back up when ready.
   - Family data model for Astra (Phase 3 of Session 85's plan)
