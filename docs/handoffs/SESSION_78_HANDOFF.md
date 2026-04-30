# Session 78 — Curriculum Translation Library + Apply-On-Seed Pipeline + Frontend Locale Fix

**Date:** April 30, 2026
**Outcome:** ✅ Production-deployed end-to-end. Verified working live in Spanish.
**Commits:** `37cd5fa4`, `e5b50539`

---

## 1. The Problem (carried in from Session 77)

Schools were signing up in their language but the curriculum was English-only. The dashboard UI translated correctly (12 locales, all 100% UI key parity per Session 77) but the classroom curriculum data — work names, parent descriptions, quick guides — only had English populated. New schools via the trial signup path got zero translations. Existing classrooms (Miss Chen 2 was the canonical example) had been seeded English-only and never received localized work names.

The root architectural gap: every classroom has its own copy of the ~329 standard Montessori works in `montree_classroom_curriculum_works`, with translations stored as parallel locale columns (`name_zh`, `name_es`, `name_de`, …). Whale Class had every locale fully translated (~$30+ of paid AI translation already sunk in) but those translations were **trapped in one classroom's rows** — no other school could read them. The trial-signup seeding path never called any translation pipeline. The principal-setup paths only translated 4 of 11 non-English locales (`ENABLED_LOCALES = ['zh', 'es', 'uk', 'ru']` while `SUPPORTED_LOCALES` had 12).

## 2. The Fix (architecture)

A global translation library + an apply-on-seed pipeline.

- **`montree_curriculum_translations`** (new table) — one row per `(work_key, locale)`. Populated once from Whale Class. ~3,948 rows total. The shared library every classroom reads from at seed time.
- **`apply_global_translations(classroom_id)`** (new Postgres function) — copies translations from the global library into a classroom's locale columns via per-locale `UPDATE … FROM JOIN`. COALESCE-safe so it never clobbers a teacher edit. One DB roundtrip per call.
- **`primary_locale` + `secondary_locales[]`** (new columns on `montree_schools`) — captures what language(s) a school operates in. Set at signup. Used for UI default and future report-language routing. Not load-bearing for custom-work translation (that fans out to all 11 via expanded `ENABLED_LOCALES` at ~$0.011/work).
- **`ENABLED_LOCALES` auto-derived from `SUPPORTED_LOCALES`** — adding a 13th language no longer requires touching `locales-config.ts`. Dropping a locale into `SUPPORTED_LOCALES` automatically wires it into every translation pipeline.

Full architectural plan with audit trail lives at `docs/CURRICULUM_TRANSLATION_HANDOFF.md`.

## 3. What Shipped (commits + files)

### Commit `37cd5fa4` — Pipeline build (16 files, +1,296 lines)

**New SQL migrations:**
- `migrations/180_create_curriculum_translations_global.sql` — global translation library table + auto-update trigger
- `migrations/181_add_school_primary_locale.sql` — `primary_locale` + `secondary_locales[]` on `montree_schools`, CHECK constraint, Whale Class set bilingual `en+zh`
- `migrations/182_apply_global_translations_function.sql` — Postgres function with 11 per-locale `UPDATE FROM JOIN` blocks, COALESCE-safe, `SECURITY DEFINER`

**New TypeScript:**
- `lib/montree/curriculum/apply-global-translations.ts` — thin RPC wrapper, fire-and-forget pattern
- `lib/montree/i18n/school-locale.ts` — `getSchoolLocales()` resolver (scaffolded for future report-routing use; not consumed in this session)

**New scripts:**
- `scripts/seed-global-translations.mjs` — one-time Whale Class → global table extractor. Filters `is_custom = false` AND `work_key NOT LIKE 'custom_%'`. Idempotent UPSERT.
- `scripts/backfill-all-classroom-translations.mjs` — runs `apply_global_translations()` RPC against every existing classroom. Supports `--dry-run` and single-classroom UUID mode.

