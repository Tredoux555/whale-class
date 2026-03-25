# Handoff: Chinese Locale Support for Guru — Mar 23, 2026

## Summary

Full Chinese language support for the Guru AI advisor. When a teacher switches to Chinese, the Guru now: shows only Chinese conversation history (plus pre-migration universal rows), saves new interactions with locale tag, displays Chinese work names and translated area names on Smart Capture results, and avoids duplicate Sonnet photo analysis when switching languages.

## Architecture Decision: Locale as Presentation Layer

Locale filtering is ONLY a presentation concern — what the user sees. The following systems remain language-blind:
- Brain learning (cross-family wisdom)
- Pattern learning (success rates)
- Rate limiting (daily message counts)
- Billing (prompt usage tracking)

This prevents: splitting into two weak brains, pools too small for confidence thresholds, and rate limit bypass via language switching.

## Migration 146

```sql
ALTER TABLE montree_guru_interactions ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_guru_interactions_locale
  ON montree_guru_interactions (child_id, locale, asked_at DESC);
```

**DEFAULT NULL** — existing rows are "universal" (visible to all locales via `.or('locale.eq.${locale},locale.is.null')` filter). New interactions explicitly set `'en'` or `'zh'`.

**Full index (no WHERE clause)** — includes NULL rows so the backward-compat `.or()` filter can use the index for both the locale match AND the NULL match.

## 8 Fixes

### Fix 1 — Migration (NEW file)
`migrations/146_guru_locale.sql` — locale column + index.

### Fix 2 — POST Locale Validation
`app/api/montree/guru/route.ts` line 111 — Validates locale from request body against `['en', 'zh']` whitelist, defaults to `'en'`. Prevents injection via unsanitized locale in `.or()` template strings.

### Fix 3 — All 6 saveInteractionAndLearn Calls Pass Locale
`app/api/montree/guru/route.ts` — Every `saveInteractionAndLearn()` and `saveInteractionAndLearnSync()` call site passes `locale` parameter. The save helper destructures `locale: interactionLocale` and inserts `locale: interactionLocale || 'en'`. Structured mode INSERT also includes `locale: locale || 'en'`.

### Fix 4 — GET Handler Locale-Filtered History
`app/api/montree/guru/route.ts` lines 1174, 1203-1205 — GET validates locale against whitelist (defaults to `null` = show all). When locale provided, filters with `.or('locale.eq.${locale},locale.is.null')` for backward compat.

**POST defaults to `'en'`, GET defaults to `null`** — intentional. POST must save a value. GET with no locale (old clients) should return all history.

### Fix 5 — Context-Builder Locale Filter with Defense-in-Depth
`lib/montree/guru/context-builder.ts` lines 251-262 — Function signature accepts optional `locale`. IIFE in Promise.allSettled validates locale against `['en', 'zh']` whitelist (defense-in-depth — caller also validates) before using in `.or()` filter. Past interactions scoped to current language + universal NULL rows.

### Fix 6 — GuruChatThread Re-fetches on Language Switch
`components/montree/guru/GuruChatThread.tsx` — History fetch URL includes `&locale=${locale}`. `useEffect` dependency array includes `locale` so history re-fetches when user switches language.

### Fix 7 — Photo Cache Keys Made Locale-Agnostic
`app/api/montree/guru/photo-insight/route.ts` — 3 cache key locations changed from `photo:${media_id}:${child_id}:${locale}` to `photo:${media_id}:${child_id}`. Work identification is locale-independent — no reason to re-analyze the same photo ($0.01-0.02 Sonnet cost) when switching languages. Backward-compat `.like()` fallback finds old locale-suffixed entries.

### Fix 8 — Corrections Route Simplified
`app/api/montree/guru/corrections/route.ts` — Replaced dual en/zh `Promise.allSettled` (two queries for `photo:media:child:en` and `photo:media:child:zh`) with single locale-agnostic query + `.like()` fallback for old format.

### Fix 9 — Chinese Work Names on Smart Capture Results
`components/montree/guru/PhotoInsightButton.tsx` — When locale is `'zh'`, displays Chinese work name via `getChineseNameForWork()` (existing function from curriculum-loader.ts). Area names translated via `t('area.${result.area}')`.

## Files Modified (7) + 1 New

1. `migrations/146_guru_locale.sql` — **NEW** migration
2. `app/api/montree/guru/route.ts` — POST locale validation + 6 save calls + GET locale filter
3. `lib/montree/guru/context-builder.ts` — Function signature + locale filter with whitelist
4. `components/montree/guru/GuruChatThread.tsx` — History fetch URL + useEffect deps
5. `app/api/montree/guru/photo-insight/route.ts` — 3 cache key edits + fallback rewrite
6. `app/api/montree/guru/corrections/route.ts` — Photo URL lookup rewrite
7. `components/montree/guru/PhotoInsightButton.tsx` — Chinese work names + translated areas

## Audit Summary

- 3 plan-audit cycles (9 independent agents) → Plan v3-FINAL
- 4 build-audit cycles (12 independent agents) → 1 real issue found (POST locale validation gap) → fixed → 3 consecutive CLEAN
- 1 post-build audit (3 independent agents) → 2 low findings (context-builder defense-in-depth, partial index) → both fixed
- 1 final audit (3 independent agents) → 0 issues → CLEAN
- **Total: 27 independent audit agents, 0 unfixed issues**

## Deploy

1. Push code to main (see push command in session)
2. Run Migration 146 via Supabase SQL Editor
3. Railway auto-deploys on push

## Test Plan

- Switch to Chinese → Guru should show only Chinese history + pre-migration rows
- Send message in Chinese → response saved with `locale: 'zh'`
- Switch back to English → only English history shown
- Smart Capture a photo in Chinese mode → work name shows in Chinese, area name translated
- Switch language after Smart Capture → no duplicate Sonnet analysis (cache hit)
