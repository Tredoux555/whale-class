# Montree — Spanish (ES) Localization: Technical Handoff

**App:** montree.xyz — Montessori classroom management platform  
**Task:** Full Spanish translation for Whale Class (ES language mode enabled)  
**Status:** UI labels ✅ working. Content fields ❌ not displaying in Spanish.  
**Last updated:** April 25, 2026  

---

## 1. Environment

| Key | Value |
|-----|-------|
| App URL | `https://montree.xyz/montree/dashboard` |
| Classroom ID | `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` |
| School ID | `c6280fae-567c-45ed-ad4d-934eae79aabc` |
| Active language | ES |
| Curriculum items | 418 total |

---

## 2. Language Architecture

The app supports three locales: EN, ZH, ES. Two layers:

### Layer 1 — UI strings (working ✅)
Hard-coded translations in `lib/montree/i18n/`. Switching to ES renders buttons, labels, and nav items in Spanish ("Ir a alumno/a", "Plan de Juego", "Presentado", "Guardar Cambios", etc.).

### Layer 2 — Content fields (broken ❌)
Each curriculum item has language-specific DB columns (`_zh`, `_es` suffixes). The naming convention is inconsistent — Chinese uses both `_zh` and `_chinese` historically. Spanish is cleaner (`_es` only) but the **read paths are not wired up**.

---

## 3. Curriculum Item Data Model

Confirmed field list from live API (`GET /api/montree/curriculum?classroom_id=...`):

```json
{
  "id": "uuid",
  "classroom_id": "uuid",
  "area_id": "uuid",
  "work_key": "string",
  "name": "English name (default)",
  "name_zh": "Chinese name",
  "name_chinese": "Chinese name (legacy duplicate — UI reads this one)",
  "name_es": "Spanish name ✅ ALL 418 POPULATED",

  "parent_description": "English",
  "parent_description_zh": "Chinese",
  "parent_description_es": "Spanish (field exists, coverage unverified)",

  "why_it_matters": "English",
  "why_it_matters_zh": "Chinese",
  "why_it_matters_es": "Spanish (field exists, coverage unverified)",

  "quick_guide": "English — shown in student plan popup",
  "guide_content_zh": { "quick_guide": "...", "materials": [...], ... },
  // ⚠️ NO guide_content_es column exists

  "materials": ["English array"],
  // ⚠️ NO materials_es column

  "direct_aims": ["English array"],
  // ⚠️ NO direct_aims_es column

  "indirect_aims": ["English array"],
  // ⚠️ NO indirect_aims_es column

  "presentation_steps": [{ "step": 1, "title": "...", "description": "...", "tip": "..." }],
  // ⚠️ NO presentation_steps_es column

  "area": {
    "name": "English area name",
    "name_chinese": "Chinese area name",
    // ⚠️ NO name_es column — Spanish area names are hardcoded in AREA_LABELS_ES constant,
    //    NOT stored as DB columns. The constant is complete and correct.
    "area_key": "string"
  }
}
```

---

## 4. Translation Coverage Audit

### Curriculum item names
- `name_es` field exists: ✅
- All 418 items populated: ✅ **Confirmed via browser console** — "Already have Spanish: 418, Missing: 0"
- Student plan view actually reads `name_es`: ❌ — shows English `name` instead

### Parent descriptions
- `parent_description_es` field exists: ✅
- Coverage: unknown — not audited per item

### Why It Matters
- `why_it_matters_es` field exists: ✅
- Coverage: unknown — not audited per item

### Game plan (nudge / works / direction)
- Replan pipeline generates ES: ✅ — Haiku generates `nudge_es` and trilingual JSONB structure `{ en, zh, es }`
- FocusWorksSection reads ES: ❌ — reads `chineseName` only; Spanish falls back to English

### Quick guide
- `guide_content_es` field exists: ❌ — no column, no caching logic
- Chinese equivalent `guide_content_zh` works perfectly as reference pattern
- Current behaviour: "Guía de 10 Segundos" label is Spanish ✅, content is English ❌

### Materials list
- `materials_es` field exists: ❌
- Current behaviour: "Materiales" label Spanish ✅, items English ❌

### Direct / indirect aims
- `direct_aims_es` / `indirect_aims_es`: ❌ no columns

### Presentation steps
- `presentation_steps_es`: ❌ no column

### Area / curriculum pathway
- `area.name_es` DB column: ❌ does not exist
- `AREA_LABELS_ES` constant: ✅ complete and correct (`lib/montree/i18n/area-labels.ts` lines 27–33)
- Current behaviour: pathway always shows English ("Practical Life → Sensorial → ...")
- Fix: use the existing `AREA_LABELS_ES` constant — no DB column needed

---

## 5. Confirmed Bugs

