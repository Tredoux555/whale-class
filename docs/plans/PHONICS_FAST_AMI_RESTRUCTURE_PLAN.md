# Phonics Fast — AMI-Aligned Restructure Plan

**Date:** March 13, 2026
**Methodology:** 3x3x3x3 (3 cycles × 3 plan audits × 3 build audits, fresh research each cycle)
**Scope:** Restructure phonics-data.ts to match Montessori reading progression, fix all data quality issues, make generators fully dynamic

---

## 1. RESEARCH FINDINGS

### AMI vs Color-Coded Series
AMI (Association Montessori Internationale) does NOT prescribe the Pink/Blue/Green color-coded system. That system originated from AMS and individual training centers. However, it is the most widely adopted framework globally and provides excellent structure for material generation. We adopt the color-coded system as the organizing principle but align the CONTENT with AMI language album progression.

### Correct Montessori Reading Progression

**PINK SERIES** — Short vowel, phonetically regular words (CVC pattern):
- Child can decode each letter independently. Every letter makes its most common sound.
- Materials: sandpaper letters → moveable alphabet → object boxes → 3-part cards → booklets
- Words like: cat, mat, sit, pin, dog, cup

**BLUE SERIES** — Words with consonant clusters (blends + digraphs):
- Child handles 4+ letter words where consonants cluster but remain phonetically regular.
- **Consonant digraphs** (two letters → one sound): sh, ch, th, wh
- **Initial consonant blends** (two letters → hear both): bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr, sc, sk, sm, sn, sp, st, sw
- **Final consonant blends**: -nd, -nk, -nt, -mp, -ft, -lt, -sk, -st
- Materials: blue 3-part cards, blue booklets, moveable alphabet with blends

**GREEN SERIES** — Phonograms (letter combinations that represent one sound):
- Child learns that certain letter pairs make special sounds different from their individual sounds.
- **Vowel digraphs/teams**: ai, ay, ee, ea, oa, ow, oo, ue, etc.
- **Split digraphs (Magic E)**: a_e, i_e, o_e, u_e
- **R-controlled vowels**: ar, er, ir, or, ur
- **Complex phonograms**: igh, ough, tion, etc.
- Materials: phonogram sandpaper letters (green), green 3-part cards, phonogram booklets

### Critical Misclassification in Current System

**BLUE_SERIES_2 (vowel digraphs: oa, ee, ai, oo) is currently labeled "Blue" but these are PHONOGRAMS — they belong in the GREEN SERIES.** This is the single biggest structural error.

---

## 2. CURRENT STATE AUDIT

### Files
- `lib/montree/phonics/phonics-data.ts` — 1,100+ lines, 310 words across 6 phases
- `app/montree/library/tools/phonics-fast/page.tsx` — Hub page with hardcoded 6 tabs
- 5 sub-generators: three-part-cards, bingo, labels, command-cards, dictionary, sentence-cards, stories

### Data Quality Issues (57 total)
1. **6 duplicate words** across phases: fig, spoon, stamp, train, snail + stamp within blue4
2. **~50 incorrect isNoun flags** — verbs/adjectives marked as nouns (sad, sit, run, wag, red, beg, wet, dig, big, fit, hit, win, mix, jog, hot, hop, pop, nod, rob, dug, hug, hum, thin, thick, rich, chop, flip, flat, clap, grin, grip, press, skip, smell, smile, smash, snap, spin, sweep, soft, melt...)
3. **Non-pattern words** in blend groups: blanket (CCVCCVC not CCVC), branch (CCVCCC), etc.
4. **Hub page says "4 phases"** but there are 6
5. **Hub tabs are hardcoded** instead of derived from ALL_PHASES
6. **Blue Series 3 last group** lumps 7 different S-blends into one massive group (31 words)
7. **Duplicate emojis**: 🧱 block+brick, 💧 blob+drop, 🐌 slug+snail, etc.
8. **Missing stories** for Blue 3 and Blue 4 phases

---

## 3. RESTRUCTURE PLAN

### New Phase Architecture