**Modified:**
- `lib/montree/locales-config.ts` — `ENABLED_LOCALES` now `SUPPORTED_LOCALES.filter(l => l !== DEFAULT_LOCALE)`. Was hand-edited list of 4, now auto-derived to 11.
- `app/api/montree/try/instant/route.ts` — new `resolvePrimaryLocale(req, body)` helper (body field → Accept-Language → 'en'). Sets `school.primary_locale` on INSERT. Fires `applyGlobalTranslations(classroom.id)` non-blocking after curriculum seed succeeds.
- `app/montree/try/page.tsx` — sends `locale: useI18n().locale` in the trial signup POST body.
- `app/api/montree/principal/setup/route.ts` — calls `applyGlobalTranslations()` BEFORE the existing `batchTranslateAllLocales()` (which becomes a safety net for any locale gaps in the global table).
- `app/api/montree/principal/setup-stream/route.ts` — same change.
- `app/api/montree/admin/reseed-curriculum/route.ts` — calls `applyGlobalTranslations()` after the reseed completes.
- `app/api/montree/admin/backfill-curriculum/route.ts` — calls `applyGlobalTranslations()` on all 3 code paths (single classroom, school-wide, all-school).
- `app/api/montree/admin/backfill-guides/route.ts` — calls `applyGlobalTranslations()` after guide content updates (catches the case where translated columns were empty before backfill).

**Documentation:**
- `docs/CURRICULUM_TRANSLATION_HANDOFF.md` — the architectural plan with three-pass audit trail (internal consistency → vs actual code → re-audit). Includes "adding a 13th language" workflow, cost analysis at 10/100/1,000 schools, deferred items.

### Commit `e5b50539` — Frontend locale fix (1 file, +4 / −3 lines)

After the pipeline was deployed and all 8 classrooms were backfilled, Miss Chen 2 still displayed English Cylinder Block names with the Spanish UI. DB query confirmed `name_es` was correctly populated. Root cause: `components/montree/curriculum/CurriculumWorkList.tsx` hardcoded `locale === 'zh' ? work.name_chinese : work.name` — three places. Fixed to use `getLocalizedWorkName(work, locale)` and `getLocalizedField(work, field, locale)` from `db-helpers.ts`. After Railway redeploy + hard refresh, Spanish work names render correctly.

## 4. What Was Deployed Live (this session, in order)

