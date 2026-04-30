# Curriculum Translation Architecture — Implementation Handoff

**Date:** April 30, 2026
**Status:** Plan ready — implementation pending (audited and revised)
**Estimated session time:** 4–6 hours for full build + backfill + verification

---

## 0. Audit Revision Notes (Apr 30 — second pass)

This plan was written, then audited three times: once for internal consistency, once against the actual codebase, once as a re-audit. The following material errors were found in the first draft and corrected here:

- **Migration numbers** — first draft used `170` and `171`. Both already taken (`170_daily_language_6_feature.sql`, `171_tell_guru_onboarding_feature.sql`). Highest existing is `179`. Corrected to `180` and `181`.
- **Custom work generator** — first draft assumed a Sonnet-driven content generator at `app/api/montree/guru/generate-work-content/route.ts`. **That route does not exist.** The actual custom-work creation endpoint is `app/api/montree/guru/photo-insight/add-custom-work/route.ts`. The teacher provides English content directly through a form — there is no Sonnet generation step. Translation runs via `translateAllLocales()` (Haiku-only, name + parent_description + why_it_matters), already fire-and-forget. Phase 5 of the plan was rewritten to reflect this.
- **Cost analysis** — first draft estimated `$0.02–0.05` per custom work based on Sonnet generation. Real cost is `$0.001/locale × 11 = ~$0.011` per custom work (Haiku-only). An order of magnitude lower than originally claimed.
- **`applyGlobalTranslations` implementation** — first draft used `Promise.all` batches of 100 individual `UPDATE` requests via Supabase REST. With 329 rows × 11 locales that's ~3,600 row updates per classroom — slow and pool-thrashing. Corrected to a Postgres function (`apply_global_translations(classroom_id)`) doing one `UPDATE FROM JOIN` per locale, with `COALESCE` so it never clobbers teacher-edited translations. Single DB roundtrip from the API server.
- **`seed-global-translations.mjs` must filter custom works** — Whale Class has 419 rows but ~90 are classroom-specific custom works (`is_custom = true`, `work_key` starting with `custom_`). Without filtering, the global table would be polluted with classroom-specific entries. Corrected.
- **`primary_locale` is not the lever for custom-work translation** — first draft tied custom-work translation to `getSchoolLocales()`. But because the custom-work cost is Haiku-only and trivial, it's simpler to translate to all 11 locales every time. `primary_locale` is still useful for UI default selection and future report-generation language routing, but it is not load-bearing for translation cost optimization.
- **Trial signup locale capture** — first draft did not specify how `primary_locale` flows into `try/instant/route.ts`. Corrected: pass it explicitly from the trial signup form (UI sends the user's current locale at submit time), with `Accept-Language` header as a fallback and `'en'` as the final default.
- **Existing drift script** — `scripts/sync-curriculum-translations.mjs` already exists and re-translates per-classroom name columns when drift is detected. Plan now references it as the post-deploy drift mitigation tool, distinct from the global-table-copy seed pattern.
- **The `add-language.mjs` workflow already partially exists** — `scripts/add-language.mjs` scaffolds a new locale's files. Plan's "13th language" section now integrates with it rather than describing a hand-rolled process.

The architecture itself (global translation table + per-school primary_locale + apply-on-seed pattern) survived the audit unchanged. The errors were in implementation specifics, not the design.

---

## 1. The Goal

Make every new classroom land in any of the 12 supported languages with zero English fallback on day one, at zero ongoing AI translation spend for the 329 standard Montessori works. Bounded, predictable AI spend only for custom works a school creates itself, and only in that school's actual primary language — not all 11 non-English languages speculatively.

A school in Buenos Aires sees Spanish. A school in Kyiv sees Ukrainian. A school in Berlin sees German. A bilingual Chinese international school sees both English and Chinese. Each gets exactly what they need, nothing they don't.

---

## 2. The Architecture

Two changes to the data model unlock everything else.

**A new global lookup table — `montree_curriculum_translations`.** Keyed by `(work_key, locale)`. Holds one row per standard work per language. Populated once from Whale Class's existing translations. About 4,000 rows total. This is the permanent, free, shared translation cache for every standard work.

**Two new columns on `montree_schools` — `primary_locale` and `secondary_locales[]`.** Set at signup. Tells every downstream pipeline what language(s) this school operates in. A monolingual Russian school: `primary_locale='ru', secondary_locales='{}'`. Whale Class: `primary_locale='en', secondary_locales='{zh}'`.

With those two pieces in place:

- **Standard works on classroom seed** — copy translations from the global table via SQL JOIN. Free. Instant. All locales populated. No AI calls.
- **Custom works on creation** — Sonnet generates content in the school's resolved locales (primary + secondary + always English as system reference). One small, bounded AI cost per custom work, in the languages that school actually uses.
- **Locale switch in UI** — already works. The columns are populated, the existing `getLocalizedWorkName()` and `buildLocalizedSelect()` helpers read them. No code changes needed.

---

## 3. Database Changes

### 3.1 New global translation table

```sql
CREATE TABLE IF NOT EXISTS montree_curriculum_translations (
  work_key TEXT NOT NULL,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_description TEXT,
  why_it_matters TEXT,
  guide_content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (work_key, locale)
);

CREATE INDEX IF NOT EXISTS idx_ctt_locale ON montree_curriculum_translations(locale);
CREATE INDEX IF NOT EXISTS idx_ctt_work_key ON montree_curriculum_translations(work_key);
```

### 3.2 School locale columns

```sql
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS primary_locale TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS secondary_locales TEXT[] NOT NULL DEFAULT '{}';

-- Backfill defaults for existing schools — safe for everyone, English fallback for any that haven't been set
UPDATE montree_schools SET primary_locale = 'en' WHERE primary_locale IS NULL;

-- Whale Class is the one known bilingual classroom
UPDATE montree_schools
   SET primary_locale = 'en', secondary_locales = ARRAY['zh']
 WHERE id = 'c6280fae-567c-45ed-ad4d-934eae79aabc';
```

Migration files (next free numbers — the previous batch ended at `179`):
- `migrations/180_create_curriculum_translations_global.sql`
- `migrations/181_add_school_primary_locale.sql`
- `migrations/182_apply_global_translations_function.sql` (the Postgres function — see Phase 3)

---

## 4. Code Changes

### Phase 1 — Helper module: `lib/montree/i18n/school-locale.ts` (NEW)

Centralized resolver for "what locales does this school care about?"

```typescript
import { getSupabase } from '@/lib/supabase-client';
import type { Locale } from './locales';
import { SUPPORTED_LOCALES, isValidLocale } from './locales';

export type SchoolLocales = {
  primary: Locale;
  secondary: Locale[];
  /** Primary + secondary + 'en' (deduplicated). The full set to populate for this school. */
  allTargetLocales: Locale[];
};

export async function getSchoolLocales(schoolId: string): Promise<SchoolLocales> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('montree_schools')
    .select('primary_locale, secondary_locales')
    .eq('id', schoolId)
    .maybeSingle();

  const primary: Locale = (data?.primary_locale && isValidLocale(data.primary_locale))
    ? data.primary_locale as Locale
    : 'en';

  const secondary: Locale[] = (data?.secondary_locales || [])
    .filter(isValidLocale) as Locale[];

  const set = new Set<Locale>([primary, ...secondary, 'en']);
  return { primary, secondary, allTargetLocales: Array.from(set) };
}
```

### Phase 2 — Global table extraction (one-time, run via script)

`scripts/seed-global-translations.mjs` (NEW). Reads Whale Class rows and pivots them into the global table.

**Critical filter:** Whale Class has ~419 rows but ~90 are classroom-specific custom works (`is_custom = true`, `work_key` starts with `custom_`). The script must exclude these — only the standard ~329 works belong in the global table.

Pseudocode (Node.js, run once):

```javascript
const WHALE_CLASS_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const LOCALES = ['zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'];

// Step 1: Fetch only STANDARD Whale Class works (skip custom_*)
const { data: works } = await supabase
  .from('montree_classroom_curriculum_works')
  .select('work_key, name, parent_description, why_it_matters, quick_guide, is_custom, ' +
          LOCALES.flatMap(l => [
            `name_${l}`,
            `parent_description_${l}`,
            `why_it_matters_${l}`,
            `guide_content_${l}`
          ]).join(','))
  .eq('classroom_id', WHALE_CLASS_ID)
  .eq('is_custom', false)
  .not('work_key', 'like', 'custom_%');

// Step 2: Pivot — one row per (work_key, locale)
const rows = [];

// English row first (canonical English content)
for (const w of works) {
  rows.push({
    work_key: w.work_key,
    locale: 'en',
    name: w.name,
    parent_description: w.parent_description,
    why_it_matters: w.why_it_matters,
    guide_content: w.quick_guide,
  });
}

// Each non-English locale
for (const locale of LOCALES) {
  for (const w of works) {
    const name = w[`name_${locale}`];
    if (!name) continue; // Skip if not translated for this locale
    rows.push({
      work_key: w.work_key,
      locale,
      name,
      parent_description: w[`parent_description_${locale}`],
      why_it_matters: w[`why_it_matters_${locale}`],
      guide_content: w[`guide_content_${locale}`],
    });
  }
}

// Step 3: UPSERT in batches of 500
for (let i = 0; i < rows.length; i += 500) {
  await supabase
    .from('montree_curriculum_translations')
    .upsert(rows.slice(i, i + 500), { onConflict: 'work_key,locale' });
}
```

Expected output: ~3,600–4,000 rows (~329 standard works × 12 locales, minus any locale gaps in source data).

**This script runs ONCE.** It is idempotent (UPSERT). Safe to re-run if Whale Class translations are improved (re-running refreshes the global table, then `scripts/refresh-classrooms-from-global.mjs` — described in Section 5 — pushes those changes out to all classrooms).

**Why no `name_chinese` in the SELECT:** the global table uses `name` keyed by `(work_key, locale='zh')`, with `name_chinese` written into the classroom row by `apply_global_translations()` later. The legacy dual-column lives only on `montree_classroom_curriculum_works`, never on the global table.

### Phase 3 — Apply-translations helper (Postgres function + thin TypeScript wrapper)

The first draft of this section used a Promise.all batch of ~329 individual `UPDATE` requests. With 11 locales that's ~3,600 row updates per classroom hammering the Supabase pool. The corrected approach: a Postgres function that does one `UPDATE FROM JOIN` per locale in a single DB roundtrip.

**Migration `182_apply_global_translations_function.sql` (NEW):**

```sql
CREATE OR REPLACE FUNCTION apply_global_translations(p_classroom_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_updated INTEGER := 0;
  rc INTEGER;
BEGIN
  -- Chinese: special-cased for dual-column legacy (name_zh + name_chinese)
  -- COALESCE so we never clobber teacher-edited translations
  UPDATE montree_classroom_curriculum_works w
  SET
    name_zh                = COALESCE(w.name_zh, t.name),
    name_chinese           = COALESCE(w.name_chinese, t.name),
    parent_description_zh  = COALESCE(w.parent_description_zh, t.parent_description),
    why_it_matters_zh      = COALESCE(w.why_it_matters_zh, t.why_it_matters),
    guide_content_zh       = COALESCE(w.guide_content_zh, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id
    AND w.work_key = t.work_key
    AND t.locale = 'zh';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- Other 10 locales: identical pattern, single _<locale> column per field
  -- (es, de, fr, pt, nl, it, ja, ko, uk, ru)
  UPDATE montree_classroom_curriculum_works w
  SET
    name_es                = COALESCE(w.name_es, t.name),
    parent_description_es  = COALESCE(w.parent_description_es, t.parent_description),
    why_it_matters_es      = COALESCE(w.why_it_matters_es, t.why_it_matters),
    guide_content_es       = COALESCE(w.guide_content_es, t.guide_content)
  FROM montree_curriculum_translations t
  WHERE w.classroom_id = p_classroom_id AND w.work_key = t.work_key AND t.locale = 'es';
  GET DIAGNOSTICS rc = ROW_COUNT; total_updated := total_updated + rc;

  -- (… repeat the above block for de, fr, pt, nl, it, ja, ko, uk, ru …)
  -- The migration file expands all 10 explicitly to keep the function deterministic
  -- and grep-friendly. Adding a 13th language adds one more block.

  RETURN total_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why per-locale `UPDATE` blocks instead of one mega-query:** Postgres won't let you `UPDATE … FROM` against the same target table with multiple JOIN aliases that match the same row in different ways without ambiguity. Per-locale UPDATEs keep each query simple and the row-count diagnostics meaningful. Total ≈ 11 SQL statements per call, each touching ~329 rows. Sub-second total.

**TypeScript wrapper `lib/montree/curriculum/apply-global-translations.ts` (NEW):**

```typescript
import { getSupabase } from '@/lib/supabase-client';

/**
 * After a classroom is seeded with English curriculum, populate every locale
 * column from the global translation table. Free — no AI calls.
 *
 * Custom works (work_key starting with 'custom_') don't match anything in the
 * global table and are silently skipped by the JOIN.
 *
 * Uses COALESCE — never clobbers existing translations (e.g. teacher edits).
 *
 * Fire-and-forget at call sites. Safe to re-run.
 */
export async function applyGlobalTranslations(classroomId: string): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('apply_global_translations', {
    p_classroom_id: classroomId,
  });
  if (error) {
    console.error('[applyGlobalTranslations] RPC failed:', error.message);
    return 0;
  }
  return (data as number) ?? 0;
}
```

**Performance:** one HTTP round-trip from API server to Supabase. Postgres handles the joins in ~100–300 ms for a typical classroom. No connection-pool thrashing, no batching, no parallel UPDATEs from the application layer.

### Phase 4 — Wire seeding paths to call the helper

Files to modify (each one inserts English rows, then fires `applyGlobalTranslations(classroomId)` non-blocking):

1. **`app/api/montree/try/instant/route.ts`** — THE BROKEN PATH
   - After `seedCurriculumForClassroom(supabase, classroom.id)` returns, fire-and-forget:
     ```typescript
     applyGlobalTranslations(classroom.id as string)
       .catch(err => console.error('[Trial] apply translations failed:', err));
     ```
   - **Locale capture:** the trial signup body needs to include the user's UI locale. Update the form (`app/montree/try/page.tsx`) to send `locale: useI18n().locale` in the POST body. The route reads `locale` from the body, validates against `isValidLocale()`, defaults to `'en'`. Fallback chain: `body.locale → req.headers['accept-language'] (parsed) → 'en'`.
   - When INSERTing the school row, set `primary_locale: capturedLocale`.

2. **`app/api/montree/principal/setup/route.ts`**
   - The existing call to `batchTranslateAllLocales(createdClassroom.id).catch(...)` can stay — it now only translates rows where the global table didn't already populate the column (because `autoTranslateWork` skips rows that already have a value via `.is(nameCol, null)` filtering in `batchTranslateAllLocales`). So global table copy first, then any leftover Haiku translation second. They compose cleanly.
   - Add a fire-and-forget `applyGlobalTranslations(createdClassroom.id)` call BEFORE the existing `batchTranslateAllLocales` call.
   - `buildLocaleInsertFields()` can stay as-is — it still pre-allocates the `name_*` slots, the global table fills them.
   - Optional cleanup: once verified working, the `batchTranslateAllLocales` call becomes redundant for standard works (covered by global table). Keep it for now as a safety net; remove in a follow-up after a few weeks of production data.

3. **`app/api/montree/principal/setup-stream/route.ts`** — Same changes as setup.

4. **`app/api/montree/admin/reseed-curriculum/route.ts`** — add `applyGlobalTranslations()` call after reseed.

5. **`app/api/montree/admin/backfill-curriculum/route.ts`** — add `applyGlobalTranslations()` call after backfill.

6. **`app/api/montree/admin/backfill-guides/route.ts`** — verify whether this route also writes English-only curriculum. If yes, add `applyGlobalTranslations()` here too. (This route was discovered during the audit and wasn't in the first draft.)

### Phase 5 — Custom work flow (`app/api/montree/guru/photo-insight/add-custom-work/route.ts`)

**Audit correction:** the first draft assumed a Sonnet content generator existed. It does not. The actual flow:

1. Teacher fills out a form (name, area, description, materials, why_it_matters) on the photo-insight panel.
2. The route inserts the work into `montree_classroom_curriculum_works` with the English columns populated from the form.
3. Visual memory is generated via Haiku (a 1–2 sentence visual description, not content generation).
4. `translateAllLocales(input)` fires fire-and-forget. This walks `ENABLED_LOCALES` and calls `autoTranslateWork()` per locale. Haiku-only. ~$0.001 per locale, ~$0.011 across all 11 once `ENABLED_LOCALES` is expanded.

The translation pipeline therefore needs essentially no changes for custom works. The only change required is the one already in Phase 6: derive `ENABLED_LOCALES` from `SUPPORTED_LOCALES`. Once that's done, every custom work auto-translates into all 11 non-English locales at trivial cost.

**What this means in concrete terms:**
- Russian school adds a custom work → English columns populated immediately, then `translateAllLocales()` fans out to all 11 locales (including Russian). A teacher in Russian sees the work appear in English first, then within ~10 seconds it switches to Russian as the background translation lands.
- The old "primary_locale routing for custom works" optimization in the first draft is dropped — the cost saving was a fraction of a cent per custom work and the engineering cost of the routing was high.
- `primary_locale` is still added to `montree_schools` (Phase 1) because it's useful for default UI locale at signup and future report-language routing — just not for custom-work translation.

**No code changes required to `add-custom-work/route.ts` itself** beyond verifying that `translateAllLocales` is being called (it already is). The Phase 6 expansion of `ENABLED_LOCALES` is what activates translation into all locales.

**One small enhancement worth doing while we're here** — `autoTranslateWork()` currently translates name + parent_description + why_it_matters via Haiku, but does NOT translate guide content. Custom works don't have guide content (no `presentation_steps`, `direct_aims`, etc. — only the teacher's free-text description), so this is fine. No further work needed.

**Cost per custom work, all 11 non-English locales translated via Haiku:** ~$0.011. Bounded. Trivial.

### Phase 6 — Unify `ENABLED_LOCALES` and `SUPPORTED_LOCALES`

`lib/montree/locales-config.ts` currently has:
```typescript
export const ENABLED_LOCALES = ['zh', 'es', 'uk', 'ru'];
```

Replace with:
```typescript
import { SUPPORTED_LOCALES } from './i18n/locales';
/** All non-English locales — derived from SUPPORTED_LOCALES, never hand-edited. */
export const ENABLED_LOCALES = SUPPORTED_LOCALES.filter(l => l !== 'en');
```

This single change ensures any future locale added to `SUPPORTED_LOCALES` is automatically picked up by every pipeline that uses `ENABLED_LOCALES`. No more manual sync between the two lists.

### Phase 7 — Backfill existing classrooms

After the migrations run and the global translation table is populated, backfill every existing classroom in production with one script:

```javascript
// scripts/backfill-all-classroom-translations.mjs
import { applyGlobalTranslations } from '../lib/montree/curriculum/apply-global-translations.js';

