# Handoff — Video Certification Overnight Run (Jul 14, 2026)

**Canonical for:** mvgen curriculum-video accuracy work + the full 58-week visual
image/song audit. Read this before touching `scripts/mvgen/curriculum-batch.py`,
`scripts/mvgen/shotlist.py`, `scripts/mvgen/analyze.py`, or anything under
`docs/curriculum/video-audit/`.

**Commits (all pushed to `main`):**
- `94e6a6b8` — mvgen: phrase-aware ordered image-lyric matching (fixes wrong-image-on-lyric)
- `14cbb454` — mvgen certification: audio-hash cache, blob guard, phrase matcher hardening (108 tests) + full 58-week visual audit, generate/reroll manifests, alias layer
- `cfb8fd22` — mvgen: alias refinements from sample certification (W04 up, W28 much-chat)

---

## 1. Mission

Tredoux's overnight mandate, verbatim intent: **every image in the 58-week English
curriculum must be audited against every song that uses it, and the mvgen video maker
must be made 100% accurate** — no wrong image on a lyric, no stranded filler shots, no
cast-consistency drift once video is rendered from it. Two authorizations came with the
mandate: **unlimited Midjourney generation** for whatever the audit turns up as
missing/wrong, and **samples only** — no batch-render across all 58 weeks — **until the
matching engine itself is certified accurate.** This run is that certification pass. The
full-curriculum batch render is explicitly gated on Tredoux's go-ahead after image
generation is complete (see §5).

Two work streams ran in parallel and are both captured here:
1. **Engine accuracy** — fix the matcher so a certified-correct image set renders a
   correct video (§2–3).
2. **Content accuracy** — audit whether the image SET itself (1,000+ files across 58
   weeks) is even correct against what the songs actually say (§4).

These are independent failure modes. An engine can perfectly place images that are
themselves wrong (Sheep drawn 4 different ways); an image set can be perfect and still
render wrong if the matcher ties on the wrong window. Both had to be fixed.

---

## 2. Mechanism — what changed in the matching engine

### 94e6a6b8 — phrase-aware ordered matching (the root fix)
The old matcher scored images against lyrics by unordered token overlap, which let a
short/generic filename tie against multiple lyric windows and land on the wrong one
(the report bug this whole session opened on — Session Jul 13/14). Rewritten to:
- **Ordered phrase matching**: an image's filename tokens must appear as a contiguous
  or near-contiguous phrase in the lyric line, in the SAME order, not just as a bag of
  overlapping words.
- **Per-occurrence scoring**: when a filename's tokens legitimately appear more than
  once in a song (e.g. "cat" appears in ten lines), every occurrence is scored
  independently and the best window wins — instead of the first match silently winning.
- **`shot_report.json`** — every render now emits a self-audit artifact per video:
  which images matched which lines, which images were excluded, and (critically) an
  `unused_multi_token_phrase_present` list — filenames whose tokens genuinely appear
  together as a sung phrase somewhere in the song but were never selected as an anchor
  (a machine-detected miss, not a vibe check).
- **Batch accuracy summary** printed by `curriculum-batch.py` after every render.
- 261-line `test_shotlist_matching.py` added as the first dedicated regression suite
  for the matcher.

### 14cbb454 — the certification hardening pass (108 tests)
Four load-bearing fixes, in order of how bad the bug they close was:

1. **CRIT — audio-hash entered the analysis cache fingerprint.**
   `compute_inputs_fingerprint()` in `analyze.py` previously hashed only lyrics text +
   subs bytes + model name. A regenerated Suno take saved under the SAME filename
   (the normal workflow when Tredoux locks a different take-pick) silently reused the
   PREVIOUS take's word-timing cache — the video would render synced to audio that no
   longer existed on disk. Fingerprint is now
   `sha256(lyrics_text + \x00 + subs_bytes + model + \x00 + AUDIO_BYTES)`, streamed so
   memory stays flat on multi-MB mp3s. Any cache computed before this fix has a stale
   fingerprint and is invalidated automatically (old fingerprints simply don't match
   the new formula, so they get regenerated rather than trusted).

