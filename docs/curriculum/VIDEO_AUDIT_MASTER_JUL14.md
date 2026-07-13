# Video Audit Master — Jul 14, 2026

Consolidation of all 58 `docs/curriculum/video-audit/week-NN.json` ledgers into three
actionable artifacts:

- `docs/curriculum/video-audit/GENERATE_MANIFEST.json` — every image that does **not exist**
  and must be generated (122 entries).
- `docs/curriculum/video-audit/REROLL_MANIFEST.json` — every image that **exists but is
  wrong** and must be regenerated (133 entries).
- `scripts/mvgen/curriculum-video-aliases.json` — merged word→filename alias map for the
  mvgen video pipeline (10 new entries added, existing W04 entries preserved).

Source ledgers use three schema generations (per-song nested `generate`/`wrong_art`/`aliases`
on weeks 1–25/31/33–40; a mixed `missingFiles`/`missing_assets`/`missing_files` sidecar on
weeks 3/26–30/44–45/51–55/57–58; fully consolidated top-level arrays on weeks 41–55). All three
were normalized into one shape. Every `generate` entry was cross-checked against the real
`Week NN/images/` folder on disk — 8 entries mislabeled "generate" in the source ledgers
(filenames tagged "(reroll)"/"(regen)", or files that already exist) were rerouted into
REROLL instead.

## Totals

**GENERATE (122):** video-critical 114 · book 1 · nice 7. 28 entries carry an `oref` (new art
of an already-established character, generated for house-style consistency).

**REROLL (133):** video-critical 93 · book 30 · nice 10. 91 entries carry an `oref`
(cast-consistency fix — regenerate to match the canon reference).

**Aliases:** 10 new week-scoped entries merged (weeks 04, 26, 46, 47, 48, 49); 1 collision
dropped (week 26 `zipper.png` already had a different alias assigned — the new mapping was
skipped, the original kept). Existing week-04 `_comment` + 2 entries preserved untouched.

## Per-week status (GEN = missing / REROLL = wrong-art; vc=video-critical, bk=book, ni=nice)

| Wk | Generate | Reroll | Status |
|----|----------|--------|--------|
| 01 | 1 (vc1) | 0 | needs work |
| 02 | 1 (vc1) | 0 | needs work |
| 03 | 3 (vc2/ni1) | 3 (vc1/bk2) | needs work |
| 04 | 3 (vc2/bk1) | 1 (vc1) | needs work |
| 05 | 2 (vc2) | 5 (vc5) | needs work |
| 06 | 1 (vc1) | 1 (vc1) | needs work |
| 07 | 0 | 1 (vc1) | needs work |
| 08 | 0 | 2 (vc1/ni1) | needs work |
| 09 | 1 (vc1) | 6 (vc6) | needs work |
| 10 | 3 (vc3) | 4 (vc4) | needs work |
| 11 | 1 (vc1) | 1 (vc1) | needs work |
| 12 | 1 (vc1) | 1 (vc1) | needs work |
| 13 | 1 (vc1) | 4 (vc4) | needs work |
| 14 | 1 (vc1) | 3 (vc3) | needs work |
| 15 | 3 (vc3) | 1 (ni1) | needs work |
| 16 | 3 (vc3) | 3 (vc2/ni1) | needs work |
| 17 | 2 (vc2) | 1 (ni1) | needs work |
| 18 | 2 (vc2) | 0 | needs work |
| 19 | 1 (vc1) | 2 (bk1/ni1) | needs work |
| 20 | 0 | 0 | **clean** |
| 21 | 2 (vc2) | 4 (bk2/ni2) | needs work |
| 22 | 1 (vc1) | 2 (vc2) | needs work |
| 23 | 1 (vc1) | 2 (vc1/bk1) | needs work |
| 24 | 2 (vc2) | 1 (ni1) | needs work |
| 25 | 5 (vc5) | 4 (vc3/ni1) | needs work |
| 26 | 4 (vc4) | 3 (vc3) | needs work |
| 27 | 2 (vc1/ni1) | 3 (vc1/bk2) | needs work |
| 28 | 2 (vc1/ni1) | 0 | needs work |
| 29 | 0 | 1 (bk1) | needs work |
| 30 | 5 (vc5) | 2 (vc1/bk1) | needs work |
| 31 | 3 (vc3) | 5 (vc5) | needs work |
| 32 | 0 | 0 | **clean** |
| 33 | 2 (vc2) | 2 (vc1/bk1) | needs work |
| 34 | 1 (vc1) | 4 (vc3/bk1) | needs work |
| 35 | 3 (vc3) | 3 (vc2/bk1) | needs work |
| 36 | 5 (vc5) | 1 (bk1) | needs work |
| 37 | 4 (vc4) | 3 (bk3) | needs work |
| 38 | 2 (vc2) | 1 (bk1) | needs work |
| 39 | 5 (vc5) | 2 (bk2) | needs work |
| 40 | 5 (vc5) | 4 (vc3/bk1) | needs work |
| 41 | 2 (vc2) | 2 (vc1/bk1) | needs work |
| 42 | 1 (vc1) | 1 (vc1) | needs work |
| 43 | 1 (vc1) | 1 (bk1) | needs work |
| 44 | 1 (vc1) | 0 | needs work |
| 45 | 3 (vc3) | 1 (bk1) | needs work |
| 46 | 1 (vc1) | 1 (bk1) | needs work |
| 47 | 3 (vc3) | 2 (vc1/bk1) | needs work |
| 48 | 3 (vc3) | 1 (bk1) | needs work |
| 49 | 1 (vc1) | 4 (vc4) | needs work |
| 50 | 5 (vc5) | 8 (vc8) | needs work |
| 51 | 5 (vc3/ni2) | 4 (vc3/bk1) | needs work |
| 52 | 3 (vc3) | 2 (vc1/ni1) | needs work |
| 53 | 0 | 2 (vc2) | needs work |
| 54 | 1 (vc1) | 1 (bk1) | needs work |
| 55 | 0 | 7 (vc7) | needs work |
| 56 | 1 (vc1) | 4 (vc4) | needs work |
| 57 | 1 (vc1) | 0 | needs work |
| 58 | 6 (vc4/ni2) | 6 (vc5/bk1) | needs work |