| Phase ID | Name | Color | Series | Word Count (target) |
|----------|------|-------|--------|-------------------|
| `pink1` | Pink 1 — CMAT Trays | #10b981 (emerald) | PINK | ~23 |
| `pink2` | Pink 2 — CVC Words | #3b82f6 (blue) | PINK | ~100 |
| `blue1` | Blue 1 — Consonant Digraphs | #6366f1 (indigo) | BLUE | ~24 |
| `blue2` | Blue 2 — Initial Blends | #7c3aed (violet) | BLUE | ~90 |
| `blue3` | Blue 3 — Final Blends | #a855f7 (purple) | BLUE | ~44 |
| `green1` | Green 1 — Vowel Teams | #16a34a (green) | GREEN | ~50 |
| `green2` | Green 2 — Magic E | #15803d (green-dark) | GREEN | ~30 |
| `green3` | Green 3 — R-Controlled | #166534 (green-darker) | GREEN | ~25 |

### Rename Mapping
- `INITIAL_WORDS` → `PINK_1` (same content, new ID `pink1`)
- `PHASE_2_WORDS` → `PINK_2` (same content, new ID `pink2`)
- `BLUE_SERIES_1` → `BLUE_1` (consonant digraphs, keep content)
- `BLUE_SERIES_2` → `GREEN_1` (vowel digraphs — RECLASSIFIED as Green Series)
- `BLUE_SERIES_3` → `BLUE_2` (initial blends, split S-blends into individual groups)
- `BLUE_SERIES_4` → `BLUE_3` (final blends, keep content)
- NEW: `GREEN_2` — Magic E / split digraphs (NEW CONTENT)
- NEW: `GREEN_3` — R-controlled vowels (NEW CONTENT)

### Progression Order (matches Montessori reading sequence)
```
PINK_1 → PINK_2 → BLUE_1 → BLUE_2 → BLUE_3 → GREEN_1 → GREEN_2 → GREEN_3
```

### Data Quality Fixes
1. **Deduplicate all cross-phase words** — keep word in earliest/most-relevant phase only
2. **Fix ALL isNoun flags** — verbs=false, adjectives=false, nouns=true. If ambiguous (e.g., "smile" = both noun and verb), mark true only if the OBJECT form is what a child would picture
3. **Split S-blends** from one 31-word group into 7 individual groups (sc, sk, sm, sn, sp, st, sw) with 4-5 words each
4. **Remove non-pattern words** — blanket, branch, and other words that exceed the target phonetic pattern
5. **Fix duplicate emojis** — every word gets a unique emoji
6. **Add Green Series word lists** with proper phonogram grouping

### Hub Page Changes
1. **Dynamic tabs** generated from ALL_PHASES (no hardcoded TabId type)
2. **Series color grouping** — visual separation between Pink, Blue, Green
3. **Accurate word count** in header
4. **Tab colors match phase.color** instead of hardcoded

### Generator Compatibility
All generators import `ALL_PHASES` dynamically — they will automatically pick up new/renamed phases. The only changes needed:
1. Hub page: make tabs dynamic
2. No changes needed to: three-part-cards, bingo, labels, command-cards (all use `ALL_PHASES` dynamically)
3. Update stories array with new phase IDs
4. Update sentence templates with new phase IDs
5. Update command sentences with new phase IDs

---

## 4. GREEN SERIES WORD LISTS (New Content)

### GREEN_1 — Vowel Teams (moved from current BLUE_SERIES_2 + expanded)
- **ai/ay**: rain, nail, tail, pail, snail, train, hay, play, day, tray, clay, spray
- **ee/ea**: bee, tree, seed, feet, sheep, jeep, bean, leaf, bead, seal, meat, team
- **oa/ow**: boat, coat, goat, soap, toad, road, toast, bow, low, row, flow, snow
- **oo**: moon, boot, spoon, pool, food, hoop, book, hook, cook, wood, foot, hood
- **ue/ew**: blue, glue, clue, true, new, few, dew, chew

### GREEN_2 — Magic E (Split Digraphs)
- **a_e**: cake, lake, gate, name, came, game, made, tape, cave, wave, cage, page
- **i_e**: bike, kite, pine, line, wine, ride, hide, side, time, mine, five, hive
- **o_e**: bone, home, cone, rope, nose, hose, hole, mole, pole, rose, note, tone
- **u_e**: cube, tube, flute, mule, cute, rule, tune, June, dune, prune, fuse, use