2. **Alignment-blob guard (`_MAX_WORD_SPAN`).** Whisper alignment occasionally
   collapses several sung words into one giant timestamp span (a transcription
   failure, not a real held note). Old threshold was too tight and killed real
   melismas (a genuinely held note like a 3.5s "sat"); raised from 2.5s → **4.5s** so
   real held notes survive as a timed word, while anything still longer than 4.5s is a
   genuine blob and gets **blanked** — the affected span renders subtitle-free rather
   than mis-anchoring an image to garbage timing. Two-pass demote-then-blank backstop
   in `analyze.py` (`_MAX_WORD_SPAN` checked at both the matched-word stage and the
   final backstop stage).

3. **2-letter meaning tokens.** This is a preposition-teaching curriculum — "in", "on",
   "up", "at" are literally the taught vocabulary, and images are named `ox.png`,
   `up.png`, `cat-in-cap.png`. The old 3-character token minimum made every one of
   these unmatchable. Fixed with a declared whitelist,
   `_MEANING_TOKENS = frozenset({"in", "on", "up", "at", "ox", "ax", "go"})`, kept out
   of the (now expanded) stopword set — the stopword list gained the common 2-letter
   function words (is/it/be/by/do/if/am + me/us/hi/ok/oh) that would otherwise hijack
   the shot list, while the meaning tokens stay reachable. A runtime assertion in
   `shotlist.py` enforces the whitelist↔stopword disjointness so a future edit can't
   silently re-break "up"/"in"/"ox" by dropping them back into stopwords. ("what" is a
   taught W8 question word and disambiguates `chick-what.png` from `chick.png` — it's
   4 characters so it never needed the whitelist to survive, but it's called out in the
   same code comment block.)