### Bug 1 — Student plan view shows English activity names
**Where:** "Plan de Juego" section on each student's dashboard page  
**File:** `components/montree/child/FocusWorksSection.tsx`  
**Root cause:** Lines 366–369 only check `chineseName`:
```tsx
{locale === 'zh' && focusWork.chineseName ? focusWork.chineseName : cleanWorkName(focusWork.work_name)}
```
The `Assignment` interface (lines 16–24) has `chineseName?: string` but no `spanishName` field. Spanish falls through to English `work_name`.

**Fix needed:**
1. Add `spanishName?: string` to the `Assignment` interface
2. Populate it from `name_es` in the child data API (`app/api/montree/children/[childId]/route.ts`)
3. Update the render: `locale === 'es' && focusWork.spanishName ? focusWork.spanishName : ...`

---

### Bug 2 — Quick guide popup content is English
**Where:** Activity detail popup (Guía Rápida) opened from student plan  
**File:** `app/api/montree/works/guide/route.ts`  
**Root cause:** Lines 120–166 handle Chinese translation and caching via `guide_content_zh`. For `locale=es`, the route returns English content with no translation or caching. No `guide_content_es` column exists.  
**Fix needed:** Mirror the Chinese pattern — add `guide_content_es` JSONB column to `montree_classroom_curriculum_works`, add a Spanish caching block in the guide route, and populate via the auto-translate pipeline.

---

### Bug 3 — Curriculum pathway always English
**Where:** Orange breadcrumb under "Plan de Juego" (e.g. "Practical Life → Sensorial → Language → …")  
**Files:** `components/montree/child/FocusWorksSection.tsx`, `lib/montree/reports/replan-child.ts`  
**Root cause:** `area.name_es` doesn't exist as a DB column. The constant `AREA_LABELS_ES` exists and is correct but isn't being used in the pathway render.  
**Fix needed:** Use the `AREA_LABELS_ES` map from `lib/montree/i18n/area-labels.ts` when `locale === 'es'`. No DB change needed — the constant already has all values.

---

### Bug 4 — Works API doesn't return `name_es`
**File:** `app/api/montree/works/route.ts` lines 20–51  
**Root cause:** SELECT query only fetches `name` and `name_chinese`. Response mapping returns `chinese_name` but no Spanish equivalent.  
**Fix needed:** Add `name_es` to the SELECT and return it as `spanish_name` in the response.

---

### Bug 5 — `getLocalizedWorkName()` Spanish support is commented out
**File:** `lib/montree/i18n/db-helpers.ts` line 23  
**Root cause:** The column suffix mapping for ES is commented out:
```ts
const LOCALE_COLUMN_SUFFIX: Partial<Record<Locale, string>> = {
  zh: '_zh',
  // es: '_es',  // Uncomment when Spanish DB columns exist
};
```
The `getLocalizedWorkName()` function already has the correct fallback logic. ES just needs to be uncommented once the DB columns are confirmed to exist.

---

### Bug 6 — Weekly Wrap review has no Spanish work name lookup
**File:** `app/api/montree/reports/weekly-wrap/review/route.ts`  
**Root cause:** `getChineseWorkName()` (lines 129–168) is Chinese-only with a static MONTESSORI_GLOSSARY_ZH fallback. No Spanish equivalent exists.  
**Fix needed:** Add `name_es` to the SELECT query and use `getLocalizedWorkName(work, locale)` from `lib/montree/i18n/db-helpers.ts` instead of the Chinese-specific function.

---

## 6. What's Already Working (Don't Touch)

These are correctly implemented and don't need changes:

- **`AREA_LABELS_ES` constant** — `lib/montree/i18n/area-labels.ts` lines 27–33, complete
- **`AREA_LABELS` master map** — line 36–40, includes `es` key
- **Replan pipeline generates Spanish** — `lib/montree/reports/replan-child.ts` generates `nudge_es`, `works_es`, `direction_es` as trilingual JSONB `{ en, zh, es }`. `game-plan/refresh/route.ts` also wired.
- **Auto-translate column mapping** — `lib/montree/auto-translate.ts` lines 64–78, `getColumns('es')` correctly maps to `name_es`, `parent_description_es`, `why_it_matters_es`
- **UI translation keys** — all 1,490+ keys have ES translations in `lib/montree/i18n/es.ts`

---

## 7. Open Questions — Answered

**Q1: Why is the student plan view not reading `name_es`?**  
The `FocusWorksSection` component only checks `chineseName` — a field specifically added for Chinese. There's no equivalent `spanishName` on the `Assignment` interface, so the data path never includes `name_es`. Two-part fix: (1) add field to interface + API, (2) add locale check in render.

**Q2: `name_zh` vs `name_chinese` — which should ES follow?**  
Chinese has a legacy dual-column problem (`name_zh` written by auto-translate, `name_chinese` read by UI). Spanish has no such problem — `name_es` is the single column for both read and write. Follow the cleaner `name_es` pattern, not the Chinese one.