Only weeks 20 and 32 are ledger-clean. Heaviest rework: W50 (13 items, worst Sheep
cast-consistency break across the curriculum), W55 (7 rerolls, Fly rendered in 3 different
styles), W58 (12 items, graduation crowd + missing cast members), W09 (6 rerolls, 5 different
hat designs in a one-hat book), W31 (8 items, King rendered in 4 different designs).

## Canon table (used for `oref` on cast-consistency fixes)

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
| Segina / Girl (peg-doll) | `Week 49/images/girl.png` — **explicitly marked canonical in the source ledger** (black pigtails w/ red beads, red dress, smooth resin peg-doll skin) |
| King | `Week 31/images/king-sing.png` (round peachy chibi-creature, gold crown) |
| Fly | `Week 55/images/fly.png` — **explicitly marked canonical in the source ledger** (fuzzy felt plush-toy texture, large amber compound "glass" eyes) |
| Bee | `Week 44/images/bee-tree.png` (realistic gold-and-black honeybee — real-animal style, not plush) |
| Owl | `Week 52/images/owl.png` (realistic tawny owl) |
| Lamb | `Week 56/images/lamb-climbs-free.png` (white curly-fleece — the majority design used in 5/9 book spreads) |
| Potato — plain/no-face (bingo joke-tile) | `Week 42/images/potato-bridge.png` |
| Potato — teaching personality (glasses + whiteboard) | `Week 01/images/10-potato.png` |
| Bug / Beetle | **no clean canon found — see veto list** |

All paths above are absolute on the Mac under `~/Desktop/English Curriculum 2026/`.

## Tredoux morning veto list

Judgment calls generation will proceed on unless you object:

1. **Bug/Beetle design is unresolved.** `bug-helps.png` (W55) shows Bug as a rubber-tire-wheeled
   hybrid — flagged as "odd" in its own ledger entry, yet a separate fix note for
   `fly-flies.png` treats that same wheeled design as the thing to match for continuity. No
   `oref` was assigned to any Bug-related reroll. **Default assumption: keep the odd wheeled
   design and align every Bug appearance to `bug-helps.png` for continuity**, rather than
   redesigning Bug as a plain beetle. Object if you'd rather redesign Bug clean.
2. **Potato has two canon faces, not one.** The "teaching potato" (glasses + whiteboard,
   personality character, W1/graduation reveal) and the "plain potato" (no face, the recurring
   bingo/joke-tile sight gag used in book bridges) are being treated as two intentionally
   distinct designs. Every W34+ reroll that shows a "drawn-on face/scarf/smiley" on the
   bridge-gag potato is being corrected back to the **plain** design. Object if you want one
   unified potato design instead.
3. **King's canon design = round peachy chibi-creature (`king-sing.png`)**, not any of the 3
   drifted variants (bearded human, white fluffy human-faced, silver-crowned bird). Assumed
   correct since `king-sing.png` is the only King entry with no ledger issue at all.
4. **Sheep's canon = plush toy** (round white fluffy, kind dark eyes, per `sheep-star.png`/
   `sheep-light.png`), not the photorealistic farm sheep seen in `sheep.png` (W50) or any of
   the shaggy/matted variants. This is the worst single cast break in the curriculum (W50, 8
   files in one book).
5. **Lamb's canon = white curly-fleece** (the majority design, 5 of 9 W56 book spreads), not
   the shaggy tan-grey minority design — per the ledger's own fix recommendation.
6. **Group/crowd shots** (`graduation-cast.png` W26, `cast-summit-party.png`/`muddy-cast.png`
   W16, `celebration-scene.png`/`tree-question.png`/`potato-reveal.png`/`potato-king.png`/
   `graduation-cast-full.png` W58) all point their `oref` at a single representative
   peg-doll/plush reference (girl.png or sheep-star.png) since no single-file "full cast"
   reference exists. The actual fix (per each entry's own `mj_prompt`/`fix` text) is to
   include the complete named-cast roster, not just to match one character's render style.
7. **Weeks 46–49's merged aliases are low-confidence.** Those four weeks store aliases as
   `{existing-filename: descriptive note}` rather than `{filename: rename}`, so the anchor
   word embedded in each new alias filename was extracted heuristically from the note text
   (e.g. "debut-star-dark.png", "debut-horse-corn.png") and may not be the literal sung word.
   Spot-check these 6 entries before the next mvgen render of W46–49.
8. **7 "nice"-priority generate entries were given only a generic synthesized mj_prompt**
   (`mat-coloring.png` W3, `fish-coloring.png` W27, `fish.png` W28, `moon-coloring.png` +
   `book-coloring.png` W51, `potato.png` + `potato-coloring.png` W58) since the source
   ledgers gave no MJ prompt for these — they're materials-only reuse gaps (cards/bingo/
   coloring), not sung-line assets, so a generic prompt was judged acceptable rather than
   holding up the manifest.