1. ✅ **Migration 180** in Supabase SQL Editor — global translation table created.
2. ✅ **Migration 181** in Supabase SQL Editor — school locale columns added. Whale Class set to `en + ['zh']`.
3. ✅ **Manual updates** to two existing schools' `primary_locale`:
   - `1b463b14-5736-4865-9175-90e2d989ca53` (Школа Монтессорі / Tamі's Ukrainian school) → `uk`
   - `de76832d-82c2-43fd-8d88-94722838aa77` (Chen school) → `de`
4. ✅ **Migration 182** in Supabase SQL Editor — `apply_global_translations()` function created.
5. ✅ **Bonus column-add ALTER TABLE** in Supabase SQL Editor — added 36 missing locale columns on `montree_classroom_curriculum_works`. The 9 newer locales (de/fr/pt/nl/it/ja/ko/uk/ru) had `name_*` and `guide_content_*` columns from prior sessions but were missing `parent_description_*` and `why_it_matters_*`. SQL ran idempotently (`ADD COLUMN IF NOT EXISTS`). Without this, the function would error on the first `parent_description_de` reference.
6. ✅ **`scripts/seed-global-translations.mjs`** — extracted 329 standard works × 12 locales from Whale Class. Filtered out 90 custom works correctly. Upserted **3,948 rows** into `montree_curriculum_translations`.
7. ✅ **`scripts/backfill-all-classroom-translations.mjs`** — applied global translations to all 8 production classrooms. **26,983 cells updated** across:
   - Whale Class: 3,619 cells (filling any gaps; existing translations preserved by COALESCE)
   - 6× "My Classroom": 3,619 cells each
   - Blue Jay: 1,650 cells (had partial translations already; COALESCE preserved)
8. ✅ **Code deployed** to Railway via auto-deploy on commit `37cd5fa4`.
9. ✅ **Hot fix deployed** to Railway via auto-deploy on commit `e5b50539`.
10. ✅ **Live verification** — User confirmed Miss Chen 2 curriculum page now displays Spanish work names ("Bloque de Cilindros 1" etc.) when ES toggle is selected.

## 5. Production State After Session 78

- **`montree_curriculum_translations`**: 3,948 rows. 12 locales × 329 standard works. Source of truth for new classroom seeding.
- **`montree_schools.primary_locale`** populated for every school. Whale Class (`en+zh`), Tamі's school (`uk`), Chen school (`de`) explicitly set; others default to `en`.
- **All 8 production classrooms** have every locale column populated for every standard work.
- **`ENABLED_LOCALES`** is now `['zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru']` — was `['zh', 'es', 'uk', 'ru']`. Custom works now auto-translate into all 11 non-English locales at ~$0.011/work via Haiku.
- **Trial signup** now captures the user's UI locale at signup and writes it to `school.primary_locale`.

## 6. Architectural Note for Future Sessions — TYPE B Reads Need Sweeping

The Session 68 multilingual audit classified DB-column-read ternaries (`locale === 'zh' ? work.x_zh : work.x`) as **TYPE B — leave alone**. That was correct when only Chinese existed as a non-English locale. With 11 non-English locales, every TYPE B read leaves English visible for 10 of those locales.

Confirmed examples found in this session:
- `components/montree/curriculum/CurriculumWorkList.tsx` — fixed in `e5b50539`
- The same component still has hardcoded `quick_guide_zh`, `direct_aims_zh`, `indirect_aims_zh`, `materials_zh`, `control_of_error_zh` — these are array/text fields where the translation pipeline doesn't yet cover non-Chinese locales (separate work item).

**Likely candidates for the same bug** (not investigated yet):
- `components/montree/child/FocusWorksSection.tsx` (focus list display)
- `components/montree/photo-audit/ThisIsSheet.tsx` (photo audit modal)
- `components/montree/curriculum/EditWorkModal.tsx`
- `components/montree/super-admin/*` (super admin curriculum browser)
- Game plan card, weekly wrap parent narratives, anywhere a work name renders

**The fix pattern is mechanical:**
1. `import { getLocalizedWorkName, getLocalizedField } from '@/lib/montree/i18n/db-helpers';`
2. Replace `locale === 'zh' && work.name_chinese ? work.name_chinese : work.name` → `getLocalizedWorkName(work, locale)`
3. Replace `locale === 'zh' && work.X_zh ? work.X_zh : work.X` → `getLocalizedField(work, 'X', locale)`

A targeted sweep grep would be: `grep -rn "locale === 'zh'" components/ app/` and triage TYPE B reads case-by-case.

## 7. What's Still Not Translated for Non-Chinese Locales (deferred)

Even after this session, the following fields display English when a teacher is in any non-Chinese, non-Spanish locale (or in any locale for the array fields):

| Field | Current state | Fix scope |
|------|---------------|-----------|
| `quick_guide` (inline on the curriculum row) | Only `quick_guide_zh` exists; no `quick_guide_<locale>` columns. The full quick guide is translated on-demand into the `guide_content_<locale>` JSONB field via the guide modal API, but the inline preview text renders the un-suffixed English. | Replace inline preview to read from `guide_content_<locale>.summary` or pre-fill `quick_guide_<locale>` columns. |
| `direct_aims` (array) | Only `direct_aims_zh` exists for Chinese. | Need to add `direct_aims_<locale>` JSONB columns + extend `autoTranslateWork()` to translate arrays. |
| `indirect_aims` (array) | Same pattern as above. | Same. |
| `materials` (array) | Same. | Same. |
| `control_of_error` (text) | `control_of_error_zh` exists; other locales missing. | Add `control_of_error_<locale>` columns + extend translator. |

These are not blocking — the most visible field (work name) is now correct, and parent descriptions / why-it-matters work in all locales.

## 8. Cost Analysis (revised, post-deployment)

| Item | Real cost | Note |
|------|-----------|------|
| One-time Whale Class extraction | $0 | Translations already paid for in prior sessions; this session just lifted them into the global table |
| Per new classroom seeding | $0 | Global table copy, no AI calls |
| Per custom work created | ~$0.011 | Haiku, fans out to all 11 non-English locales (was 4) |
| Adding a 13th language | ~$1–2 | Existing batch translate scripts call Haiku/Sonnet through the Anthropic key |

At 1,000 schools/year with 5 custom works each: ~$55/year. Versus the ~$5,000/year the original "translate every classroom into all 11 locales upfront via Sonnet" approach would have cost.

## 9. Verification Status

- ✅ Migrations 180/181/182 ran clean.
- ✅ Column-add ALTER TABLE ran clean (idempotent).
- ✅ `apply_global_translations()` function returns row counts as expected.
- ✅ Global translation table populated to 3,948 rows.
- ✅ All 8 production classrooms backfilled.
- ✅ Pre-commit hook validated all 12 locales at 100% UI key parity (3,738 keys each) — confirms the `en.ts`/`zh.ts`/etc files weren't touched and translation drift defence stays intact.
- ✅ Live production check on Miss Chen 2 in Spanish — work names display correctly.

## 10. Next Session Priorities

1. **🚨 TYPE B sweep** — find every `locale === 'zh' ? work.x_zh : work.x` pattern in components and replace with `getLocalizedField()` / `getLocalizedWorkName()`. Highest-priority candidates: `FocusWorksSection`, `ThisIsSheet`, `EditWorkModal`, super-admin curriculum browser, game plan card. Mechanical work but high volume; could be done in a single focused session with grep-driven discovery.
2. **Translate arrays + control_of_error** — add `direct_aims_<locale>`, `indirect_aims_<locale>`, `materials_<locale>`, `control_of_error_<locale>` columns. Extend `autoTranslateWork()` to translate JSON arrays. Re-run batch translate against Whale Class to populate. Re-extract into global table. Backfill all classrooms.
3. **Add a 13th language test** — pick one (e.g. Hindi or Vietnamese) and run through the documented "adding a language" workflow end-to-end. Validates that the data-only path actually works.
4. **Send the 3 hot lead Gmail drafts** (carry-over from Session 77) — Copenhagen, Paint Pots UK, Ardtona House UK.
5. **FAMM Argentina follow-up** (carry-over) — past Apr 28 deadline.
6. **Welcome Тамі in Ukrainian** (carry-over) — first organic Ukrainian signup.
7. **Resend domain verification** (carry-over) — `montree.xyz` in Resend so demo-request confirmations actually deliver.
8. **Optional: Verify locale-aware seed in trial signup** — open private window, set UI to Russian, sign up a fake school via `/montree/try`, confirm the new classroom has all locale columns populated via `applyGlobalTranslations()` fire-and-forget.

## 11. Key Files Modified This Session

```
migrations/180_create_curriculum_translations_global.sql       (NEW)
migrations/181_add_school_primary_locale.sql                   (NEW)
migrations/182_apply_global_translations_function.sql          (NEW)
lib/montree/curriculum/apply-global-translations.ts            (NEW)
lib/montree/i18n/school-locale.ts                              (NEW)
scripts/seed-global-translations.mjs                           (NEW)
scripts/backfill-all-classroom-translations.mjs                (NEW)
docs/CURRICULUM_TRANSLATION_HANDOFF.md                         (NEW — architectural plan)
lib/montree/locales-config.ts                                  (modified — ENABLED_LOCALES auto-derived)
app/api/montree/try/instant/route.ts                           (modified — locale capture + apply)
app/montree/try/page.tsx                                       (modified — sends locale in body)
app/api/montree/principal/setup/route.ts                       (modified — apply call)
app/api/montree/principal/setup-stream/route.ts                (modified — apply call)
app/api/montree/admin/reseed-curriculum/route.ts               (modified — apply call)
app/api/montree/admin/backfill-curriculum/route.ts             (modified — apply call)
app/api/montree/admin/backfill-guides/route.ts                 (modified — apply call)
components/montree/curriculum/CurriculumWorkList.tsx           (modified — locale-aware helpers)
```

## End of Handoff

Pipeline is live. The translation library system is the foundation; future locale work composes on top of it.
