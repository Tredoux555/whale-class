# Audit & Optimise Day — Apr 30, 2026

**Mission:** Run the full sweep from this morning's system-wide health check. Three audits identified 17 fixes across frontend perf, AI cost, and tier-gating. Ship them all today.

**Strategy:** Commit after each checkpoint so every chat refresh resumes from a real git state. Work top-to-bottom in this file, mark each row ☑ as you go, push frequently.

---

## Progress Tracker (update in-place)

| # | Item | File | Status |
|---|------|------|--------|
| 1 | I18nProvider memo wrap | `lib/montree/i18n/context.tsx` | ☐ |
| 2 | Service worker — cache only immutables | `public/montree-sw.js` | ☐ |
| 3 | ai-generator.ts accepts optional `model` | `lib/montree/reports/ai-generator.ts` | ☐ |
| 4 | DashboardHeader memo() | `components/montree/DashboardHeader.tsx` | ☐ |
| 5 | Photo-audit dynamic-import loading fallbacks | `app/montree/dashboard/photo-audit/page.tsx` | ☐ |
| 6 | Guide endpoint Cache-Control on success path | `app/api/montree/works/guide/route.ts` | ☐ |
| 7 | Cap `negative_descriptions[]` at ~15 FIFO | `app/api/montree/guru/corrections/route.ts` | ☐ |
| 8 | Verify daily-brief query sequencing | `app/api/montree/intelligence/daily-brief/route.ts` | ☐ |
| 9 | Verify weekly-wrap teacher+parent batching | `app/api/montree/reports/weekly-wrap/route.ts` | ☐ |
| 10 | Verify photo-audit sheet SELECT scope | photo-audit data route | ☐ |
| 11 | Tier-gate language-presentation | `app/api/montree/reports/language-presentation/[childId]/route.ts` | ☐ |
| 12 | Tier-gate language-semester (3 calls) | `app/api/montree/reports/language-semester/generate/route.ts` | ☐ |
| 13 | Tier-gate teaching-instructions | locate via grep | ☐ |
| 14 | Tier-gate snap-identify | locate via grep | ☐ |
| 15 | Tier-gate weekly-review (×2 calls) | `app/api/montree/reports/weekly-wrap/review/route.ts` | ☐ |
| 16 | Tier-gate corrections (Sonnet path) | `app/api/montree/guru/corrections/route.ts` | ☐ |
| 17 | Tier-gate generate-work-content | locate via grep | ☐ |
| 18 | Final commit + push + brain update | — | ☐ |

---

## How to do each item

### 1. I18nProvider memo wrap
**Why:** Provider value `{ locale, setLocale, t }` is rebuilt every render → all 173 importers re-render on any parent state change.
**Change in `lib/montree/i18n/context.tsx`:**
- Add `useMemo` to imports
- Replace `value={{ locale, setLocale, t }}` with `value={value}` and add `const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);` above the return.

### 2. Service worker — cache only immutables
**Why:** Today's incident — SW cached the dashboard HTML, served stale shell while API failed.
**Change in `public/montree-sw.js`:**
- In fetch handler, only `cache.put` when URL matches: `/\.(js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp)$/.test(pathname) || pathname.startsWith('/_next/static/')`
- HTML responses pass through, never cached.
- Bump `CACHE_NAME` to `montree-v2` so old caches purge on activate.

### 3. ai-generator.ts — tier-aware model
**Why:** Hardcoded Sonnet ~line 67 even though Weekly Wrap passes tier info. Free + Core schools paying Sonnet rates.
**Change in `lib/montree/reports/ai-generator.ts`:**
- Read first to see the actual signature
- Add optional `model?: string` parameter
- Replace `model: 'claude-sonnet-4-5-20250929'` with `model: model ?? AI_MODEL`
- Update Weekly Wrap caller to pass `aiTier.model`

### 4. DashboardHeader memo()
**Change in `components/montree/DashboardHeader.tsx`:**
- `import { memo } from 'react'`
- Convert default export to a named function, then `export default memo(DashboardHeader)`.

### 5. Photo-audit dynamic loading fallbacks
**Change in `app/montree/dashboard/photo-audit/page.tsx`:**
- For each `dynamic(() => import('...'), { ssr: false })`, add `loading: () => <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading…</div>`.

### 6. Guide endpoint Cache-Control on success
**Change in `app/api/montree/works/guide/route.ts`:**
- Verify every NextResponse.json on the success path attaches `Cache-Control: private, max-age=3600, stale-while-revalidate=7200`.

### 7. Cap `negative_descriptions[]` at 15 FIFO
**Change in `app/api/montree/guru/corrections/route.ts`:**
- After push: `if (negs.length > 15) negs.splice(0, negs.length - 15);`

### 8–10. Verify-then-act trio
For each:
1. Read the file
2. If sequential awaits exist for independent queries → `Promise.all`
3. If `.select('*')` is loading large JSONB unnecessarily → scope to needed columns
4. Commit only verified wins

⚠ Weekly-wrap (#9): replan **must** stay Stage 0. Don't break the ordering.

### 11–17. Tier-gate Sonnet routes
**Pattern:**
```ts
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';

const aiTier = await resolveReportModel(supabase, schoolId);
if (aiTier.tier === 'free') {
  return NextResponse.json({ error: 'AI reports require an active AI tier' }, { status: 402 });
}
const model = aiTier.model;
// pass `model` to the Anthropic call
```

Read `docs/AI_COST_AUDIT.md` first — it has the verified line numbers for each route.

### 18. Final wrap
1. `git status` — confirm everything is committed
2. Push via Desktop Commander: `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main`
3. Update `CLAUDE.md` with a Session 76 entry summarising the sweep
4. Mark all rows in this file ☑

---

## Audit reference docs

- `docs/AI_COST_AUDIT.md` — verified list of hardcoded-Sonnet routes with line numbers (written by audit agent)
- `docs/I18N_REFACTOR_HANDOFF.md` — what shipped earlier today (auto-derived SELECTs)
- `docs/DARK_FOREST_REDESIGN_HANDOFF.md` — Phase 10 super-admin still pending

## Don't break these

- `maxDuration = 120` on `app/api/montree/photo-identification/process/route.ts`
- `HAIKU_TRUST_CONFIDENCE = 0.85` (Pass 2b discriminator threshold)
- Replan Stage 0 ordering in `weekly-wrap/route.ts` (replan MUST run before reports)
- Cross-pollination security: every route accepting `child_id` calls `verifyChildBelongsToSchool()`
- 173 files import via `lib/montree/i18n` barrel — don't change its public exports
