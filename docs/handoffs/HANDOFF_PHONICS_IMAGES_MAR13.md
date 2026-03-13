# Handoff: Phonics Images + Code Fixes — Mar 13, 2026 (Late Session)

## Summary

Two code quality fixes applied + phonics image download attempted. Images from Pixabay are NOT Montessori-standard (~10% usable). Script needs rewrite with educational-specific search filters.

---

## Code Fixes Applied (2)

### 1. Clap Template Grammar Fix
**File:** `lib/montree/phonics/phonics-data.ts` (line 1350)
**Change:** `'Clap and then {word}.'` → `'Clap and then touch the {word}.'`
**Why:** Original put a noun in an action position ("Clap and then cat" — nonsensical). New version works: "Clap and then touch the cat."

### 2. PrintableMatching useMemo Fix
**File:** `app/montree/library/tools/phonics-fast/sentence-cards/page.tsx`
**Change:** Wrapped Fisher-Yates shuffle page calculation in `useMemo` with stable `sentenceKey` dependency
**Why:** Pictures were re-shuffling on every parent re-render (e.g., changing border color). Now only re-shuffles when actual sentences change.

---

## Phonics Image Download — ATTEMPTED, NOT USABLE

### What Was Done
- Created `scripts/download-phonics-images.py` — Pixabay bulk downloader for all ~420 phonics noun words
- User ran it: **355 downloaded**, 2 failed (pet, kick), 27.8 MB zip
- Images saved to `phonics-images/` folder with subfolders per phase
- Zip at `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/phonics-images.zip`

### Why Images Are Unusable (~90% fail rate)
Reviewed samples from pink1 and pink2. Pixabay returns artistic stock photography, NOT educational materials:

| Word | What Pixabay Returned | Problem |
|------|----------------------|---------|
| cat | Artistic macro of cat's face | Too zoomed, child can't identify |
| bed | Woman sitting on a bed | Inappropriate for children |
| van | Two people on a motorcycle | WRONG OBJECT entirely |
| map | Phone with digital map overlay | Abstract, not recognizable |
| net | Fishing tackle box + net + rod | Too cluttered |
| pin | Sewing pins among thread spools | Too cluttered |
| bat | Fruit bat (animal) | Should be baseball bat for phonics |
| rat | Tiny mouse hidden in vegetation | Can barely see it |
| fog | Mountain landscape at sunset | Too abstract for 3-year-old |
| hat | Hat sitting in a wheat field | Distracting background |

**Montessori standard requires:** Single isolated object, clean/white background, realistic photo or clear illustration, instantly recognizable by a 3-year-old.

### Fix Plan — Rewrite Script with Montessori Filters (Priority for Next Session)

The script needs these changes to produce usable images:

1. **Search for `image_type=illustration`** instead of `photo` — clipart-style images are cleaner
2. **Add "isolated white background" to every search query** — forces clean backgrounds
3. **Add "clipart" or "icon" to search terms** — pushes toward educational-style images
4. **Use `category=education`** filter where applicable
5. **For ambiguous words, use the OBJECT meaning** — "bat" → "baseball bat clipart", not the animal
6. **Consider using `image_type=vector`** — SVG-style results tend to be cleaner single objects
7. **Alternative: Use DALL-E API** to generate consistent isolated objects on white backgrounds (~$0.04/image × 420 = ~$17 total). Would produce perfectly consistent Montessori-standard images.

### Alternative Approaches
- **TPT clipart sets** (~$5-8) — pre-made Montessori CVC image sets, already curated
- **DALL-E bulk generation** — consistent style, white backgrounds, ~$17 for all 420 words
- **Manual Pixabay curation** — keep the ~10% that work, re-search the rest manually

---

## Files Modified This Session (3)

1. `lib/montree/phonics/phonics-data.ts` — 1 line: Clap template fix
2. `app/montree/library/tools/phonics-fast/sentence-cards/page.tsx` — ~15 lines: useMemo wrap
3. `scripts/download-phonics-images.py` — NEW: Pixabay bulk downloader (needs rewrite)

## Files on Mac (not in repo)

- `phonics-images/` — 355 downloaded images in 12 phase subfolders (MOSTLY UNUSABLE)
- `phonics-images.zip` — 27.8 MB zip of above

---

## Deploy Note

The 2 code fixes should be included in the consolidated push. The download script can stay in `scripts/` as a utility. The downloaded images should NOT be committed — they're on the Mac only and need replacement.

⚠️ All previous unpushed work from Mar 8-13 still needs pushing. See Priority #0 in CLAUDE.md.
