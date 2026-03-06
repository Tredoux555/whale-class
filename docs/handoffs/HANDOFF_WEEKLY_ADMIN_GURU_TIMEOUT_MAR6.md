# Handoff: Weekly Admin Enhancement + Guru Timeout Fix — Mar 6, 2026

## Summary

Enhanced the "weekly admin" command with a 4th item (ADVICE) containing deep developmental insights that persist on each child's profile. Fixed a production Guru 500 error caused by API timeouts during tool_use rounds.

---

## What Changed

### 1. Weekly Admin: 4 Items Instead of 3

**Before:** Teachers said "weekly admin" and got 3 copy-paste items (THIS WEEK, NEXT WEEK, ONE-LINER).

**After:** Now produces 4 items:
- **THIS WEEK** — What the child worked on + how they did (1-2 sentences)
- **NEXT WEEK** — What's coming up based on Guru recommendations (1-2 sentences)
- **ONE-LINER** — Purely factual, max 15 words: "[Child] did [X] this week, next week [they] will do [Y]". NO opinions, NO observations — just facts for the paper admin system.
- **ADVICE** — 1-2 paragraphs of deep developmental advice: AMI progression insights, sensitive period observations, developmental psychology, WHY certain works are recommended, what to watch for. This is the Guru's unique value. Persists on child's profile.

### 2. Advice Saved to Child Profile

The post-conversation processor (Haiku, fire-and-forget) now extracts the ADVICE field and saves it to `montree_children.settings.guru_weekly_advice` (max 2,000 chars). It's displayed on the child's week view page in an expandable panel.

### 3. Guru API Timeout Fix (CRITICAL)

**Problem:** After adding ADVICE to the prompt, the Guru's tool_use rounds (set_focus_work, update_progress) started timing out. The Anthropic API calls exceeded the 25s per-round timeout, causing 500 errors.

**Root cause:** `API_TIMEOUT_MS = 25_000` was set conservatively for Vercel's 30s limit, but we deploy on Railway which allows 5-minute requests. The larger prompt with ADVICE made API responses slower.

**Fix:** Increased `API_TIMEOUT_MS` from 25,000ms to 55,000ms. With 3 max tool rounds, worst case is 165s — well under Railway's 5-minute limit.

---

## Files Changed (5 modified, 0 new)

### `lib/montree/guru/conversational-prompt.ts`
- Updated "WEEKLY ADMIN" COMMAND section in teacher system prompt
- Changed from 3 items to 4 items format (added ADVICE)
- One-liner format explicitly defined as purely factual with example
- ADVICE described as 1-2 paragraphs of deep developmental advice

### `lib/montree/guru/post-conversation-processor.ts`
- `ExtractionResult` interface: added `advice: string` field
- Extraction prompt: added item #4 ADVICE (max 500 words) with detailed instructions
- `max_tokens` increased from 512 to 1024 (accommodation for longer extraction)
- Saves `guru_weekly_advice` to child settings (capped at 2,000 chars)
- One-liner prompt explicitly states: "Purely factual, max 15 words. NO opinions, NO observations, NO assessments"

### `components/montree/child/GuruWeeklySummary.tsx`
- Complete rewrite to display 4 items instead of 3
- Expandable advice panel (collapsed by default, teal accent)
- Copy buttons on each item for paper admin workflow
- 3 audit fixes:
  1. Early return now checks `advice` (was rendering nothing when only advice existed)
  2. `hasNewFormat` includes `advice` (was falling to legacy view)
  3. CopyButton type safety: `advice || ''` guard

### `app/montree/dashboard/[childId]/page.tsx`
- Added `guruAdvice` state variable
- Fetches `settings.guru_weekly_advice` from child data
- Passes `advice={guruAdvice}` prop to GuruWeeklySummary

### `app/api/montree/guru/route.ts`
- `API_TIMEOUT_MS`: 25,000 → 55,000 (fixes 500 timeout on tool_use rounds)
- Updated comment to note Railway allows 5min, not 30s

---

## Push Command

All 5 files need to be pushed to production:

```bash
git add \
  lib/montree/guru/conversational-prompt.ts \
  lib/montree/guru/post-conversation-processor.ts \
  components/montree/child/GuruWeeklySummary.tsx \
  app/montree/dashboard/[childId]/page.tsx \
  app/api/montree/guru/route.ts \
  docs/handoffs/HANDOFF_WEEKLY_ADMIN_GURU_TIMEOUT_MAR6.md

git commit -m "feat: weekly admin 4th item (advice) + fix guru timeout (25s→55s)"
git push origin main
```

Or via push script:
```bash
GITHUB_PAT="<pat>" python3 scripts/push-to-github.py "feat: weekly admin advice + guru timeout fix" \
  "lib/montree/guru/conversational-prompt.ts" "/path/to/conversational-prompt.ts" \
  "lib/montree/guru/post-conversation-processor.ts" "/path/to/post-conversation-processor.ts" \
  "components/montree/child/GuruWeeklySummary.tsx" "/path/to/GuruWeeklySummary.tsx" \
  "app/montree/dashboard/[childId]/page.tsx" "/path/to/page.tsx" \
  "app/api/montree/guru/route.ts" "/path/to/route.ts" \
  "docs/handoffs/HANDOFF_WEEKLY_ADMIN_GURU_TIMEOUT_MAR6.md" "/path/to/handoff.md"
```

---

## Verification

After deploy:
1. Open Guru as teacher, select a child, type "weekly admin"
2. Verify response has 4 sections: THIS WEEK, NEXT WEEK, ONE-LINER, ADVICE
3. Verify no 500 error (tool_use rounds complete within 55s timeout)
4. Go to child's week view → verify GuruWeeklySummary shows all 4 items
5. Verify one-liner is purely factual (no opinions/observations)
6. Verify advice is substantive developmental content
7. Test copy buttons on each item

---

## Pending from Previous Sessions

- **Performance optimization files** (SWR cache, skeletons, image compression) — 6 files not yet pushed (VM disk was full)
- **GuruWeeklySummary audit fixes** — included in this push
- **Plan for Guru Insights Pinning + Print Weekly Plan** — plan exists at `.claude/plans/adaptive-wondering-knuth.md`, not started yet

---

## Architecture Notes

### Data Flow
```
Teacher says "weekly admin"
  → Guru (Sonnet) responds with 4 formatted items + uses tools (set_focus_work, update_progress)
  → Post-conversation processor (Haiku, fire-and-forget) extracts structured data
  → Saves to montree_children.settings: guru_weekly_this_week, guru_weekly_next_week,
    guru_weekly_one_liner, guru_weekly_advice, guru_weekly_summary
  → Child week view fetches settings and renders GuruWeeklySummary component
```

### Timeout Math
- `API_TIMEOUT_MS = 55_000` (55s per API call)
- `MAX_TOOL_ROUNDS = 3`
- Worst case: 3 rounds × 55s = 165s
- Railway limit: 300s (5 minutes)
- Headroom: 135s — plenty of margin
