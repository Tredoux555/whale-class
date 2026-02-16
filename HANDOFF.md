# WHALE HANDOFF - February 16, 2026
## Session 166: Curriculum Expansion (268 → 319 Works)

> **Brain:** `BRAIN.md` (read this first at session start)
> **Previous handoffs:** `docs/HANDOFF_SESSION_165_SCHEMA_FIX.md`

---

## Quick Summary

Expanded the Montessori curriculum from 268 to 319 works across all 5 areas. Added full guide data for every new work. Fixed 54 malformed quick_guide fields. Fixed Docker cache bust so Railway rebuilds with the new data. **User must click "Re-import Master" after Railway deploys.**

---

## What Was Done (3 Commits)

### Commit 1: `808b0532` — Add 45 missing works
- Created `scripts/add-remaining-works.py` to batch-add works to both stem and guide JSON files
- Added works across Language (14), Math (3), Cultural (24), Sensorial (4)
- Each work includes: stem entry + comprehensive guide (quick_guide, presentation_steps, parent_description, why_it_matters)
- Fixed sequence collisions by bumping new works above existing maximums per category

### Commit 2: `39617b7a` — Add 6 PL works + fix 54 malformed quick_guides
- Added 6 missing Practical Life works: Opening/Closing Containers, Nuts/Bolts Board, Stirring, Hammering, Mixing/Stirring Food, Ironing
- Fixed 54 quick_guide fields stored as JSON arrays instead of strings (PL: 32, Math: 13, Cultural: 9)

### Commit 3: `3f7d03db` — Force Railway rebuild
- Updated `ARG CACHEBUST=20260216-CURRICULUM-V2` in Dockerfile
- Removed hardcoded "268 works" from re-import confirm dialog
- Updated force rebuild comment

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/add-remaining-works.py` | **NEW** — Batch data generation script |
| `lib/montree/stem/practical-life.json` | 83 → 89 works |
| `lib/montree/stem/sensorial.json` | 35 → 39 works |
| `lib/montree/stem/language.json` | 43 → 57 works |
| `lib/montree/stem/math.json` | 57 → 60 works |
| `lib/montree/stem/cultural.json` | 50 → 74 works |
| `lib/curriculum/comprehensive-guides/practical-life-guides.json` | 108 → 114 guides + 32 quick_guide fixes |
| `lib/curriculum/comprehensive-guides/sensorial-guides.json` | 35 → 39 guides |
| `lib/curriculum/comprehensive-guides/language-guides.json` | 43 → 57 guides |
| `lib/curriculum/comprehensive-guides/math-guides.json` | 55 → 68 guides + 13 quick_guide fixes |
| `lib/curriculum/comprehensive-guides/cultural-guides.json` | 73 → 82 guides + 9 quick_guide fixes |
| `Dockerfile` | CACHEBUST updated to `20260216-CURRICULUM-V2` |
| `app/montree/dashboard/curriculum/page.tsx` | Removed hardcoded "268 works" from confirm |

---

## Critical Architecture: How Curriculum Data Flows

```
JSON files (stem + guides)
    ↓ static ES import (bundled at build time)
curriculum-loader.ts
    ↓ merges by WORK NAME (case-insensitive)
loadAllCurriculumWorks()
    ↓ called by POST /api/montree/curriculum { action: 'seed_from_brain' }
Supabase: montree_classroom_curriculum_works
    ↓ queried by dashboard pages
UI
```

**Key insight:** Because JSON is bundled at build time, changing the JSON files requires a fresh Docker build. The `CACHEBUST` arg in the Dockerfile must be updated whenever curriculum data changes.

---
## Immediate Action Required

After Railway finishes rebuilding (check Railway dashboard — should take 3-5 min after push):

1. Go to `montree.xyz/montree/dashboard/curriculum`
2. Click **"Re-import Master"** button
3. Confirm the dialog
4. Verify counts: **PL 89, Sensorial 39, Math 60, Language 57, Cultural 74 = 319 total**

If the counts still show 268, the Docker rebuild didn't pick up the new data. In that case:
- Check Railway build logs for the CACHEBUST value
- Try manually triggering a rebuild in Railway dashboard
- As a last resort, pass `CACHEBUST` as a Railway build variable (not just a Dockerfile default)

---

## Verification Data

**Final verified totals:**
- 319 stem works: PL 89 + Sensorial 39 + Math 60 + Language 57 + Cultural 74
- 360 guide entries: PL 114 + Sensorial 39 + Math 68 + Language 57 + Cultural 82
- 316/316 unique stem names matched to guides (100%)
- Zero sequence errors
- Zero malformed quick_guide fields

**New categories created:**
- Math → Measurement (category_seq: 10) — Length Measurement, Weight Measurement
- Cultural → Physical Science (category_seq: 8) — Air, Water, Sound, Light/Shadow, Gravity, Heat experiments

---

## What's Next (Priority Order)

1. **Verify Railway deployment** — Re-import the 319 works into Supabase
2. **Home system rebuild** — Session 165 wrote a 6-phase plan at `.claude/plans/vivid-pondering-cascade.md`. Code against `docs/HOME_LIVE_SCHEMA.md` (NOT migration files!)
3. **Language curriculum reseed** — DB may still have only 18 of 57 language works if re-import hasn't been done

---

## Git Status

All clean. 3 commits pushed to main:
```
3f7d03db Force rebuild with updated curriculum data, fix hardcoded work count
39617b7a Add 6 missing Practical Life works and fix 54 malformed quick_guides
808b0532 Add 45 missing Montessori works across all curriculum areas
```

---

*Updated: February 16, 2026*
*Session: 166 (Curriculum Expansion)*
*Previous: Session 165 (Schema Audit + Rollback + Plan)*
