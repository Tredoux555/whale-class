# Handoff: Smart Capture Fix + Two-Pass Architecture + Special Events 6th Area

**Date:** March 19, 2026
**Session:** Deep investigation + 3 fixes deployed


---

## Part 1: Smart Capture Crash Fix (CRITICAL — 2 days of downtime)

### Problem
Smart Capture was completely broken since March 18. 20+ photos across multiple children, ALL `work_id: null`. Zero `guru_interactions` photo_insight records since March 17 02:47 UTC.

### Root Cause
`TypeError: r.rpc(...).catch is not a function` in `photo-insight/route.ts` line 590.

Supabase JS client's `.rpc()` returns a `PostgrestBuilder` which implements `PromiseLike` (has `.then()`) but does NOT have `.catch()`. The code chained `.catch()` directly on `.rpc()`:

```javascript
// BROKEN:
supabase.rpc('increment_visual_memory_used', { ... }).catch((err) => { ... });

// FIXED:
supabase.rpc('increment_visual_memory_used', { ... }).then(({ error: rpcErr }) => {
  if (rpcErr) console.error('...', rpcErr);
});
```

This code was deployed on March 18 as part of the visual memory system. It crashed EVERY photo-insight call, preventing the AI analysis from ever running.

### Investigation Process
- 10 independent audit agents investigated in parallel
- Tested production API: route returned 401 without auth (route loads), 500 with auth (crashes at runtime)
- Deployed diagnostic route (`/api/montree/debug-insight`) that tested each component step-by-step — all passed (auth, media fetch, AI enabled, Haiku text, Haiku vision, tool_use)
- Added temporary error exposure to the catch block → got the actual TypeError
- Root cause confirmed and fixed in single line change

### Additional Fix
`effectiveCached.created_at` → `effectiveCached.asked_at` on line 268 (cache age calculation was using wrong column name).

### Commits
- `7119b9c9` — debug route + asked_at fix
- `75b2848a` — error exposure (temporary)
- `4643fddd` — **THE FIX**: `.rpc().catch()` → `.then()`

---

## Part 2: Two-Pass Describe-Then-Match Architecture (Accuracy Fix)

### Problem
After the crash fix, Smart Capture was running but inaccurate. Sonnet identified Jimmy's "Dressing Frame - Bows" (bow tying) as "Metal Insets" with 0.92 confidence. These look nothing alike.

### Root Cause
Research confirmed: vision accuracy degrades with long system prompts. The 900-line system prompt (262-line visual ID guide + 329 curriculum works + visual memory + corrections + focus works) was overwhelming the vision model's attention. It simultaneously parsed an image AND navigated a massive reference guide.

### Solution: Two-Pass Architecture
**Pass 1 — DESCRIBE (Haiku + image, minimal prompt):**
- Short system prompt: "Describe the physical materials visible"
- NO curriculum context, NO visual ID guide → no hallucination of work names
- Returns pure visual description: "Child in red shirt working with fabric strips and laces on a wooden frame"
- Cost: ~$0.003, latency: ~2-4s

**Pass 2 — MATCH (Haiku + text-only, full context):**
- Full visual ID guide + corrections + visual memory
- NO image — 100% attention on matching text to curriculum
- Uses the description from Pass 1 to identify the correct work
- Cost: ~$0.003, latency: ~1-3s

**Sonnet Fallback:** If both passes fail, falls back to single-pass Sonnet with the original full prompt + image.

### Results
- Before: "Metal Insets" (language, 0.92 confidence) — WRONG
- After: "Bow Tying Frame" (practical_life, 0.85 confidence) — CORRECT
- Cost: ~$0.006 vs ~$0.06 (10× cheaper)
- Latency: ~4-8s vs ~10-45s (3-5× faster)

### Files Modified
1. `app/api/montree/guru/photo-insight/route.ts` — Replaced two-tier Haiku→Sonnet router with two-pass describe-then-match. Kept Sonnet as fallback. Added `visual_description` and `two_pass: true` to context_snapshot.

### Commit
- `e1cad685` — Two-pass describe-then-match architecture

