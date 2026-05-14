# Session 112 — Reading Framework Making Guide + Pink Phase Lesson Content (May 14, 2026)

Three deliverables shipped this session, all live on the teacher-potato admin site.

## What's live

| Admin tile | Route | Static file | Pages | Pushed |
|---|---|---|---|---|
| 📗 Reading Framework | `/admin/reading-framework` | `public/whale-reading-framework-guide.html` | ~30 web pages | `e42d1035` → `5332b3c3` |
| 📕 Pink Phase Lessons | `/admin/reading-content` | `public/whale-reading-content.html` | ~99 print-pages | `63d3b4ed` |

Both pages are auth-gated through the existing `/api/videos` 401 redirect, framed by a small admin header with Print / Open in new tab / ← Admin buttons, and serve a self-contained HTML document via iframe.

## Commit log this session

```
e42d1035  Admin: Reading Framework making guide
5332b3c3  Reading framework guide: fix stale 'one shelf' subtitle
63d3b4ed  Admin: Pink Phase lesson content (UFLI L1-53)
```

## The making guide — what's in it

`/admin/reading-framework` — the writing-and-reading making guide. 13 work families across 4 shelf zones, the writing-first reframe per Maria Montessori, four-shelf SVG diagram, full make-instructions per work, teacher-to-teacher presentation guide for every material.

**The 13 works:**
1. Classified language baskets (Shelf 1 — Oral)
2. Matching / sequencing tray (Shelf 1)
3. Sound games tray (Shelf 2 — Sound)
4. Mirror (Shelf 2)
5. Metal insets (beside Shelf 3 on stand)
6. Sandpaper letters (Shelf 3 — Writing)
7. Movable alphabet (Shelf 3)
8. Sand tray (Shelf 3)
9. Chalkboards (Shelf 3)
10. Story-paper booklets (Shelf 4 — Reading)
11. Per-lesson card sets (Shelf 4) ← this is what the new Pink-Phase content fills
12. Heart word cards (Shelf 4)
13. ESL minimal-pair cards (Shelf 2, Mandarin-specific drill station)

