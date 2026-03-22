# Handoff: CLIP Signature Full Enrichment — Next Session

**Date:** Mar 21, 2026 (continuation session)
**Priority:** #0 — THE most important task for Smart Capture

---

## Context

The Smart Capture system has a three-tier classification pipeline:
1. **CLIP ($0.00, ~150ms)** — SigLIP ViT-B/16 compares photo embeddings against text embeddings of work descriptions
2. **Slim Haiku ($0.0006, ~2-3s)** — If CLIP is confident, Haiku enriches with mastery assessment
3. **Full Two-Pass ($0.006)** — Fallback when CLIP isn't confident

CLIP's accuracy depends ENTIRELY on the quality of the text descriptions in `work-signatures.ts`. Currently all 270 works have entries, but many use generic curriculum descriptions that cause confusion (e.g., Color Tablets misidentified as Fabric Matching because both said "matching pairs").

The Mar 21 session proved the approach works: rewriting Color Box 1/2/3 + Fabric Matching with material-first, photo-specific descriptions maximized visual distinction.

---

## ⚠️ CRITICAL: Work Count is 270, NOT 329

**The correct number of works in the Montessori curriculum is 270.**

The "329" number that appears throughout CLAUDE.md is WRONG — it propagated from an early community library seed that may have included duplicates or extra entries. The source of truth is the 5 curriculum JSON files:

| Area | Works |
|------|-------|
| Practical Life | 83 |
| Sensorial | 35 |
| Mathematics | 57 |
| Language | 45 |
| Cultural | 50 |
| **Total** | **270** |

Verified by:
- Direct JSON file analysis (each work counted)
- `work-signatures.ts` header comment: "PL=83, SE=35, MA=57, LA=45, CU=50 = 270 total"
- `loadAllCurriculumWorks()` in `curriculum-loader.ts` loads from these same 5 files

**Fix CLAUDE.md:** Replace all 15 instances of "329" with "270" (except the community seed UI reference which may legitimately show 329 from its own DB table).

---

## The Task

Rewrite ALL 270 work descriptions in `lib/montree/classifier/work-signatures.ts` from scratch. Every single one needs a detailed, photo-specific visual description that maximizes CLIP classification accuracy.

### Files

- **Target file:** `lib/montree/classifier/work-signatures.ts` (currently ~1,781 lines, 270 entries)
- **Source data:** `lib/curriculum/data/{practical_life,sensorial,mathematics,language,cultural}.json`
- **Reference:** Existing 270 entries (many are generic — replace ALL)

### Quality Standard (EVERY description MUST follow this)

1. **Material-first:** Lead with exact physical composition — "rigid wooden painted tablets" not "color matching activity"
2. **Photo-specific:** Describe what a phone camera sees from 1-2 meters — the materials on the table/mat, the child's hand position, the container/tray
3. **Anti-confusion:** Explicitly call out what it is NOT — "NOT soft cloth (that's Fabric Matching)"
4. **Action verbs:** What the child's hands are DOING — stacking, pouring, tracing, threading, matching, pinching
5. **Distinguishing features:** Color, size, shape, texture, arrangement, container type
6. **NEVER generic:** "A child matching pairs" could be 10 different works

### Approach

Use 5 parallel agents (one per Montessori area). Each agent:
1. Reads the curriculum JSON for their area
2. Reads existing entries in work-signatures.ts for their area
3. Deep-dives each work — research what it physically looks like in a real classroom photo
4. Writes a new entry for EVERY work in that area
5. Returns the complete area signatures object

Then assemble all 5 into the final file.

### Known Confusion Pairs to Address

These works get confused because they share visual similarities. Descriptions MUST emphasize the distinguishing material/action:

| Pair | Key Distinction |
|------|----------------|
| Color Tablets vs Fabric Matching | Rigid wooden painted squares vs soft cloth swatches |
| Red Rods vs Number Rods | Uniform red wood vs alternating red/blue bands |
| Cylinder Blocks vs Knobless Cylinders | Wooden block with brass-knobbed holes vs free-standing colored cylinders |
| Sandpaper Letters vs Sandpaper Numerals | Letters on pink/blue boards vs numerals on green boards |
| Metal Insets vs Geometric Cabinet | Metal frames with removable shapes vs wooden cabinet with drawers |
| Pink/Blue/Green Object Boxes | Pink = CVC objects, Blue = blend objects, Green = phonogram objects |
| Bead Stair vs Golden Beads | Colored short bead bars (1-9) vs golden unit/ten/hundred/thousand |
| Movable Alphabet vs Sandpaper Letters | Loose wooden/plastic letters in box vs textured letters on boards |

---

## What Was Done This Session (Continuation)

### Completed Tasks from Handoff

1. **✅ Push Code** — All Mar 21 session changes pushed to main
2. **✅ Upload Streamlining** — Parallel uploads (3 concurrent), smallest-first, progress events with ETA/speed
3. **✅ Deep Audit** — 2 full cycles, 16 rounds, 40+ agents, 7 fixes, 6 consecutive clean passes
4. **✅ CLAUDE.md Update** — Session work documented

### 7 Audit Fixes Applied

**photo-insight/route.ts (3):**
- Route abort chaining for first-capture Haiku
- Fire-and-forget catch failsafe
- First-capture 40s timeout with cleanup

**photo-enrich/route.ts (1):**
- NaN confidence check in validateToolOutput

**corrections/route.ts (3):**
- Security: child_id filter on media fallback query
- Visual memory confidence guard (don't overwrite higher confidence)
- Silent catch → logged catch + success:false on all 8 error responses

### Push Command (from Mac)

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/api/montree/guru/photo-insight/route.ts app/api/montree/guru/photo-enrich/route.ts app/api/montree/guru/corrections/route.ts lib/montree/offline/sync-manager.ts hooks/usePhotoQueue.ts components/montree/media/PhotoQueueBanner.tsx CLAUDE.md
git commit -m "fix: upload parallelization + 7 deep audit fixes across Smart Capture"
git push origin main
```

---

## System State

- **Smart Capture pipeline:** Production-ready. 6 consecutive clean audit passes.
- **CLIP classifier:** Working but accuracy limited by description quality → THIS task fixes that.
- **Upload system:** Now parallel (3 concurrent) with progress UI.
- **All code:** In working tree, needs push from Mac (see command above).
