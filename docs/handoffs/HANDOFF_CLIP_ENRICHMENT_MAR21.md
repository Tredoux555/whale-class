# CLIP Signature Enrichment — Handoff Document

**Date:** March 21, 2026
**Priority:** #1 — Do this FIRST in the next session
**Status:** NOT STARTED — requires fresh chat with full context budget

---

## THE PROBLEM

Smart Capture uses CLIP (SigLIP ViT-B/16, ONNX Runtime) to identify Montessori works at $0.00 cost before falling back to Haiku ($0.0006) or Sonnet ($0.06). But CLIP text embeddings are only as good as the visual descriptions they're generated from.

**Current state:**
- `lib/montree/classifier/work-signatures.ts` has **156 entries** with descriptions
- **~173 standard curriculum works have NO CLIP entry** — they fall through to expensive Haiku/Sonnet
- Many existing descriptions are too generic (e.g., "A child matching pairs" — could be 10 different works)
- Color Tablets was repeatedly misidentified as Fabric Matching because descriptions overlapped

**Proof the fix works:** We rewrote Color Box 1/2/3 and Fabric Matching descriptions this session to maximize visual distinction (rigid/painted/glossy vs soft/cloth/textile). Same approach needed for ALL 329 works.

---

## THE TASK (3 parts)

### Part 1: Rewrite all 156 existing CLIP descriptions (~2-3 hours of writing)

For each of the 156 works in `work-signatures.ts`, rewrite `visual_description` to be:

1. **Photo-specific** — What would a phone camera see from 1-2 meters away? Not what the work IS, but what it LOOKS LIKE.
2. **Material-first** — Lead with material composition (wood, metal, plastic, fabric, paper, beads, rods)
3. **Distinguishing features** — What makes this visually DIFFERENT from its confusion pairs
4. **Anti-confusion** — Explicitly state what it is NOT (e.g., "NOT fabric", "NOT number rods")
5. **Action verbs** — What the child's hands are DOING (stacking, pouring, tracing, threading)

**Template for good descriptions:**
```
"[MATERIAL TYPE] [OBJECT SHAPE/SIZE] with [COLOR/TEXTURE]. Child [ACTION WITH HANDS].
[KEY DISTINGUISHING FEATURE]. NOT [confusion pair description]."
```

**Example (Color Box 1 — already fixed):**
```
"Rigid flat WOODEN or PLASTIC painted color tablets, smooth glossy surface, bright saturated
solid colors (red, yellow, blue). Small rectangular HARD pieces with visible paint coating,
NOT fabric. Child LOOKING at colors to match pairs visually."
```

### Part 2: Add CLIP signatures for remaining ~173 works (~2-3 hours)

The full curriculum has ~329 works across 5 areas. Only 156 have CLIP entries. The missing ones need new entries added to `work-signatures.ts`.

**To find missing works:** Compare `work-signatures.ts` entries against the 5 curriculum JSON files:
- `lib/curriculum/data/practical_life.json`
- `lib/curriculum/data/sensorial.json`
- `lib/curriculum/data/mathematics.json`
- `lib/curriculum/data/language.json`
- `lib/curriculum/data/cultural.json`

Each missing work needs a full entry:
```typescript
{
  work_key: "area_work_name",
  name: "Work Name",
  area_key: "area",
  category: "Category",
  visual_description: "Detailed photo-specific description...",
  key_materials: ["Material 1", "Material 2"],
  confusion_pairs: ["similar_work_key_1"],
  difficulty: "easy" | "medium" | "hard",
}
```

### Part 3: Custom work Sonnet-analysis on first photo (code change, ~30 min)

When a teacher uploads a photo of a custom work (not in standard curriculum), use Sonnet ONE TIME to generate a detailed visual description, then store it in `montree_visual_memory` so CLIP can use it for all future photos of that custom work.

