# Handoff: Batch Parent Reports + Audit Fixes — Mar 10, 2026

## Summary

Built "Generate All Reports" feature — teachers generate weekly parent reports for ALL children at once from the dashboard. Also fixed 5 pre-existing audit findings across photo-insight, PhotoInsightButton, and reports/generate routes.

## New Files (2)

### `app/api/montree/reports/batch/route.ts` (~255 lines)
Per-child batch report API. Called sequentially by BatchReportsCard for each child.
- Auth: `verifySchoolRequest()` + `verifyChildBelongsToSchool()`
- Rate limit: 50 calls/day per IP via `checkRateLimit(supabase, ip, endpoint, 50, 1440)`
- 5 parallel DB queries: child info, week progress, focus works, all progress (stats), photos
- Week boundaries: Monday-Sunday (getCurrentWeekRange)
- Report saved as draft to `montree_weekly_reports` with `report_type: 'batch_parent'`
- Locale validated against `['en', 'zh']` whitelist
- All DB query errors logged (non-fatal for secondary queries)
- supabaseUrl guard: empty URL = skip photo URLs

### `components/montree/reports/BatchReportsCard.tsx` (~305 lines)
Dashboard card following WeeklyAdminCard pattern.
- Sequential loop with AbortController for cancellation
- `mountedRef` pattern: all state updates guarded against post-unmount
- Progress bar with per-child increments
- Expandable per-child results (works, areas, photos)
- Failed children listed with "Retry" button
- Reports saved as drafts — teacher views/sends from each child's Reports tab
- Full i18n: 16 `batchReports.*` keys in both en.ts and zh.ts

## Modified Files (6)

### `app/montree/dashboard/page.tsx`
- Imported and wired `BatchReportsCard` after `WeeklyAdminCard` (teachers only)

### `lib/montree/i18n/en.ts`
- Added 17 new keys: 16 `batchReports.*` + `common.networkError`

### `lib/montree/i18n/zh.ts`
- Added 17 matching Chinese keys (perfect parity)

### `app/api/montree/guru/photo-insight/route.ts` (audit fix)
- **Word boundary regex**: Changed work name matching from substring `.includes()` to `\b`-bounded regex. Prevents false positives like "hand" matching "Sand Tray".
- **Error handling**: Added error capture on media update DB call (was silently failing).

### `components/montree/guru/PhotoInsightButton.tsx` (audit fix)
- Fixed hardcoded `title` attribute → `title={t('guru.whatDoesGuruSee')}`

### `app/api/montree/reports/generate/route.ts` (audit fix)
- Removed ALL hardcoded Chinese strings. Greeting, highlights, home suggestions, closing all use i18n `t()` keys for both locales.

## Audit History (6 cycles)

| Cycle | Type | Findings | Fixed |
|-------|------|----------|-------|
| 1 | 3 parallel agents (API + UI + i18n) | 29 total (CRITICAL rate limit sig, hardcoded Chinese, missing mountedRef) | All fixed — full API rewrite + component rewrite |
| 2 | 3 parallel agents | 3 real (locale validation, supabaseUrl guard, networkError key) | All fixed |
| 3 | 3 parallel agents | CLEAN | — |
| 4 (deep) | API deep audit | 1 real (date format consistency on media query) | Fixed |
| 5 (deep) | UI deep audit | 0 real (double-click already handled by conditional render) | — |
| 6 (deep) | i18n parity audit | CLEAN | — |

## Key Patterns

- **Sequential not parallel**: Client iterates children one at a time to avoid rate limits and server overload
- **AbortController lifecycle**: Created before loop, aborted on cancel, cleaned on unmount
- **mountedRef**: useRef boolean checked before every state update in async loops
- **Rate limit signature**: `checkRateLimit(supabase, ip, endpoint, maxAttempts, windowMinutes)` — 5 params, minutes not seconds
- **Report saves as draft**: Teacher must manually review and send from each child's Reports tab

## Deploy

⚠️ NOT YET PUSHED. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: batch generate all parent reports + 5 audit fixes + 6 audit cycles" && git push origin main
```

No new migrations needed. Uses existing `montree_weekly_reports` table.