---

## Part 3: Special Events 6th Area

### Feature
Teachers can now tag photos to special events (Cultural Day, Sports Day, Science Fair, etc.) using the same gallery tagging flow as curriculum works.

### Architecture Decision
Events are implemented as **custom curriculum works** with `area_key: 'special_events'`. No new tables, no migration, no EventPicker in the gallery. WorkWheelPicker's existing "Add Custom Work" button handles event creation.

This was chosen over:
- A separate events table (adds complexity, dual-path logic in 15+ files)
- A hybrid approach (sync between two tables)

### What Changed (7 files, 10 insertions, 4 deletions)
1. `lib/montree/types.ts` — Added `special_events` to `AREA_CONFIG` (icon: 🎉, color: #e11d48 rose) + `AREA_ORDER` (6 areas)
2. `lib/montree/i18n/en.ts` — `'area.special_events': 'Special Events'`
3. `lib/montree/i18n/zh.ts` — `'area.special_events': '特别活动'`
4. `app/api/montree/curriculum/route.ts` — Added `special_events` to `DEFAULT_AREAS` (auto-seeds for new classrooms)
5. `app/api/montree/principal/setup-stream/route.ts` — Added `special_events` to `DEFAULT_AREAS` + updated "Setting up 6 curriculum areas" message
6. `app/api/montree/reports/generate/route.ts` — Added `special_events: '🎉'` to emoji map
7. `app/montree/dashboard/[childId]/gallery/page.tsx` — Added `special_events` to `PREVIEW_AREA_CONFIG` + `PREVIEW_AREA_ORDER`

### What's Intentionally Excluded
- **Smart Capture AI** — `photo-insight/route.ts` line 438 hardcodes 5 standard areas for the curriculum hint. Special events are never sent to the AI.
- **Classroom overview print** — Hardcoded 5-area grid for A4 print layout.
- **Recommendation engine** — `EXPECTED_BALANCE` only covers 5 standard areas. Special events have no expected distribution.

### How It Works
1. Teacher opens gallery → taps untagged photo → "Choose an area" → sees 6th option "🎉 Special Events"
2. WorkWheelPicker opens for special_events area (initially empty)
3. Teacher taps "+" → types "Cultural Day" → creates custom work
4. Photo tagged with `work_id` → appears in gallery under "Special Events" section
5. For existing classrooms: the auto-seed on first custom work creation will add the special_events area automatically

### Known Limitations (MVP)
- A photo can only be tagged to ONE work (can't tag both "Pink Tower" AND "Cultural Day")
- Events order by creation time, not event date
- "Mastered Cultural Day" is semantically odd (teachers should just tag, not progress-track events)

### Commit
- `cb59e9db` — Special Events 6th area

### Build-Audit Process
5 plan-audit cycles identified the approach, then 3 build-audit cycles caught:
- Cycle 1: Missing emoji in reports generate route
- Cycle 2: CRITICAL — Missing `special_events` in `DEFAULT_AREAS` (curriculum POST route). Without this, teachers couldn't create event works.
- Cycle 3: Missing `special_events` in setup-stream `DEFAULT_AREAS` + gallery report preview config

---

## Part 4: Debug Route (TO DELETE)

`app/api/montree/debug-insight/route.ts` — Temporary diagnostic route used to isolate the crash. Tests auth, media fetch, AI enabled, Haiku text, Haiku vision, and tool_use step by step. **Delete this file in next session.**

---

## Local .env.local Fix

The local `ANTHROPIC_API_KEY` had a typo: `P02` (P-zero-2) instead of `PO2` (P-capital-O-2). Fixed. Railway production key was already correct.

---

## Deploy Status
All 4 commits pushed to main, Railway auto-deploys:
- `7119b9c9` — debug route + asked_at fix
- `75b2848a` — error exposure (temporary, reverted in next commit)
- `4643fddd` — .rpc().catch() crash fix
- `e1cad685` — Two-pass describe-then-match
- `cb59e9db` — Special Events 6th area

No new migrations required. No manual DB changes needed.