**Current state:** First-capture learning already exists in `photo-insight/route.ts` (lines ~1590-1680) but uses Haiku with a generic prompt. Needs:
1. Use Sonnet (not Haiku) for custom work first-capture — quality matters here
2. Prompt should generate CLIP-optimized description (material, color, texture, shape, action)
3. Store with confidence 1.0 (teacher explicitly tagged it, so the description is for the RIGHT work)
4. Description injected into CLIP text embeddings at runtime for future matching

**Where the code lives:**
- First-capture chain: `photo-insight/route.ts` lines ~1590-1680
- Visual memory query: `photo-insight/route.ts` lines ~870-905
- CLIP classifier: `lib/montree/classifier/clip-classifier.ts`

---

## APPROACH FOR NEXT SESSION

**Recommended: Use parallel agents (5 agents, one per area)**

Each agent:
1. Read the curriculum JSON for their area
2. Read existing entries in work-signatures.ts for that area
3. Research each work (what it looks like, materials, common photos)
4. Write detailed CLIP descriptions for ALL works in that area
5. Output the complete TypeScript array entries

Then assemble all 5 outputs into the final file.

**Key Montessori areas:**
- **Practical Life** (~70 works): Pouring, spooning, folding, dressing frames, food prep, cleaning
- **Sensorial** (~65 works): Pink Tower, Brown Stair, Cylinder Blocks, Color Boxes, Sound Cylinders
- **Mathematics** (~80 works): Number Rods, Spindle Boxes, Golden Beads, Stamp Game, Bead Chains
- **Language** (~70 works): Sandpaper Letters, Moveable Alphabet, Pink/Blue/Green Series, Grammar
- **Cultural** (~44 works): Maps, Land/Water Forms, Botany, Zoology, Science experiments

---

## FILES TO MODIFY

1. `lib/montree/classifier/work-signatures.ts` — Main file (rewrite descriptions, add missing works)
2. `app/api/montree/guru/photo-insight/route.ts` — Custom work first-capture (upgrade Haiku → Sonnet)

---

## WHAT WAS DONE THIS SESSION (Mar 21, 2026)

### Smart Capture 20x Overhaul — 32 fixes across 5 files

Full 5-round methodology: 20x AUDIT → 20x PLAN → 20x BUILD-AUDIT-FIX → 10x HEALTH CHECK → 10x FINAL AUDIT.

**Key fixes:**
- Route-level 45s AbortController on photo-insight
- Safe `clipResult?.` with `?? null` (was forced non-null)
- CLIP pipeline mutex (pipelineQueue promise chaining)
- Init re-entrance guard with 60s timeout
- Cache keys: all include child_id now
- Sonnet/first-capture timeouts reduced to 40s
- NaN confidence validation
- STATUS_RANK: added 'unclear': 0 (consistency fix)
- evictStale(): cleanup retryTimeouts
- Idempotency dedup in corrections
- Case-insensitive work lookup
- suggested_crop in cache hit response

### CLIP Embedding Rewrite (Color Tablets vs Fabric Matching)

Rewrote 4 work descriptions (Color Box 1/2/3, Fabric Matching) to maximize visual distinction. Proved the approach works — same methodology needed for all 329 works.

### Deep Audit

6 parallel agents verified all 32 fixes. Found 1 additional issue (STATUS_RANK inconsistency) — fixed.

---

## DEPLOY STATUS

⚠️ NOT YET PUSHED (VM disk full, ENOSPC). Push from Mac:

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add \
  app/api/montree/guru/photo-insight/route.ts \
  app/api/montree/guru/photo-enrich/route.ts \
  app/api/montree/guru/corrections/route.ts \
  lib/montree/classifier/clip-classifier.ts \
  lib/montree/photo-insight-store.ts \
  lib/montree/classifier/work-signatures.ts \
  docs/handoffs/HANDOFF_SMART_CAPTURE_20X_BUILD_MAR21.md \
  docs/handoffs/HANDOFF_CLIP_ENRICHMENT_MAR21.md \
  CLAUDE.md
git commit -m "fix: Smart Capture 20x overhaul — 32 fixes + CLIP embedding rewrite for Color Tablets vs Fabric Matching"
git push origin main
```
