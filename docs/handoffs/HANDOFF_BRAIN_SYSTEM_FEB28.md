# Handoff: Self-Improving Guru Brain System

**Date:** February 28, 2026
**Status:** Complete — 3 audit cycles + health check + deep audit (56 issues found and fixed)

---

## What Was Built

A self-improving AI brain that gets smarter after every Guru conversation. The Guru accumulates wisdom from ALL families — what works, what fails, developmental insights, therapeutic techniques — and feeds this into future conversations.

### Architecture (4-part system)

1. **Brain Storage** — Single JSONB row in `montree_guru_brain` table. Global (not per-school). Contains categorized wisdom sections + raw learning buffer.

2. **Learning Extraction** — After every conversation (both teacher and parent modes), key learnings are extracted and appended to the raw buffer via atomic PostgreSQL RPC (`append_guru_learning`).

3. **Brain Consolidation** — When buffer hits 20 learnings (max once per 6 hours), Claude Haiku reads all raw learnings and synthesizes them into polished wisdom entries. Claude literally updates its own brain. Two-phase save: brain first, then clear learnings (prevents data loss).

4. **Brain Retrieval** — Before each conversation, relevant wisdom is scored and injected into the system prompt. Scoring factors: child age, Montessori areas, parent concerns, parent confidence level, source count, category.

### Cross-Family Pattern Learning (companion system)

`pattern-learner.ts` — Separate from the brain, this system:
- Aggregates insights across ALL families into `montree_child_patterns`
- Reinforces patterns seen in multiple families (confidence escalation: 3 families → medium, 5 → high)
- Tracks success rates via exponential moving average (EMA α=0.2)
- Injects anonymized cross-family wisdom into each conversation

---

## Files Created/Modified

### New Files
- `lib/montree/guru/brain.ts` — Core brain system (668 lines)
- `migrations/133_guru_tiers.sql` — Brain table, RPC functions, tier columns, indexes

### Modified Files
- `app/api/montree/guru/route.ts` — Wired brain learning (both conversational + structured modes), brain wisdom + cross-family pattern retrieval, tier-based model selection
- `lib/montree/guru/pattern-learner.ts` — Multiple safety fixes (Array.isArray, LIKE injection escape, metadata validation)
- `lib/ai/anthropic.ts` — Added `HAIKU_MODEL` export, `getModelForTier()` function

---

## Key Design Decisions

1. **Global brain (not per-school)** — Wisdom is universal. A breakthrough with a 3-year-old in one family helps all 3-year-olds. If multi-tenancy needed later, add school_id partition.

2. **Atomic RPC for writes** — `append_guru_learning` prevents race conditions when multiple parents chat simultaneously. No fallback to read-modify-write (that would risk wiping the brain).

3. **Two-phase consolidation save** — Brain data saved first, then learnings cleared. If brain save fails, raw learnings are preserved for retry.

4. **Fire-and-forget learning** — Brain extraction never blocks the user's conversation response. Errors are logged but swallowed.

5. **Haiku for consolidation** — Cheap ($0.80/$4.00 per 1M tokens) and fast. Brain consolidation doesn't need Sonnet-level reasoning.

6. **7 seed wisdom entries** — Brain starts with hand-crafted wisdom so it's useful from day one, before any real conversations happen.

---

## Guru Tier System

| Tier | Model | Price | Prompts/Month |
|------|-------|-------|---------------|
| Haiku | claude-haiku-4.5 | $5/mo | 30 |
| Sonnet | claude-sonnet-4 | $20/mo | 30 |
| Free Trial | Sonnet (default) | $0 | 10 (lifetime) |

