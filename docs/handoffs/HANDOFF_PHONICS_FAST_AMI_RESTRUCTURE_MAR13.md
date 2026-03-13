# Handoff: Phonics Fast AMI-Aligned Restructure

**Date:** March 13, 2026
**Sessions:** 4 conversations (context continuations)
**Methodology:** 3x3x3x3 (2 full rounds of 3×3×3 cycles + cross-cycle verifications)
**Status:** COMPLETE, NOT YET PUSHED

---

## What Was Done

Complete restructure of the Phonics Fast tool suite from a flat 4-phase system to an 8-phase AMI Montessori-aligned phonics progression.

### 8-Phase Architecture

| Phase | ID | Series | Focus |
|-------|----|--------|-------|
| Pink 1 | `pink1` | Pink | CVC short-a (cat, hat, map) |
| Pink 2 | `pink2` | Pink | CVC all vowels (dog, pen, sit, cup) |
| Blue 1 | `blue1` | Blue | Initial consonant blends (stop, grin, flag) |
| Blue 2 | `blue2` | Blue | Initial blends continued (frog, drum, swim) |
| Blue 3 | `blue3` | Blue | Final blends & clusters (camp, nest, ring) |
| Green 1 | `green1` | Green | Common digraphs (ship, chat, thin) |
| Green 2 | `green2` | Green | Long vowels & magic-e (cake, bone, tube) |
| Green 3 | `green3` | Green | Phonograms (rain, boat, moon, star) |

### Files Modified (10 files)

**Data layer (1 file):**
- `lib/montree/phonics/phonics-data.ts` — Single source of truth. ALL_PHASES array with 8 phases, ~330 PhonicsWord entries across all groups. Added: 2 new stories (blue2 + blue3), helper functions (`getPhaseWords`, `getCommands`, `getDictionaryWords`), alias exports (`SHORT_STORIES`, `PHONICS_COMMANDS`, `SENTENCE_TEMPLATES`, `SentenceTemplate`, `ShortStory`), renamed `CommandSentenceTemplate.template` → `.pattern`, added `requiredWords: string[]` field, enhanced `getDictionaryWords()` return type to include phase info.

**Hub page (1 file):**
- `app/montree/library/tools/phonics-fast/page.tsx` — Fully dynamic from ALL_PHASES. Zero hardcoded phase IDs. Print All uses `phaseWordSet` for command word highlighting. Phase tabs, word tables, commands, stories all generated dynamically.

**Sub-generators (8 files — all under phonics-fast/):**
- `bingo/page.tsx` — Default phase `'initial'` → `'pink1'`
- `three-part-cards/page.tsx` — Default phase `'initial'` → `'pink1'`
- `stories/page.tsx` — Default phase `'initial'` → `'pink1'`
- `command-cards/page.tsx` — Default phase `'initial'` → `'pink1'`
- `sentence-cards/page.tsx` — Default phase `'initial'` → `'pink1'`, fixed `requiredWords` filter bug (empty array now means "all nouns applicable")
- `labels/page.tsx` — Default phase `'initial'` → `'pink1'`
- `dictionary/page.tsx` — Replaced stale hardcoded `PHASE_CONFIG` with dynamic generation from ALL_PHASES. Fixed phase filtering (was using stale IDs `initial`/`phase2` that don't exist).

### Bugs Found and Fixed

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | CRITICAL | 6 generators | Stale `'initial'` default phase ID → crash on load | Changed to `'pink1'` |
| 2 | CRITICAL | phonics-data.ts | Missing exports (getCommands, getPhaseWords, etc.) | Added 3 functions + 5 alias exports |
| 3 | HIGH | page.tsx (hub) | `cmd.phonicsWords` doesn't exist on CommandSentence | Created `phaseWordSet` from phase words instead |
| 4 | HIGH | phonics-data.ts | `CommandSentenceTemplate` used `template` field, generators access `.pattern` | Renamed field to `pattern`, added `requiredWords` |
| 5 | HIGH | stories/page.tsx | `ShortStory` type not exported | Added `export type ShortStory = PhonicsStory` |
| 6 | MEDIUM | sentence-cards | Empty `requiredWords: []` → zero sentences generated from templates | Treat empty as "all nouns applicable" |
| 7 | MEDIUM | dictionary | `PHASE_CONFIG` hardcoded stale IDs (`initial`, `phase2`) | Dynamic from ALL_PHASES |
| 8 | MEDIUM | dictionary | `getDictionaryWords()` didn't return phase info | Enhanced return type to `(PhonicsWord & { phase: string })[]` |
| 9 | LOW | phonics-data.ts | `log` word in blue2 story not in BLUE_2 phase | Replaced with `brick`, renamed story |

### Photo Bank Integration

`lib/montree/phonics/photo-bank-resolver.ts` — unchanged, already works with PhonicsWord type. Returns `Map<string, string>` matched by case-insensitive exact word label. Checklist of needed photos: `docs/PHONICS_PHOTO_BANK_CHECKLIST.md`

### Known Gaps (Lower Priority)

- `COMMAND_SENTENCE_TEMPLATES` missing for pink1 and blue3 (6/8 phases covered)
- All 15 template `requiredWords` arrays are empty (works correctly with fallback, could be populated for finer control)
- Photo Bank resolver silently falls back to emoji on error (graceful degradation, no user feedback)

### Audit Summary

- 4 conversation sessions with context continuations
- 2 full 3x3x3 rounds (6 build cycles total)
- 3 cross-cycle verifications
- 1 full re-audit pass (final)
- 9 bugs found and fixed (3 CRITICAL, 2 HIGH, 3 MEDIUM, 1 LOW)
- Final state: CLEAN

---

## Deploy

⚠️ NOT YET PUSHED. No new migrations. Include in consolidated push from Mac.

### Files to commit:

```
lib/montree/phonics/phonics-data.ts
app/montree/library/tools/phonics-fast/page.tsx
app/montree/library/tools/phonics-fast/bingo/page.tsx
app/montree/library/tools/phonics-fast/three-part-cards/page.tsx
app/montree/library/tools/phonics-fast/stories/page.tsx
app/montree/library/tools/phonics-fast/command-cards/page.tsx
app/montree/library/tools/phonics-fast/sentence-cards/page.tsx
app/montree/library/tools/phonics-fast/labels/page.tsx
app/montree/library/tools/phonics-fast/dictionary/page.tsx
docs/handoffs/HANDOFF_PHONICS_FAST_AMI_RESTRUCTURE_MAR13.md
```