**Q3: Should ES have a `guide_content_es` structured JSON field?**  
Yes — mirror the `guide_content_zh` pattern exactly. Add a `guide_content_es JSONB` column to `montree_classroom_curriculum_works`, add caching logic in `app/api/montree/works/guide/route.ts`, and populate via the auto-translate pipeline.

**Q4: Do areas have a `name_es` DB column?**  
No, and they don't need one. `AREA_LABELS_ES` in `lib/montree/i18n/area-labels.ts` is hardcoded and complete. The curriculum pathway just needs to call `AREA_LABELS_ES[area_key]` instead of using the DB field. (Same as how Chinese area names work via `AREA_LABELS_ZH`.)

**Q5: Can the AI plan description be generated in Spanish?**  
Yes — the replan pipeline (`lib/montree/reports/replan-child.ts`) already generates `nudge_es` as part of the trilingual JSONB structure. The `game-plan/refresh/route.ts` accepts a `locale` query param and passes it through. The nudge already renders trilingually via `resolveLocalized(gamePlan?.nudge, locale)` in `FocusWorksSection.tsx`. This is working — the issue is only with the static work names, not the AI-generated nudge text.

---

## 8. Fix Priority

| Priority | Item | File(s) | Effort |
|----------|------|---------|--------|
| 🔴 High | Add `spanishName` to Assignment interface + child API + FocusWorksSection render | `components/montree/child/FocusWorksSection.tsx`, `app/api/montree/children/[childId]/route.ts` | Low — ~30 min |
| 🔴 High | Use `AREA_LABELS_ES` for curriculum pathway | `components/montree/child/FocusWorksSection.tsx` | Low — ~15 min |
| 🔴 High | Uncomment `es: '_es'` in `getLocalizedWorkName()` | `lib/montree/i18n/db-helpers.ts` line 23 | Low — 1 line |
| 🔴 High | Add `name_es` to works API SELECT + response | `app/api/montree/works/route.ts` | Low — ~20 min |
| 🟡 Medium | Add `guide_content_es` DB column + caching in guide route | `app/api/montree/works/guide/route.ts` + Supabase migration | Medium — ~2h |
| 🟡 Medium | Add Spanish lookup to Weekly Wrap review | `app/api/montree/reports/weekly-wrap/review/route.ts` | Medium — ~1h |
| 🟡 Medium | Add `MONTESSORI_GLOSSARY_ES` for auto-translate | `lib/montree/auto-translate.ts` | Medium — content work |
| 🟢 Low | `materials_es`, `direct_aims_es`, `indirect_aims_es`, `presentation_steps_es` columns | DB migration + guide route | High — lots of content |

---

## 9. Recommended Implementation Order

**Step 1 (immediate, no DB changes):**
- Uncomment `es: '_es'` in `db-helpers.ts`
- Add `name_es` to works API response
- Add `spanishName` to `Assignment` interface, populate from API, render in `FocusWorksSection`
- Use `AREA_LABELS_ES` for curriculum pathway

This alone will fix Bug 1 and Bug 3 — the most visible issues.

**Step 2 (DB + guide content):**
- `ALTER TABLE montree_classroom_curriculum_works ADD COLUMN guide_content_es JSONB;`
- Add Spanish caching block to `app/api/montree/works/guide/route.ts`
- Run batch translation for all 418 items

**Step 3 (Weekly Wrap + reports):**
- Add `name_es` to Weekly Wrap review SELECT
- Replace `getChineseWorkName()` calls with locale-agnostic `getLocalizedWorkName(work, locale)`

**Step 4 (nice to have):**
- `materials_es`, `direct_aims_es`, `indirect_aims_es`, `presentation_steps_es` columns + population
- `MONTESSORI_GLOSSARY_ES` for offline translation fallback

---

## 10. Key Files Reference

| File | Relevance |
|------|-----------|
| `components/montree/child/FocusWorksSection.tsx` | Plan de Juego render — fix `chineseName` → add `spanishName` |
| `app/api/montree/children/[childId]/route.ts` | Child data API — add `name_es` to focus works response |
| `app/api/montree/works/route.ts` | Works API — add `name_es` to SELECT + response |
| `app/api/montree/works/guide/route.ts` | Quick guide — add `guide_content_es` caching |
| `lib/montree/i18n/area-labels.ts` | `AREA_LABELS_ES` constant — already complete |
| `lib/montree/i18n/db-helpers.ts` | `getLocalizedWorkName()` — uncomment `es: '_es'` on line 23 |
| `lib/montree/auto-translate.ts` | Auto-translate pipeline — supports ES, needs `MONTESSORI_GLOSSARY_ES` |
| `lib/montree/reports/replan-child.ts` | Game plan generation — already generates Spanish nudge/works/direction |
| `app/api/montree/reports/weekly-wrap/review/route.ts` | Weekly Wrap — add `name_es` lookup |