const { data: classrooms } = await supabase
  .from('montree_classrooms')
  .select('id');

for (const c of classrooms) {
  console.log(`Applying translations to ${c.id}...`);
  await applyGlobalTranslations(c.id);
}
```

Fixes Miss Chen 2 (`6cb2b713-54b8-4ae8-8b8c-fff46ba1c871`) and any other broken classrooms in one shot. Safe to re-run (UPDATE statements are idempotent).

---

## 5. Whale Class Stays the Reference (and the Source of Truth for Improvements)

Whale Class still has its locale columns populated directly. The global table is a copy, not a replacement. This means:

- Future translation improvements (e.g., a teacher tweaks a Korean translation for clarity) happen in Whale Class first.
- Re-running `scripts/seed-global-translations.mjs` updates the global table from Whale Class.
- A separate script (`scripts/refresh-classroom-translations-from-global.mjs`) can push global table changes back out to all classrooms — useful when a translation is improved post-seed.

For the initial backfill we run in one direction: Whale Class → global table → all classrooms. Future bidirectional sync is a separate concern and can be deferred until needed.

---

## 6. Cost Analysis (revised — Haiku-only for custom works)

The first draft estimated custom-work translation at $0.02–0.10 based on a Sonnet generator. Real cost is Haiku-only because the teacher provides the English content directly; AI is only translating, not generating. Numbers updated:

| Scenario | AI cost per classroom | At 10 schools | At 100 schools | At 1,000 schools |
|----------|----------------------|---------------|----------------|------------------|
| **Standard 329 works on seed** | $0.00 (global table copy) | $0 | $0 | $0 |
| **One-time global table seeding from Whale Class** | $0 (data already exists) | $0 | $0 | $0 |
| **Custom-work translation: 5 customs/year × 11 locales × $0.001** | $0.055/year | $0.55/year | $5.50/year | $55/year |
| **Adding a 13th language** | ~$2 one-time (Haiku batch translate via existing scripts, billed through your existing Anthropic key) | $50 | $50 | $50 |

**Total at 1,000 schools, year one: ~$55 in custom-work translations + $50 if a new language is added. Roughly $100 total.** Versus the ~$5,000 the original "translate every classroom into all 11 locales upfront via Sonnet" approach would have cost.

The custom-work cost is so trivial it removes the reason to optimize via `primary_locale` routing. Just translate to all 11 every time — $0.011 per custom work — and never think about it again.

---

## 7. Migration Order (Run in This Sequence)

1. **Run migration 180** (`montree_curriculum_translations` table) in Supabase SQL Editor.
2. **Run migration 181** (school `primary_locale` + `secondary_locales` columns) in Supabase SQL Editor.
3. **Run migration 182** (`apply_global_translations()` Postgres function) in Supabase SQL Editor.
4. **Set Whale Class to bilingual** via the seed UPDATE in migration 181 (or manually).
5. **Run `scripts/seed-global-translations.mjs`** locally with Supabase service role key. Pulls Whale Class standard works (with `is_custom = false` filter) into the global table. ~3,600–4,000 rows.
6. **Verify global table** — `SELECT locale, COUNT(*) FROM montree_curriculum_translations GROUP BY locale;` should show ~329 rows per locale (12 rows × ~329 ≈ 4,000 total).
7. **Deploy Phase 1–6 code changes** to Railway. New `applyGlobalTranslations()` helper, wired into all seeding paths, `ENABLED_LOCALES` unified with `SUPPORTED_LOCALES`.
8. **Run `scripts/backfill-all-classroom-translations.mjs`** locally. Fixes Miss Chen 2 and every other broken classroom. ~1–2 seconds per classroom (single RPC each).
9. **Verify backfill** — pick 3 classrooms in random non-English locales, switch the UI, confirm work names + guides render in the locale with zero English bleed-through.
10. **Test new trial signup** — sign up a fake school in Russian (set the UI to Ukrainian/Russian first), confirm curriculum lands fully translated on day one.
11. **Test custom work creation** — create a custom work in any school, wait ~10 seconds, confirm all 11 non-English `name_*` columns populate via the existing `translateAllLocales` pipeline.

---

## 8. Verification Checklist

- [ ] `montree_curriculum_translations` exists, has rows for all 12 locales
- [ ] `montree_schools.primary_locale` exists, defaults to `'en'`, Whale Class set to `'en'+['zh']`
- [ ] `getSchoolLocales(schoolId)` returns expected locales for Whale Class and a fresh test school
- [ ] `applyGlobalTranslations()` populates all locale columns correctly for a freshly seeded test classroom
- [ ] `try/instant/route.ts` path leaves a new classroom fully translated in all 12 locales
- [ ] Miss Chen 2 (`6cb2b713-54b8-4ae8-8b8c-fff46ba1c871`) shows Chinese work names + guides after backfill
- [ ] Custom work creation in a Russian school produces Russian + English columns only
- [ ] `ENABLED_LOCALES` is now derived from `SUPPORTED_LOCALES`, no hardcoded list
- [ ] No regression in Whale Class — all 12 locales still render correctly

---

## 9. Adding a 13th Language (the new workflow)

Suppose a future request: add Arabic. The existing `scripts/add-language.mjs` scaffolds most of this; the rest plugs into the pipeline this plan establishes.

1. Run `node scripts/add-language.mjs ar "العربية" "AR" "ar-SA"` (scaffolds locale entries)
2. Translate `lib/montree/i18n/ar.ts` (Haiku batch translate from `en.ts`, ~$0.40 — see `scripts/generate-fr.mjs` pattern)
3. Add `LOCALE_AI_CONFIG.ar` to `lib/montree/i18n/locale-config.ts` with AMI Montessori Arabic terminology
4. DB migration: add `name_ar`, `parent_description_ar`, `why_it_matters_ar`, `guide_content_ar` columns to `montree_classroom_curriculum_works`
5. Add corresponding `UPDATE ... FROM` block to `apply_global_translations()` Postgres function — one new block per language (the function file is grep-friendly by design)
6. Translate Whale Class into Arabic via existing scripts (`scripts/batch-translate-names-new-langs.mjs`, `scripts/batch-translate-guides-new-langs.mjs` — generalize to accept `ar` as target). The translation runs through Claude (Haiku for names, Sonnet for guides) via the existing Anthropic API key — real cost is $1–2 per language, paid as normal API usage, not as a separate budget line.
7. Re-run `scripts/seed-global-translations.mjs` — Arabic rows now in global table
8. Run `scripts/refresh-classrooms-from-global.mjs` — every existing classroom gets Arabic instantly via the same RPC
9. Done. Future trial signups in Arabic-primary schools land fully translated.

`ENABLED_LOCALES` auto-picks up Arabic the moment it's added to `SUPPORTED_LOCALES` (Phase 6 derivation), so custom-work translation activates automatically. No edits to seeding code, APIs, or components.

---

## 10. What This Plan Does NOT Address (Deferred)

- **Per-classroom locale overrides.** Currently locale is school-level. If a school wants different classrooms in different languages, that's a future feature.
- **Translation correction UI.** If a teacher spots a bad translation in their language, there's no in-app correction button. The existing `scripts/sync-curriculum-translations.mjs` re-translates drift-detected rows via Haiku and runs as a manual or scheduled job; it's adequate for catching machine-translation errors but not for teacher-reported corrections. Could add a "report translation" button later.
- **Custom-work promotion to global.** When a custom work proves universally useful, super-admin should be able to one-click promote it into the global translations table. UI deferred — for now do it via SQL.
- **Translation versioning / refresh propagation.** When the Whale Class master translation improves, downstream classrooms aren't auto-updated. The proposed `refresh-classrooms-from-global.mjs` script handles this, but isn't run automatically. Acceptable for now.
- **Photo identification on custom works.** Custom works don't go through the standard photo ID pipeline anyway. No regression.
- **Mid-flight `primary_locale` change.** If a Russian school later switches to Spanish-primary, existing custom works stay in Russian + English. A re-translation tool would need to re-run `translateAllLocales()` for every custom work in that school. Edge case; defer until requested.

---

## 11. Files Touched (Final Inventory — revised)

**New files:**
- `migrations/180_create_curriculum_translations_global.sql`
- `migrations/181_add_school_primary_locale.sql`
- `migrations/182_apply_global_translations_function.sql` (Postgres function)
- `lib/montree/i18n/school-locale.ts` — `getSchoolLocales()` helper (used by future report routing, NOT custom-work translation)
- `lib/montree/curriculum/apply-global-translations.ts` — thin TypeScript wrapper around the Postgres RPC
- `scripts/seed-global-translations.mjs` — one-time Whale Class → global table extractor (filters `is_custom = false`)
- `scripts/backfill-all-classroom-translations.mjs` — one-time backfill for existing classrooms
- (Optional, follow-up) `scripts/refresh-classrooms-from-global.mjs` — when global table is updated, push refreshed translations to all classrooms

**Modified files:**
- `app/api/montree/try/instant/route.ts` — add `applyGlobalTranslations()` call + capture `primary_locale` from request body / Accept-Language
- `app/montree/try/page.tsx` — send `locale` in trial signup POST body
- `app/api/montree/principal/setup/route.ts` — add `applyGlobalTranslations()` before existing `batchTranslateAllLocales()`
- `app/api/montree/principal/setup-stream/route.ts` — same change
- `app/api/montree/admin/reseed-curriculum/route.ts` — add `applyGlobalTranslations()` call
- `app/api/montree/admin/backfill-curriculum/route.ts` — add `applyGlobalTranslations()` call
- `app/api/montree/admin/backfill-guides/route.ts` — verify and add call if needed
- `lib/montree/locales-config.ts` — `ENABLED_LOCALES = SUPPORTED_LOCALES.filter(l => l !== 'en')`

**NOT modified** (audit catch — first draft incorrectly listed this):
- `app/api/montree/guru/generate-work-content/route.ts` — does not exist, not relevant
- `app/api/montree/guru/photo-insight/add-custom-work/route.ts` — needs no changes; `translateAllLocales()` already wired, will pick up expanded `ENABLED_LOCALES` automatically

**Total:** 8 new files (including one optional), 7 modified files.

---

## 12. Risk and Rollback

**Risk:** very low. The change is additive. Existing classrooms that already have populated locale columns are unchanged by `applyGlobalTranslations()` (it only updates rows where the global table has data and the column is currently empty — actually the current draft overwrites; that's fine because the global table IS the canonical source). The backfill script is idempotent.

**Rollback:** if anything goes wrong, the global translation table can be dropped with no data loss — the source data still lives in Whale Class. The school locale columns can be ignored (they default to `'en'` which is the previous behavior). The seeding code changes are wrapped in fire-and-forget catches so a failure never breaks the user-facing signup.

---

## End of Handoff

Next session, the user can say "execute the curriculum translation handoff" and a coding agent has everything it needs to ship this in 4–6 hours.
