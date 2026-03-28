# Teacher OS Sprint 7 — Evidence Tracking System

**Date:** March 28, 2026
**Status:** 3 Audit Cycles, Cycle 3 ALL CLEAN — ⚠️ NOT YET PUSHED

## Summary

Wired the evidence tracking system end-to-end: photo-insight RPC fires on every identified photo → DB counters increment atomically → Evidence API reads counters → FocusWorksSection lazily fetches on card expand → EvidenceStrengthBadge renders colored strength indicator.

## What Was Built

### 1. RPC Wiring in Photo-Insight Route (`app/api/montree/guru/photo-insight/route.ts` — 2 edits)
- **CLIP path** (~line 783): Fire-and-forget `increment_evidence_photo` RPC after CLIP identifies a work
- **Two-pass Haiku path** (~line 2042): Same RPC after two-pass identification
- Both calls use `.trim()` on work names for safety
- Pattern: `.then(({ error }) => log).catch(err => log)` — non-blocking

### 2. Evidence API Route (`app/api/montree/intelligence/evidence/route.ts` — CREATED, ~175 lines)
- **GET**: Fetches evidence summary per child from `montree_child_progress` evidence columns, computes `evidence_strength` (none/weak/moderate/strong)
- **PATCH**: `confirm_mastery` / `revoke_mastery` actions with pre-fetch verification
- Early action validation against whitelist
- Child school verification via `.maybeSingle()`
- Work name trimmed on input
- Cache-Control: `private, max-age=30, stale-while-revalidate=60`

### 3. EvidenceStrengthBadge Component (`components/montree/EvidenceStrengthBadge.tsx` — CREATED, ~62 lines)
- Colored dot + label: gray (none), amber (weak), blue (moderate), emerald (strong)
- Compact mode for inline use (just dot + label)
- Photo count detail in non-compact mode
- Mastery confirmed checkmark (✓)
- Exports `getEvidenceStrength()` and `STRENGTH_CONFIG` for reuse

### 4. FocusWorksSection Integration (`components/montree/child/FocusWorksSection.tsx` — 4 edits)
- Lazy evidence fetch on first card expansion (not on mount)
- AbortController + childIdRef for stale fetch prevention
- Double stale-check (after res + after json parse)
- Cache reset on child change (clears map + aborts in-flight fetch)
- EvidenceStrengthBadge rendered in expanded work card

### 5. i18n Keys (`lib/montree/i18n/en.ts` + `zh.ts` — 15 keys each)
- `evidence.strength.none/weak/moderate/strong` — strength labels
- `evidence.confirmMastery/revokeMastery` — action labels
- `evidence.masteryConfirmed/masteryRevoked` — result messages
- `evidence.photoCount` — `{count} photo(s) across {days} day(s)`
- Perfect EN/ZH parity

## Evidence Strength Thresholds

| Strength | Criteria | Color |
|----------|----------|-------|
| None | 0 photos | Gray |
| Weak | 1 photo, 1 day | Amber |
| Moderate | 2+ photos OR 2+ days | Blue |
| Strong | 3+ photos AND 3+ days | Emerald |

## Audit Summary (3 cycles)

- **Cycle 1:** 3 HIGH bugs found — child state not reset on switch, missing action validation, missing pre-fetch verification. All fixed.
- **Cycle 2:** 1 CRITICAL bug found — stale in-flight fetch race condition (old child's data overwrites new child's cache). Fixed with AbortController + childIdRef double-check pattern.
- **Cycle 3:** 2/3 agents CLEAN. 1 agent found timezone concern (triaged: false positive — UTC is consistent) + work_name trim in PATCH (minor defensive fix applied).

**Total fixes applied:** 5 across 2 cycles, then ALL CLEAN on Cycle 3.

## Files Created (2)
1. `app/api/montree/intelligence/evidence/route.ts` — Evidence API (~175 lines)
2. `components/montree/EvidenceStrengthBadge.tsx` — Badge component (~62 lines)

## Files Modified (4)
1. `app/api/montree/guru/photo-insight/route.ts` — 2 RPC call sites
2. `components/montree/child/FocusWorksSection.tsx` — Evidence state + lazy fetch + badge render
3. `lib/montree/i18n/en.ts` — 15 new `evidence.*` keys
4. `lib/montree/i18n/zh.ts` — 15 matching Chinese keys

## Deploy
⚠️ NOT YET PUSHED. No new migrations needed (uses columns from migration 155).
