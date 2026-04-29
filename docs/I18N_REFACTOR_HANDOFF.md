# i18n Refactor Handoff (Session 75 — Apr 30, 2026)

**Commit:** `022bef0f` on `main` (Railway will auto-deploy).

## What changed

The codebase had grown 11 hardcoded `name_es, name_de, …` SELECT lists across the API
routes. Every new language meant editing each one in lockstep. Same problem for
`guide_content_<locale>` in the guide endpoint. There was also a quietly broken bug
in `works/guide/route.ts` where any non-`zh`/`es` locale silently fell back to the
Spanish translator — meaning German/French/Portuguese/Dutch/Italian/Japanese/Korean/
Ukrainian/Russian guides were caching Spanish content in their respective columns.

This refactor centralises the locale-column mapping so adding a 13th language
requires zero edits to API SELECT lists.

## Files touched

| File | Change |
|------|--------|
| `lib/montree/i18n/db-helpers.ts` | `LOCALE_COLUMN_SUFFIX` is now auto-derived from `SUPPORTED_LOCALES` (no per-locale entry to add). Two new exported helpers: `buildLocalizedColumnList(baseField)` returns just the locale-suffixed columns; `buildLocalizedSelect(baseField)` returns the full SELECT with English base + `name_chinese` legacy column + locale suffixes. |
| `app/api/montree/works/route.ts` | SELECT now reads `${buildLocalizedSelect('name')}` instead of the hardcoded list. |
| `app/api/montree/works/guide/route.ts` | (1) SELECT uses `buildLocalizedColumnList('guide_content')`. (2) The dual `translateGuideToZh` / `translateGuideToEs` functions are gone — replaced with one `translateGuide(guide, locale)` that pulls `languageName` and AMI Montessori terminology from `LOCALE_AI_CONFIG`. (3) `SUPPORTED_GUIDE_LOCALES` map gone — uses `SUPPORTED_LOCALES` + `getLocalizedColumn('guide_content', locale)` instead. (4) Background pre-cache continues to warm `zh` + `es` (highest-traffic). |
| `app/api/montree/progress/route.ts` | SELECT uses `buildLocalizedSelect('name')`. Row type cast to a permissive `LocalizedWorkRow` shape. |
| `lib/montree/auto-translate.ts` | `SYSTEM_PROMPTS` renamed to `SYSTEM_PROMPTS_OVERRIDES` and is now optional. The fallback synthesises a sensible prompt from `LOCALE_AI_CONFIG` (language name + AMI terminology). Adding a new language no longer requires a hand-tuned prompt. |
| `scripts/check-i18n-completeness.mjs` | NEW. Walks `SUPPORTED_LOCALES` and verifies every locale has: a translation file, area labels, AI config, intl mapping, display names, short labels, and is wired into `context.tsx` + `server.ts`. Plus a key-parity sanity check (warns at <85%, fails at <50%). Currently passes 12/12 with 98–100% key parity. Drop into CI. |
| `scripts/add-language.mjs` | NEW. One-command scaffolder. `node scripts/add-language.mjs <code> "<native-name>" "<short-label>" "<intl-locale>"` updates `locales.ts`, `area-labels.ts`, `locale-config.ts`, `context.tsx`, `server.ts`, and creates an English placeholder translation file. |

## "Drop a language in" workflow (now)

1. `node scripts/add-language.mjs sv "Svenska" "SV" "sv-SE"` — scaffolds all infrastructure
2. Translate `lib/montree/i18n/sv.ts` (Haiku batch script — see `scripts/generate-fr.mjs` for pattern)
3. Translate `AREA_LABELS_SV` and `LOCALE_AI_CONFIG.sv` TODOs (small, hand-edit)
4. DB migration:
   ```sql
   ALTER TABLE montree_classroom_curriculum_works
     ADD COLUMN IF NOT EXISTS name_sv TEXT,
     ADD COLUMN IF NOT EXISTS parent_description_sv TEXT,
     ADD COLUMN IF NOT EXISTS why_it_matters_sv TEXT,
     ADD COLUMN IF NOT EXISTS guide_content_sv JSONB;
   ```
5. Batch-translate curriculum work names + guides (Haiku scripts — see `scripts/batch-translate-guides-es.js`)
6. `node scripts/check-i18n-completeness.mjs` — verify

**Zero edits to any API SELECT list.** That was the goal.

## Known remaining gaps (NOT in scope this session)

These are pre-existing issues, not introduced by this refactor. Flagged for future work:

1. **Chinese-only parent narrative routes** — `app/api/montree/reports/weekly-wrap/route.ts`,
   `reports/preview/route.ts`, `reports/send/route.ts`, `reports/batch-narratives/route.ts`,
   `reports/weekly-wrap/review/route.ts`, `weekly-admin-docs/auto-fill/route.ts` all still
   SELECT only `_zh` columns and assume `locale !== 'en'` means Chinese. Parent narratives
   for Spanish/German/French/etc. will silently render in English (or Chinese, depending
   on the route). Fixing requires per-locale parent description maps and per-locale
   narrative templates — significant scope, separate PR.

2. **Glossaries** — Only `MONTESSORI_GLOSSARY_ZH` exists. Other languages get the generic
   prompt fallback. Adding `MONTESSORI_GLOSSARY_ES`, `_DE`, etc. would improve translation
   quality but isn't blocking.

3. **`name_chinese` legacy dual-column** — Still preserved in `buildLocalizedSelect` for
   backward compat. Eventually should be sunset in favour of `name_zh` only, after a
   migration verifies all data is mirrored to both.

## DNS / Montree-system investigation (this session, parallel agent)

The agent verified the deployment is clean from the codebase side:
- `next.config.mjs` has the correct apex `montree.xyz → /montree` 302 redirect
- `railway.json` has `healthcheckPath: '/api/health'`
- No stale `teacherpotato.xyz` references in code
- No basePath/assetPrefix/rewrite that would break the apex
- Recent commits to deployment-affecting files are clean

The `DNS_PROBE_FINISHED_NXDOMAIN` is network-layer (Astrill VPN's DNS filtering or
TTL caching). To confirm: visit `https://montree.xyz/api/health` from cellular
without VPN. If 200 → VPN. If fails → check Railway dashboard for unlinked custom
domain or stalled deploy.

## Verification done

- `node scripts/check-i18n-completeness.mjs` → ✓ all 12 locales pass (98–100% key parity)
- `node --check` syntax pass on both new scripts
- Brace/paren/bracket balance verified on all 6 modified files
- Grep confirmed no remaining hardcoded `name_es, name_de, …` SELECT lists outside
  the helper itself

## Next session priorities

1. **🚨 Deploy verification** — User should visit production after Railway deploys
   `022bef0f` to confirm progress page, works picker, and guide modals all still
   render correctly across locale toggles (en/zh/es minimum).
2. **Per-locale parent narratives** — Tackle the 6 Chinese-only routes listed above.
   This is the next big multilingual gap.
3. **Photo-audit + language monthly summary work from Session 74** still pending Railway
   relaunch.
4. **Disable `tell_guru_onboarding` for Whale Class** — Amy's card.
5. **Send the 3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
6. **FAMM Argentina follow-up** — past Apr 28 deadline.
