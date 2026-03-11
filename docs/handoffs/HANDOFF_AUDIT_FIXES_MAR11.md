# Handoff: Audit Fix Cycle — Mar 11, 2026

## Summary

3-cycle audit-fix loop on all unpushed code from Mar 8–11 sessions. 8 issues found and fixed across 9 files. Final state: CLEAN (zero issues in Cycle 3).

## Status: ✅ COMPLETE — NOT YET PUSHED

All changes are local. Push with the consolidated deploy command from CLAUDE.md.

## Fixes Applied

### Cycle 1 (7 fixes)

**1. PhotoInsightButton.tsx — Silent catch blocks (HIGH)**
- Two `catch {}` blocks in `handleAddToClassroom` and `handleAddToShelf` swallowed errors silently
- Fix: Added `console.error('[PhotoInsight] ...')` logging + non-ok response status logging

**2. BatchReportsCard.tsx — Hardcoded English string (MEDIUM)**
- Line 109: `error: 'Network error'` hardcoded in catch block
- Fix: `error: t('common.networkError' as any, 'Network error')`

**3. GuruChatThread.tsx — 3 hardcoded English strings (MEDIUM)**
- `'Please select an image file'` → `t('guru.selectImageFile')`
- `'Image too large (max 10MB)'` → `t('guru.imageTooLarge')`
- `'Unable to load classroom data...'` → `t('guru.unableLoadClassroom')`
- Also cleaned up redundant fallback on `t('guru.timeout')`

**4. photo-insight/route.ts — Missing rate limiting (HIGH)**
- Smart Capture API had no rate limiting (Sonnet vision calls are expensive)
- Fix: Added `checkRateLimit()` — 60 requests per 60 minutes per IP
- Inserted after auth check, before body parsing

**5. classroom-context-builder.ts — `.single()` crash risk (HIGH)**
- Classroom name query used `.single()` which throws on 0 rows
- Fix: `.single()` → `.maybeSingle()` (returns null gracefully)

**6. batch/route.ts — `.single()` crash risk (HIGH)**
- Child fetch used `.single()` which throws if child not found
- Fix: `.single()` → `.maybeSingle()` (returns null gracefully)

**7. en.ts + zh.ts — 4 new i18n keys (MEDIUM)**
- Added with perfect EN/ZH parity:
  - `guru.selectImageFile`
  - `guru.imageTooLarge`
  - `guru.unableLoadClassroom`
  - `guru.timeout`

### Cycle 2 (1 fix)

**8. GuruChatThread.tsx — Missing AbortController on init fetch (MEDIUM)**
- `init()` useEffect made 3 fetch calls (history, concerns, history again) without cleanup
- Component unmount during fetch → setState on unmounted component warnings
- Fix: Created `AbortController`, passed `signal` to all 3 fetch calls, added `return () => abortController.abort()` cleanup, added `AbortError` guard in catch block

### Cycle 3

**CLEAN — zero issues found across all 9 modified files.**

## Files Modified (9 total)

| File | Changes |
|------|---------|
| `components/montree/guru/PhotoInsightButton.tsx` | Error logging in 2 catch blocks + non-ok response logging |
| `components/montree/reports/BatchReportsCard.tsx` | Hardcoded string → i18n |
| `components/montree/guru/GuruChatThread.tsx` | 3 hardcoded strings → i18n + AbortController on init useEffect |
| `app/api/montree/guru/photo-insight/route.ts` | Rate limiting (60/hr) |
| `lib/montree/guru/classroom-context-builder.ts` | `.single()` → `.maybeSingle()` |
| `app/api/montree/reports/batch/route.ts` | `.single()` → `.maybeSingle()` |
| `lib/montree/i18n/en.ts` | 4 new keys |
| `lib/montree/i18n/zh.ts` | 4 matching Chinese keys |

## False Positives Identified

- `/api/montree/curriculum` POST endpoint was incorrectly flagged as missing in initial automated audit — it exists and handles single work additions with full auth
- Focus-works "batch endpoint missing rate limiting" — no batch endpoint exists; the regular POST does single upserts

## Deploy

⚠️ NOT YET PUSHED. Include in the consolidated push with all Mar 8–11 features. No new migrations needed.
