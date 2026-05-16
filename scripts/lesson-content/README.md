# Lesson content generators

Python generators for the Whale Reading Framework lesson content.

Each script renders:
1. A Whale-branded HTML document for `/admin/reading-content-{phase}` (admin tile)
2. A neutral copy for `/montree/library/language-area/{phase}.html` (public library)

## Files

- `build_blue.py` — Blue Phase (UFLI L54-83): VCe, soft c/g, -tch/-dge, y as vowel, inflections, 2-syllable, r-controlled, open syllables, -le, w-influenced, -all family
- `build_green.py` — Green Phase (UFLI L84-128): vowel teams, diphthongs, silent letters, suffixes, prefixes, Greek + Latin roots, contractions

Pink Phase (`build.py` from Session 112) lives in `outputs/lesson-content/` in the sandbox — not yet ported here. The deployed Pink HTML is canonical at `public/whale-reading-content.html`.

## How to run

```bash
cd whale/scripts/lesson-content
python3 build_blue.py
python3 build_green.py
```

Each script runs a built-in pattern-integrity audit before writing. The audit fails the build if any word in any lesson uses a phonics pattern that hasn't been introduced yet through the cumulative-pattern pool.

## Architectural rules locked in (Session 112)

These rules apply to ALL future lesson content (Pink + Blue + Green):

1. **Every word in every lesson MUST be decodable from the cumulative pool.** No "preview" words except 'and' (function word, introduced as a heart word at L13).
2. **No blends before L47** in any Pink lesson. Phase 1 and Phase 2 are strictly CVC + permitted digraphs.
3. **No silent letters before L104** in any Pink/Blue lesson.
4. **No vowel teams before L84** in any Pink/Blue lesson.
5. **Encoding before decoding, every lesson.** Spelling words list appears BEFORE reading words list.
6. **Mandarin-L1 articulation notes are mandatory** on any lesson teaching a sound with documented L1 transfer problems.
7. **Heart word coding is canonical.** Regular letters BLACK, irregular letters RED, small red heart icon below each red letter.

## Output destinations

After running, copy the produced HTML files into `whale/public/`:

```bash
cp whale-reading-content-blue.html ../../public/
cp whale-reading-content-green.html ../../public/
cp language-area-blue.html ../../public/
cp language-area-green.html ../../public/
```

(The scripts try to write to a couple of known directories automatically; if you're running in a different environment, copy by hand.)