4. **Per-song image filter.** Each song's shot list now only draws from images that
   are actually sung in THAT song (not the whole week's folder), and `*-coloring.png`
   assets are excluded outright (they're worksheet materials, never video shots). A
   `<4`-image safety fallback widens the pool if a song's own sung-image set is too
   thin to fill a video. `--images-filter all` (test-only escape hatch) keeps every
   non-coloring image if a wider pool is ever needed for debugging.

5. **Tail rule.** A video may never end on an unanchored filler image — the last shot
   is guaranteed to be one that's actually anchored to a sung word/phrase, not
   whatever fell last in file order.

6. **MATCH_TOKEN_GAP (silence-aware).** Matching windows respect actual silence gaps
   in the audio (`MATCH_TOKEN_GAP = 2.5`s) so an image doesn't get anchored across a
   pause that a listener would perceive as two separate lines.

**Result: 108/108 tests green** (`test_shotlist_matching.py` + `test_mvgen_fixes.py`
combined) after this pass.

### The alias layer (`scripts/mvgen/curriculum-video-aliases.json`)
The structural fix underneath the two remaining sample-certification misses (§3): some
curriculum image filenames start with a token that always ties/loses against a more
common competing filename at the only reachable lyric window, even though the correct
disambiguating word IS sung nearby. Renaming the SOURCE file would break the pack/PDF
build pipeline (specs depend on the original filenames), so the alias layer renames the
image **only inside the mvgen project** at build time — the original curriculum file on
disk is never touched.

- **🚨 RULE: an alias's FIRST token must be the sung word it should anchor on.** The
  matcher tokenizes the ALIASED filename, so if the intended anchor word isn't leading
  the new name, the alias just moves the same tie-loss problem one step sideways.
- Merged in `14cbb454`: 10 new week-scoped entries (weeks 04, 26, 46, 47, 48, 49); one
  collision dropped (W26 `zipper.png` already had a different alias — the new mapping
  was skipped, original kept, loud warning emitted).
- Refined in `cfb8fd22` from sample-certification findings (§3):
  - **W04**: `cat-levitating.png` → `up-cat-levitating.png`, `cat-landing.png` →
    `down-cat-landing.png`, `potato-beside-cat.png` → `mat-potato-beside-cat.png`. The
    levitating/landing cat gag is sung on the prepositions "Up!"/"down," — aliasing so
    the match starts on the preposition itself (not "cat", which always tied against
    the far more common `cat-on-mat.png`) fixed a stranded-filler image.
  - **W28**: `chick-much-chat.png` → `much-chat.png`. The song genuinely sings "so much
    chat!" (@15.9–16.3s) and "chat much!" (@20.3–21.08s) as a consecutive phrase, but
    the filename's first token "chick" always tied/lost to the plainer
    `chick-chat.png` at every reachable "chick" window — the matcher flagged this
    itself as `unused_multi_token_phrase_present` even though the phrase IS sung.
    Aliasing to start on "much" fixed it.
- **Tredoux veto note (canon list §5 item 7): weeks 46–49's merged aliases are
  low-confidence** — those four weeks' source ledgers store aliases as
  `{existing-filename: descriptive note}` rather than `{filename: rename}`, so the
  anchor word embedded in the new filename (e.g. `debut-star-dark.png`,
  `debut-horse-corn.png`) was extracted heuristically from note text and may not be the
  literal sung word. **Spot-check these 6 entries before the next mvgen render of
  W46–49.**

`curriculum-batch.py` (`scripts/mvgen/curriculum-batch.py`) is the single driver for all
of this — `--week`/`--level` scope the run, `--images-filter` controls the pooling
behaviour (default `lyrics`), and aliases are applied automatically per-week from the
JSON map before the matcher ever runs.

---

## 3. Sample certification — what was actually rendered and checked

Four sample videos were rendered to `~/Desktop/Music Videos/` and manually reviewed
against their lyric sheets and shot reports to certify the engine fixes above before
authorizing any wider batch run:

- **W20 — 80% line coverage, clean.** No flagged misses.
- **W28 — clean AFTER the much-chat alias fix** (see §2). Pre-alias, this sample is
  what surfaced the `unused_multi_token_phrase_present` self-flag that led to the fix.
- **W04 — 100% line coverage.** The cat flip gag (levitating up / landing down) and the
  song's up/down word-pairs are both correctly anchored post-alias-fix — this was the
  hardest sample in the set because the levitating-cat book is the curriculum's
  signature gag and had to land exactly.
- **W02 — blob-guarded, clean.** The whispered intro correctly renders subtitle-free
  (the `_MAX_WORD_SPAN` blob guard blanking a genuine transcription failure rather than
  mis-anchoring it), 21 irrelevant images from the week's folder were correctly
  excluded by the per-song image filter, and all 4 location images anchored correctly.

**Both self-flagged misses across the four samples (W04's cat, W28's much-chat) were
fixed by alias-layer adjustments alone** — no further matcher-code changes were needed
after `14cbb454`'s hardening pass. This is the evidence basis for calling the engine
certified: the matcher's own self-audit (`unused_multi_token_phrase_present`) caught
its own remaining misses, and every miss it caught was a filename-token problem
(solvable via alias), not a matching-logic problem.

---

## 4. The 58-week visual audit

Independent of the engine work: every non-coloring image across all 58 weeks was
visually reviewed by Sonnet audit agents against every song that could plausibly use
it, checking two things — (a) does the image exist for every sung visual reference, and
(b) where it exists, is it actually correct (right character design, right scene,
consistent with the character's established look elsewhere in the curriculum).

**Artifacts:**
- `docs/curriculum/video-audit/week-NN.json` × 58 — per-week source ledgers (three
  different schema generations across the batch — per-song nested
  `generate`/`wrong_art`/`aliases` on weeks 1–25/31/33–40; a mixed
  `missingFiles`/`missing_assets`/`missing_files` sidecar on weeks 3/26–30/44–45/51–55/57–58;
  fully consolidated top-level arrays on weeks 41–55).
- `docs/curriculum/video-audit/GENERATE_MANIFEST.json` — 122 entries, images that do
  not exist and must be generated.
- `docs/curriculum/video-audit/REROLL_MANIFEST.json` — 133 entries, images that exist
  but are wrong and must be regenerated.
- `scripts/mvgen/curriculum-video-aliases.json` — the merged alias map (§2).
- `docs/curriculum/VIDEO_AUDIT_MASTER_JUL14.md` — the consolidation of all 58 ledgers
  into the two manifests + the canon table + the veto list, reproduced below.
- `docs/curriculum/VIDEO_COVERAGE_AUDIT_JUL14.md` — the separate lyric-line → image
  coverage audit (115 songs: 58 sound-songs, 57 word-songs, W01 is a 1-song
  sound+word exception; **49.0% average line coverage**, **91 critical scene-line
  gaps** across 31/58 weeks, 305 ambiguous image pairs, 390 total unused images).
  Generated by `scripts/curriculum/audit-video-coverage.py`.

Every `GENERATE` entry from the source ledgers was cross-checked against the real
`Week NN/images/` folder on disk — 8 entries mislabeled "generate" in the source
ledgers (filenames tagged "(reroll)"/"(regen)", or files that already existed) were
rerouted into REROLL instead. This on-disk cross-check is why the manifests can be
trusted as an MJ generation work order rather than a re-transcription of the raw
ledgers.

### Totals
- **GENERATE (122):** video-critical 114 · book 1 · nice 7. 28 entries carry an `oref`
  (new art of an already-established character, generated for house-style consistency).
- **REROLL (133):** video-critical 93 · book 30 · nice 10. 91 entries carry an `oref`
  (cast-consistency fix — regenerate to match the canon reference).
- **Aliases:** 10 new week-scoped entries merged; 1 collision dropped (see §2).

**Only weeks 20 and 32 are ledger-clean.** Worst weeks:
- **W50 (13 items)** — the worst single cast-consistency break in the curriculum:
  Sheep rendered in 4 different styles across one book (photorealistic farm sheep vs.
  the canon plush toy vs. two shaggy/matted variants).
- **W58 (12 items)** — graduation crowd scenes point at a single representative
  character reference because no full-cast group shot exists; multiple named cast
  members are simply missing from the crowd renders.
- **W55 (7 rerolls)** — Fly rendered in 3 different styles.
- **W31 (8 items)** — King rendered in 4 different designs (bearded human, white fluffy
  human-faced, silver-crowned bird, and the actual canon round peachy chibi-creature).
- **W09 (6 rerolls)** — 5 different hat designs inside what is supposed to be a
  one-hat book.

**Cross-week patterns worth knowing before generating:**
- **Missing `book:1` anchor assets recur** where a `-coloring.png` twin of the same
  scene already exists — the coloring-page art was made but the corresponding video/
  book-illustration asset never was, across many weeks' GENERATE entries.
- **Potato face drift from W34 onward** — the plain no-face bingo-joke-tile potato
  keeps getting regenerated with a drawn-on face/scarf/smiley, contaminating the
  bridge-gag design (see canon table + veto #2 below).
- **Plush group-shot drift** — whenever a scene needs multiple plush-toy cast members
  together, individual characters' plush materiality (fuzzy felt, soft fabric) tends to
  drift toward photorealistic/generic-crowd rendering.

### Canon table (used for `oref` on cast-consistency fixes)

| Character | Canon reference file |
|---|---|
| Cat | `Week 04/images/cat.png` |
| Sam (peg-doll boy) | `Week 05/images/sam.png` |
| Dad | `Week 10/images/dad.png` |
| Dog | `Week 12/images/dog.png` |
| Rat | `Week 15/images/rat.png` |
| Pup | `Week 16/images/pup.png` |
| Fox | `Week 17/images/fox.png` |
| Ant | `Week 06/images/ant-on-mat.png` |
| Snake | `Week 33/images/snake-spin.png` |
| Sheep | `Week 47/images/sheep-star.png` (plush toy, round white fluffy, kind dark eyes) |
| Star | `Week 51/images/star-looking.png` (soft plush fabric, not metallic) |
| Segina / Girl (peg-doll) | `Week 49/images/girl.png` — explicitly marked canonical in the source ledger (black pigtails w/ red beads, red dress, smooth resin peg-doll skin) |
| King | `Week 31/images/king-sing.png` (round peachy chibi-creature, gold crown) |
| Fly | `Week 55/images/fly.png` — explicitly marked canonical in the source ledger (fuzzy felt plush-toy texture, large amber compound "glass" eyes) |
| Bee | `Week 44/images/bee-tree.png` (realistic gold-and-black honeybee — real-animal style, not plush) |
| Owl | `Week 52/images/owl.png` (realistic tawny owl) |
| Lamb | `Week 56/images/lamb-climbs-free.png` (white curly-fleece — the majority design used in 5/9 book spreads) |
| Potato — plain/no-face (bingo joke-tile) | `Week 42/images/potato-bridge.png` |
| Potato — teaching personality (glasses + whiteboard) | `Week 01/images/10-potato.png` |
| Bug / Beetle | no clean canon found — see veto list #1 |

All paths above are absolute on the Mac under `~/Desktop/English Curriculum 2026/`.

### Tredoux morning veto list

Judgment calls generation will proceed on unless overridden:

1. **Bug/Beetle design is unresolved.** `bug-helps.png` (W55) shows Bug as a
   rubber-tire-wheeled hybrid — flagged as "odd" in its own ledger entry, yet a
   separate fix note for `fly-flies.png` treats that same wheeled design as the thing
   to match for continuity. No `oref` was assigned to any Bug-related reroll. **Default
   assumption: keep the odd wheeled design and align every Bug appearance to
   `bug-helps.png` for continuity**, rather than redesigning Bug as a plain beetle.
   Object if you'd rather redesign Bug clean.
2. **Potato has two canon faces, not one.** The "teaching potato" (glasses +
   whiteboard, personality character, W1/graduation reveal) and the "plain potato" (no
   face, the recurring bingo/joke-tile sight gag used in book bridges) are being
   treated as two intentionally distinct designs. Every W34+ reroll that shows a
   "drawn-on face/scarf/smiley" on the bridge-gag potato is being corrected back to the
   **plain** design. Object if you want one unified potato design instead.
3. **King's canon design = round peachy chibi-creature (`king-sing.png`)**, not any of
   the 3 drifted variants (bearded human, white fluffy human-faced, silver-crowned
   bird). Assumed correct since `king-sing.png` is the only King entry with no ledger
   issue at all.
4. **Sheep's canon = plush toy** (round white fluffy, kind dark eyes, per
   `sheep-star.png`/`sheep-light.png`), not the photorealistic farm sheep seen in
   `sheep.png` (W50) or any of the shaggy/matted variants. This is the worst single
   cast break in the curriculum (W50, 8 files in one book).
5. **Lamb's canon = white curly-fleece** (the majority design, 5 of 9 W56 book
   spreads), not the shaggy tan-grey minority design — per the ledger's own fix
   recommendation.
6. **Group/crowd shots** (`graduation-cast.png` W26, `cast-summit-party.png`/
   `muddy-cast.png` W16, `celebration-scene.png`/`tree-question.png`/
   `potato-reveal.png`/`potato-king.png`/`graduation-cast-full.png` W58) all point their
   `oref` at a single representative peg-doll/plush reference (girl.png or
   sheep-star.png) since no single-file "full cast" reference exists. The actual fix
   (per each entry's own `mj_prompt`/`fix` text) is to include the complete named-cast
   roster, not just to match one character's render style.
7. **Weeks 46–49's merged aliases are low-confidence** (also flagged in §2). Those four
   weeks store aliases as `{existing-filename: descriptive note}` rather than
   `{filename: rename}`, so the anchor word embedded in each new alias filename was
   extracted heuristically from the note text (e.g. `debut-star-dark.png`,
   `debut-horse-corn.png`) and may not be the literal sung word. Spot-check these 6
   entries before the next mvgen render of W46–49.
8. **7 "nice"-priority generate entries were given only a generic synthesized
   mj_prompt** (`mat-coloring.png` W3, `fish-coloring.png` W27, `fish.png` W28,
   `moon-coloring.png` + `book-coloring.png` W51, `potato.png` +
   `potato-coloring.png` W58) since the source ledgers gave no MJ prompt for these —
   they're materials-only reuse gaps (cards/bingo/coloring), not sung-line assets, so
   a generic prompt was judged acceptable rather than holding up the manifest.

---

## 5. ⏳ BLOCKED — Midjourney generation (no Chrome extension connected overnight)

Unlimited MJ generation was authorized for this run, but **no Chrome browser extension
was connected overnight**, so none of the 255 manifest entries (122 GENERATE + 133
REROLL) were actually rendered. This is the single blocking item standing between
"engine certified + gaps identified" and "curriculum 100% video-ready."

### Next-session runbook (when Tredoux opens Chrome)

1. **Connect Chrome** and verify a live browser binding before spawning any MJ agent
   onto it (load a real page, read text back — per the ghost-deviceId lesson in
   `docs/curriculum/PHASE_D_RUN_JUL12.md`).
2. **MJ agents work `GENERATE_MANIFEST.json` + `REROLL_MANIFEST.json`, video-critical
   entries first** (114 of 122 GENERATE, 93 of 133 REROLL — the `book`/`nice` entries
   are lower priority and can trail).
3. **Obey the `PHASE_D_RUN_JUL12.md` MJ automation rules** — proven the hard way across
   that overnight run and still binding:
   - Submit jobs **one at a time with feed verification** — MJ silently drops rapid
     batch submissions.
   - React-textarea native-setter required for prompt entry (React's controlled input
     ignores a plain `.value =` write).
   - Downloads are a **2-step process**: navigate-to-CDN then canvas-download as
     separate JS calls — `a.click()` is silently blocked on the app page itself.
   - **Corner-check every full-res image for hallucinated watermarks.**
   - Use `--oref` from the canon table (§4) for every cast-consistency REROLL — never
     freehand a character's design from the prompt text alone when an `oref` file
     exists.
   - Never iterate isolated-human-anatomy prompts; use children's-book phrasing for any
     dramatic/weather scene (past sessions have had these render unintended dark
     imagery).
4. **Save to `Week NN/images/` under the exact manifest filenames** — the ORIGINAL
   filenames, not the alias-layer names (aliases are a video-project-only rename, never
   applied to the curriculum source).
5. **Move replaced originals** (every REROLL's old file) to
   `English Curriculum 2026/_replaced_video_audit/` — never delete, per the
   established archive-don't-delete pattern from every prior production session.
6. **Re-run the coverage audit**: `scripts/curriculum/audit-video-coverage.py` — refresh
   `VIDEO_COVERAGE_AUDIT_JUL14.md` numbers against the newly-generated/rerolled image
   set.
7. **Re-render fresh W-samples** (pick 3–4 of the weeks with the heaviest rework — W50,
   W58, W55, W31 are good stress tests since they had the worst cast breaks) and
   manually certify them the same way §3 did.
8. **Only on Tredoux's explicit go-ahead**, batch-render all levels:
   `curriculum-batch.py --level 1` / `--level 2` / `--level 3` (or `--week` per-week if
   preferred), with aliases applied automatically. Do NOT batch-render before that
   go-ahead — the standing instruction from this session is samples-only until the
   image set itself is certified, not just the engine.

---

## Resume prompt

> Read `docs/handoffs/HANDOFF_VIDEO_CERTIFICATION_JUL14.md` in full. Check whether a
> Chrome browser extension is connected. If yes: work through §5's runbook — MJ-generate
> `docs/curriculum/video-audit/GENERATE_MANIFEST.json` and
> `docs/curriculum/video-audit/REROLL_MANIFEST.json` (video-critical entries first, using
> `--oref` from the canon table in §4 for every cast-consistency fix), obeying the MJ
> automation rules from `docs/curriculum/PHASE_D_RUN_JUL12.md`. Save under the exact
> original manifest filenames to each week's `images/` folder; archive replaced
> originals to `_replaced_video_audit/`, never delete. Once generation is done, re-run
> `scripts/curriculum/audit-video-coverage.py`, render a fresh set of certification
> samples across the heaviest-rework weeks (W50/W58/W55/W31), and report back. Do NOT
> run a full-curriculum batch render via `curriculum-batch.py` until Tredoux explicitly
> signs off on the sample set — that gate is still standing. If no Chrome extension is
> connected, report that status and stop; do not attempt MJ generation through any other
> channel.