**Each work entry includes:** purpose, where it lives, what it needs (materials), how to make it (recipe), and **how to present it** — a step-by-step teacher-to-teacher guide. Three-period lesson for sandpaper letters. Five-stage Dwyer sound games. First movable-alphabet word-building moment. What to do when KAT shows up for cat (don't correct). Daily ESL drill mechanics. All written in the voice of an experienced Montessorian explaining to a new one.

The inline SVG shows the wall: four shelves, materials drawn on each level, child composing CAT on the rug in front of the writing shelf, small plant for warmth.

## The lesson content — what's in it

`/admin/reading-content` — the Pink Phase lesson-by-lesson word bank. Closes the gap "the per-lesson card sets reference the generator but never says what's IN them."

**Structure:**

- **Foundations.** Simple View of Reading. Ehri's four phases of word reading (pre-alphabetic → partial → full → consolidated, mapped to UFLI lesson ranges). UFLI's 8-step daily routine. Comparison table showing where the Whale framework beats traditional Pink-Blue-Green / NAMC.

- **Phase 1: The Alphabet (lessons 1-34).** 30 letter lessons, one new letter per day. SATPIN first (s, a, t, p, i, n) so children read sat, pat, tip, pin within 6 lessons. Then m, d, g, o, c, k, ck, e, u, r, h, b, f, l, j, v, w, x, y, z, qu. Each lesson entry: articulation note, spelling words (encoding — movable alphabet), reading words (decoding — word cards), phrase cards, sentence cards, picture-sourcing prompts ("cat illustration kids" / "pan png transparent"), heart words introduced this lesson, and a Mandarin-L1 note flagging which sounds need extra mirror work, tissue-test, or daily contrast drill.

- **Phase 2: CVC consolidation + FLSZ (lessons 35-41).** Seven lessons drilling each vowel to automaticity. L40 is the dedicated Mandarin minimal-pair drill (cat/cot/cut, pen/pin/pan, etc.) — most important lesson in Phase 2 for L1 Mandarin children. L41 closes with the FLSZ doubling rule (puff, doll, miss, buzz).

- **Phase 3: Digraphs + Blends (lessons 42-53).** 12 lessons covering sh, ch, th (unvoiced and voiced), wh, then ending blends (-st, -nd, -nk, -mp), then beginning blends (s-, l-, r-, tw-), then triple blends (str, spl, thr, shr). L44 (TH digraph) flagged as the single hardest English consonant for Mandarin L1 — mirror work mandatory.

- **Heart word schedule.** First 50 heart words mapped to introduction lesson, with the irregular letters flagged for the red-letter coding convention (the heart word card spec from the Making Guide). Schedule: a (L8), I (L10), the (L11), to (L12), was (L14), of (L15), he/she (L18), me/we/be (L19), you/are (L20), here/have (L21), said (L22), for (L23), there/where (L24), do/does (L25), your (L26), what/want (L27), one (L28), two (L29), this (L30), they (L31), that/with/from/would (L34), over (L42), any/many (L44), come/some (L47), who/don't (L50).

- **Picture sourcing playbook.** For each reading word, concrete Canva / Google search prompts. Style consistency tips. Background tips. Print-size guidance.

- **References.** Boyer & Ehri (2011), Ehri (2009), Gough & Tunmer (1986), Lane et al. (2025), NRP (2000), Kou et al. (2024), UFLI Foundations scope and sequence.

## How it was built

Python generator (`outputs/lesson-content/build.py`) defines lesson data as structured dicts, validates every word against the cumulative letter pool, and renders to HTML. ~95 KB document.

**Two-round audit, both passed clean:**

1. **Letter-pool audit** — for each word in each lesson, every letter must be in the cumulative pool of letters taught up to and including that lesson. Caught 3 lessons of violations on first run (back/rock at L17, bed/red at L18, fun/bug at L19). Fixed by swapping to constructible alternatives.

2. **Blend audit** — no 2-consonant clusters (beginning or ending blends, triples) before L47 when blends are formally taught. Phase 1 and Phase 2 lessons are pure CVC + ck/qu/x patterns. Caught 3 lessons with stray blends (L13 'and', L32 'jump/best/help/sand', L41 'fluff/still'). 'and' moved to a heart-word at L13 (UFLI's pragmatic compromise for the highest-frequency conjunction). L32 swapped to clean CVC review. L41 trimmed to pure FLSZ-doubling words.

Both audits run as part of `build.py`. Re-runnable any time.

## Architectural rules locked in this session

These rules are now canonical for any future expansion of the lesson content (Blue Phase L54-83, Green Phase L84-128):

1. **Every word in every lesson MUST be decodable from the cumulative letter pool.** No exceptions for "high-frequency" words — those go through the heart-word path with red-letter irregularity coding.

2. **No blends (2-consonant clusters) before L47.** Phase 1 and Phase 2 lessons are strictly CVC + permitted digraphs (ck, qu, x as single graphemes). The Mandarin-L1 cluster-acquisition curve is the slowest part of the program; pre-exposing them to blends without scaffolding teaches bad habits.

3. **'and' is the one permitted "preview" word.** Introduced as a heart word at L13 because it's the most common English conjunction. Children read it whole until -nd blend is taught at L47. No other "preview" words allowed without explicit justification.

4. **Encoding before decoding, every lesson.** Spelling words list (for movable alphabet) appears BEFORE reading words list (for word cards). The presentation order matters — children build before they read on the same day.

5. **Mandarin-L1 notes are mandatory** on any lesson teaching a sound that has a documented L1 transfer problem. Currently flagged: /ă/ (L6), /t/ final (L7-onwards), /p/ final (L8), /ĭ/ vs /ē/ (L9), /ŏ/ (L14), /ĕ/ vs /ĭ/ (L18), /ŭ/ (L19), /r/ (L20), /b/ vs /p/ (L22), /j/ (L25), /v/ (L26), /z/ vs /s/ (L30), /θ/ TH (L44), consonant clusters (L47+).

6. **Heart word coding is canonical.** Regular letters in BLACK, irregular letters in RED, small red heart icon below each red letter. Card size ~10×6 cm laminated, threaded on a binder ring on Shelf 4. The generator output for heart words MUST follow this spec.

7. **Order of presentation per lesson is fixed:** articulation/mirror → sandpaper letter → spelling (movable alphabet) → reading words → phrase cards → sentence cards → decodable booklet → heart words. This is UFLI's 8-step routine. Do not reorder.

## URLs to verify

Once Railway settles `63d3b4ed`:

- Production admin hub: open `/admin` → tap the pink 📕 "Pink Phase Lessons" tile
- Direct admin route: `/admin/reading-content`
- Direct static file (also auth-bypassable since it's in `/public`): `/whale-reading-content.html`

Same for the making guide:

- Tile: emerald 📗 "Reading Framework"
- Admin route: `/admin/reading-framework`
- Static: `/whale-reading-framework-guide.html`

## What's NOT shipped — for the next session

1. **Blue Phase lesson content (L54-83).** Same structure as Pink. VCe (Magic-e) patterns first, then multisyllabic compounds, then R-controlled vowels, then ending-pattern words (-tch, -dge, -le). Estimated ~3 hours focused work to produce.

2. **Green Phase lesson content (L84-128).** Vowel teams, diphthongs, silent letters, suffixes/prefixes, Greek/Latin roots. Estimated ~3-4 hours.

3. **Visual SVGs per lesson** — the Pink Phase content is currently text-heavy. Could add small per-lesson sketches (the mouth position for articulation, sample card layouts, etc.). Half-day work.

4. **Printable card-set templates** — Canva or HTML templates the teacher could feed lesson-data into to produce ready-to-print picture-word matching sets. Half-day to a day.

5. **Audit script as a standing tool** — `outputs/lesson-content/build.py` is in `outputs/` not in the repo. Could be moved into the repo as `scripts/audit-lesson-content.py` if the content document gets edited going forward.

## Operational notes

- `Whale-Making-Guide-Simple.html` and `Whale-Making-Guide-SimpleV2.html` in the workspace root are local backups of the making guide content. The canonical deployed copy is `public/whale-reading-framework-guide.html`. The three are byte-identical as of `5332b3c3`.

- `public/whale-reading-content.html` is the canonical lesson content. The Python generator that produced it lives at `outputs/lesson-content/build.py` (sandbox-only, not in git). If you want to edit lesson content programmatically in future, that's where to start.

- Admin authentication: both pages call `/api/videos` on mount; 401 redirects to `/admin/login`. This is the same pattern the rest of `/admin/*` uses.

- Print button: works through the iframe's contentWindow. Tested pattern — the same code is in `app/admin/reading-framework/page.tsx`.

## Time and cost

- Making guide build time: ~3 hours (this session's first half + earlier session)
- Lesson content build time: ~2 hours (data definition + Python generator + two audit rounds + fixes)
- Total this session: ~5 hours focused work
- $0 AI cost (no LLM calls — pure deterministic content from research)
- Generator script reusable for Blue Phase and Green Phase later (~1-2 hours each)

## Next session opening prompt

> "Build Blue Phase lesson content (L54-83) following the same structure as Pink Phase. VCe first, then multisyllabic, then R-controlled, then ending patterns. Use `outputs/lesson-content/build.py` as the template. Two-round audit (letter pool + blend integrity) before deploy. Tile to admin hub as 📘 Blue Phase Lessons. Same iframe wrapper pattern."

Or if Blue isn't ready and Tredoux wants to keep iterating on Pink:

> "Add per-lesson visual sketches to Pink Phase. Inline SVGs showing the mouth shape for articulation, sample card layouts, and the cumulative letter pool growing across lessons. Same iframe-in-admin pattern."

---

That's the session. Reading framework architecture complete end-to-end: the **why** (the framework doc), the **how to set up** (the making guide), and the **what to actually teach each day** (the lesson content). All three live on the admin site.