### GREEN_3 — R-Controlled Vowels
- **ar**: car, star, jar, bar, farm, barn, card, park, dark, shark, arm, art
- **or**: fork, corn, horn, cord, port, sort, fort, born, torn, worn, cork, storm
- **er/ir/ur**: fern, her, herd, bird, girl, stir, fur, burn, curl, turn, surf, church

---

## 5. EXECUTION PLAN

### Cycle 1: phonics-data.ts Restructure
**Research:** Read current file completely, map all words, identify all cross-references
**Plan:** Rename phases, reorder, fix isNoun, deduplicate, split S-blends
**Build:**
1. Rename INITIAL_WORDS → PINK_1 (id: 'pink1'), PHASE_2_WORDS → PINK_2 (id: 'pink2')
2. Keep BLUE_SERIES_1 as BLUE_1 (id: 'blue1', consonant digraphs)
3. Rename BLUE_SERIES_3 → BLUE_2 (id: 'blue2', initial blends) — split S-blends into 7 groups
4. Rename BLUE_SERIES_4 → BLUE_3 (id: 'blue3', final blends)
5. Move BLUE_SERIES_2 → GREEN_1 (id: 'green1', vowel teams) — expand word lists
6. Add GREEN_2 (id: 'green2', magic e)
7. Add GREEN_3 (id: 'green3', r-controlled)
8. Fix all isNoun flags (~50 corrections)
9. Deduplicate all cross-phase words (6+ fixes)
10. Fix duplicate emojis
11. Remove non-pattern words
12. Update ALL_PHASES array order
13. Update SENTENCE_TEMPLATES phase references
14. Update PHONICS_COMMANDS phase references
15. Update SHORT_STORIES phase references
16. Add new commands/sentences for green phases
**Audit 3×:** Verify no duplicate words, all isNoun correct, all patterns match, all phase refs updated

### Cycle 2: Hub Page + Generator Updates
**Research:** Read all generator files, identify any hardcoded phase references
**Plan:** Make hub dynamic, verify all generators work with new IDs
**Build:**
1. Hub page: dynamic tabs from ALL_PHASES, series color grouping, accurate counts
2. Verify three-part-cards works (uses ALL_PHASES dynamically ✓)
3. Verify bingo works (uses ALL_PHASES dynamically ✓)
4. Verify labels works (uses ALL_PHASES dynamically ✓)
5. Verify command-cards works (uses getCommands by phaseId ✓)
6. Add new short stories for green phases
7. Add sentence templates for green phases
**Audit 3×:** Test each generator mentally with new phase IDs, verify no broken references

### Cycle 3: Cross-Cycle Verification
**Research:** Re-read all modified files
**Plan:** Check for any issues introduced by Cycles 1-2
**Build:** Fix anything found
**Audit 3×:** Final clean verification

---

## 6. WHAT AUSTIN GETS

After this restructure, when the teacher (you) opens Phonics Fast for Austin:

1. **Pink 1 + Pink 2** — Already mastered CVC words ✅
2. **Blue 1** — Consonant digraphs (sh, ch, th, wh) — the current Blue Series 1 you already have ✅
3. **Blue 2** — Initial consonant blends (bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr, sc, sk, sm, sn, sp, st, sw) — THIS IS WHAT AUSTIN NEEDS NEXT
4. **Blue 3** — Final blends (-nd, -nk, -nt, -mp, -ft, -lt, -sk, -st)
5. **Green 1-3** — Phonograms, magic E, r-controlled — the road ahead

For each phase, you can instantly generate:
- **3-Part Cards** with Photo Bank images for the moveable alphabet tray
- **Labels** for word-object matching
- **Command Cards** ("Put the brick on the drum")
- **Bingo boards** for group games
- **Sentence cards** for reading practice
- **Short stories** — decodable readers using only words from that phase + earlier

The progression follows Maria's method: isolate one difficulty at a time, master it, move on.