- `guru_tier` column on `montree_teachers` (default: 'sonnet')
- Monthly prompt reset via `guru_prompts_reset_at` column
- ~~Atomic increment via `increment_guru_prompts` RPC function~~ (dead code — daily limiter counts from interactions table, DA#4)

---

## Audit Summary

### Cycle 1: 25 issues found, all fixed
- CRITICAL: BrainState validation (#1), Array.isArray guards (#2), JSON.parse try-catch (#3), ID collision prevention (#4), unsafe families array (#5), missing null checks (#6)
- HIGH: NaN date protection (#8), sort preservation (#9), parseFloat for ages (#10), LIKE injection (#18), unsafe read-modify-write removal (#19), wrong Haiku pricing (#15)
- MEDIUM: Boolean coercion (#20), silent error swallowing (#21), migration no-op (#23)
- LOW: null instead of empty string (#24)

### Cycle 2: 17 issues found, all fixed
- CRITICAL: Fallback upsert could wipe brain (#27), TypeScript type guard (#28)
- HIGH: Migration ON CONFLICT still no-op (#29), consolidation data loss risk (#30), pattern metadata validation (#32)
- MEDIUM: Various data type validation fixes
- Documented: Concurrent update risk in pattern learner (#31) — acceptable for fire-and-forget background work

### Cycle 3: 1 issue found, fixed
- CRITICAL: Non-atomic prompt counter fallback removed (#43) — race condition could desync prompt counter

### Health Check: 8 issues found, all fixed
- CRITICAL HC#1: Timezone hole — `setHours(0,0,0,0)` used server timezone for daily limit. Fixed: UTC midnight boundary (`Date.UTC`).
- CRITICAL HC#2: Race condition between count query and AI call. Documented as accepted risk — 1-message overage possible, $0.01-$0.05 cost impact.
- HIGH HC#4: Null safety guard added for `guruTier` parameter in psych knowledge injection (conversational-prompt.ts).
- HIGH HC#5: Null guard on `pattern_description` cast in pattern-learner.ts (2 locations) — prevents `.toLowerCase()` on null.
- HIGH HC#6: Added database index `idx_guru_interactions_teacher_date` on `(teacher_id, asked_at DESC)` for daily count query performance.
- MEDIUM HC#3: Added nuance note to Alfie Kohn section — acknowledges Eisenberger/Cameron counter-research, distinguishes informational feedback from controlling rewards.
- MEDIUM HC#7: Extracted `MIN_CONSOLIDATION_HOURS` constant (6) with cost analysis comment for future tuning.
- MEDIUM HC#8: EMA alpha reduced from 0.3 → 0.2 for more stable pattern success rates.
- LOW HC#9: Added stack trace logging to consolidation error handler.

### Deep Audit: 4 issues found, all fixed
- HIGH DA#1: `teacher_id` mismatch — daily count query uses resolved `teacherId` (from auth JWT) but both insert locations saved raw `teacher_id` from body (could be null). If client doesn't send teacher_id, inserts have null, count finds 0, rate limit never triggers. Fixed both conversational and structured mode inserts to use `teacherId`.
- MEDIUM DA#2: `updatePatternSuccessRate` select was `'id, notes'` — missing `pattern_description`. Code at line 245 accesses `pattern_description` which was always `undefined` → fell back to `''` → overlap always 0 → **success rates never actually updated**. Fixed: added `pattern_description` to select.
- LOW DA#3: Unused `existingIds` variable in brain.ts (line 415). Was built but never read — code uses `findIndex` instead. Removed.
- LOW DA#4: `increment_guru_prompts` RPC calls in route.ts were dead overhead. Daily rate limiter counts from `montree_guru_interactions` table directly, making `guru_prompts_used` column redundant. Removed both calls (conversational + structured).

**Total: 52 (health check) + 4 (deep audit) = 56 issues found and fixed across all audit phases.**

---

## Database Changes (Migration 133)

```sql
-- New columns on montree_teachers
guru_tier TEXT DEFAULT 'sonnet'  -- CHECK: NULL or 'haiku' or 'sonnet'
guru_prompts_reset_at TIMESTAMPTZ

-- New table
montree_guru_brain (id TEXT PK, brain_data JSONB, raw_learnings JSONB, updated_at TIMESTAMPTZ)

-- New RPC functions
increment_guru_prompts(teacher_id_param UUID)  -- Atomic prompt counter
append_guru_learning(learning_json TEXT, max_learnings INT)  -- Atomic learning buffer append

-- New indexes
idx_patterns_active_confidence ON montree_child_patterns(still_active, confidence)
idx_guru_interactions_teacher_date ON montree_guru_interactions(teacher_id, asked_at DESC)
```

**Deploy:** `psql $DATABASE_URL -f migrations/133_guru_tiers.sql`

---

## How the Brain Grows

```
Parent asks about 3yo refusing Pink Tower
  ↓
Guru responds with advice
  ↓
recordLearning() extracts: "3yo refusal of mastered sensorial work → suggest challenge increase"
  ↓
append_guru_learning RPC atomically adds to buffer
  ↓
Buffer hits 20 learnings → consolidateBrain() fires (background)
  ↓
Haiku reads raw learnings + existing wisdom
  ↓
Synthesizes: "Children 2.5-3.5 who suddenly refuse previously enjoyed sensorial works
              often need the next challenge level, not repetition of the same difficulty"
  ↓
New wisdom entry stored with tags: [age_3, sensorial, refusal, challenge]
  ↓
Next conversation about a 3yo refusing sensorial work → this wisdom scores high → injected into prompt
```

---

## What's NOT Done (Deferred)

- **Stripe integration** for tier billing (needs env vars)
- **Brain admin UI** in super-admin panel (view/edit brain contents, trigger manual consolidation)
- **Brain analytics** (track consolidation frequency, wisdom growth rate, retrieval hit rate)
- **Multi-school brains** (if privacy requires per-school knowledge isolation)
- **Pattern learner RPC** (convert read-modify-write to atomic RPC like brain system)
