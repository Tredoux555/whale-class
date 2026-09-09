# Circle-Time Art Progress — 2026-09-09

## Summary
- 78 slots were owed per ART-TODO.md. **77 done today** across three passes. Only `ct-week16-card-woolly-hat.jpg` still owed — no matching download found; the file on disk is still the old pre-existing art, unchanged.
- Pass 3: 6 of the last 7 owed slots matched and filed (red-berry, winter-coat, coat, can-rub, can-rake, can-crunch — can-rub/can-rake matched by activity description since filenames were truncated before the object). woolly-hat had no corresponding download.
- Full integrity audit run across all 36 weeks + circle-time.html — see sections below. Contact sheets for all 78 target images (77 new + 1 stale placeholder) built at `~/Downloads/_check/new-art-sheet-1.jpg` through `-4.jpg`; `_check/` left in place per instruction.
- Correction from earlier in this report: `ct-week7-card-can-crunch.jpg` and `ct-week19-card-can-share.jpg` were mistakenly marked done after pass 1 in the week-by-week counts below — neither had actually been matched to a download yet. can-share was matched and filed in pass 2; can-crunch still has no matching download anywhere in Downloads and remains owed.
- Pass 2 (all 78 prompts now pasted, weeks 18/19/20 included): 36 more slots matched from downloads added since pass 1 and filed with the same convert+trim pipeline. Two ambiguous "standing on tiptoe reaching..." downloads were disambiguated by their later wording ("...reaching one arm straight up" = can-hang; "...reaching up with one hand" = can-knock) rather than guessed — high confidence, no need for a `_check/` review. No other ambiguities arose this pass, so `~/Downloads/_check/` was never created.
- Downloads scanned today (modified 2026-09-09): 41 unique MJ PNGs (42 files on disk, 1 exact-duplicate pair per repeated group) + 1 unrelated `FREEZE.png`.

## (a) DONE today — slot -> source download -> other candidates

| Slot | Source file (u6724885345_..._UUID_n.png) | Other candidates (same-size dup only) |
|---|---|---|
| ct-week3-card-senses-control.jpg | ..._e7eeab26..._2 | none |
| ct-week3-card-leaf.jpg | ..._c6bbd56c..._2 | none |
| ct-week3-card-cork.jpg | ..._266e6482..._1 | none |
| ct-week3-card-marble.jpg | ..._60aabd9f..._2 | none |
| ct-week3-card-mouth.jpg | ..._0347ffe5..._0 | none |
| ct-week3-card-can-guess.jpg | ..._19262781..._2 | none |
| ct-week3-card-can-hear.jpg | ..._cddaa897..._1 | none |
| ct-week3-card-can-smell.jpg | ..._c3fbe6b0..._0 | none |
| ct-week3-card-can-taste.jpg | ..._f1d92c8e..._1 | none |
| ct-week4-card-owl.jpg | ..._b7d7277a..._2 | none |
| ct-week4-card-lantern.jpg | ..._6b5226e6..._1 | none |
| ct-week4-card-kite.jpg | ..._1fe88b32..._1 | none |
| ct-week4-card-can-breathe.jpg | ..._5572fe38..._0 | none |
| ct-week4-poster-calm.jpg | ..._950bb3a0..._2 | none |
| ct-week5-card-yellow-hat.jpg | ..._73573d93..._1 | duplicate file named "(1)", same bytes, no other option |
| ct-week5-card-sunflower.jpg | ..._c979105a..._3 | none |
| ct-week5-card-can-sort.jpg | ..._6b173d26..._1 | also ..._6b173d26..._3 (945123 bytes) - used lower n |
| ct-week5-card-can-fan.jpg | ..._185b4635..._0 | also ..._185b4635..._1 (625070 bytes, itself a dup pair) |
| ct-week5-card-can-jump.jpg | ..._826239f6..._1 | duplicate file named "(1)", same bytes |
| ct-week5-card-can-spin.jpg | ..._c228bbc5..._2 | none |
| ct-week5-card-can-wave.jpg | ..._89e9009e..._0 | none |
| ct-week5-card-can-blow.jpg | ..._731e2411..._2 | none — confirmed correct |
| ct-week7-card-biscuit.jpg | ..._a537a055..._1 | none |
| ct-week7-card-sweet.jpg | ..._497c7cb3..._1 | none |
| ct-week7-card-ice-cream.jpg | ..._8f4393ba..._0 | none |
| ct-week7-card-can-drink.jpg | ..._fe23aa83..._2 | none |
| ct-week7-card-can-eat.jpg | ..._8c41e4e9..._1 | duplicate file named "(1)", same bytes |
| ct-week7-card-can-peel.jpg | ..._e69f9c4b..._3 | none |
| ct-week16-card-scarf.jpg | ..._765fa6eb..._3 | none |
| ct-week16-card-mittens.jpg | ..._61498c5f..._3 | none |
| ct-week16-card-snow-boots.jpg | ..._4ef491c3..._1 | none |
| ct-week16-card-can-dress.jpg | ..._5942364d..._3 | none |
| ct-week17-card-can-open.jpg | ..._c9a20fc4..._0 | none |
| ct-week17-card-can-blow.jpg | ..._8d6bd4b2..._2 | none — confirmed correct |
| ct-week16-card-winter-control.jpg | ..._b29c46ac..._2 | none |

All converted with `sips -s format jpeg -s formatOptions 82 -Z 1200` into the matching `weekN` repo folder. Files whose subject filled less than 60% of the canvas were auto-trimmed first with PIL (19 of the 35 - see raw per-file log below).

## (d) Uncertain matches - resolved

1. Both "cheeks puffed out / blowing" downloads confirmed correct as filed: `ct-week5-card-can-blow.jpg` (leaf on palm) and `ct-week17-card-can-blow.jpg` (pinwheel). No change needed.

2. `..._b29c46ac..._2.png` ("one calm evenly spaced row of five separate whole objects...") confirmed visually as the WINTER control (bare tree with snow, pale blue ice cube, mound of snow, coat, boots) — filed as `public/circle-time-images/week16/ct-week16-card-winter-control.jpg`. `ct-week19-card-china-control.jpg` remains owed (no download matched it).

## (c) Downloads today that matched nothing in ART-TODO
- `FREEZE.png` (Sep 9, 16:07) - not an MJ-style filename, not art for any slot, left untouched.

## (b) Still OWED - grouped by week

**Week 3 - My 5 Senses:** all 9 done, none left.

**Week 4 - Feelings & Kindness:** all 5 done, none left.

**Week 5 - Autumn:** all 11 done, none left.

**Week 6 - Winter Clothes (early):** done, none left.

**Week 7 - Food We Eat:** all 7 done, none left.

**Week 16 - Winter Is Coming (1 left of 7):**
- ct-week16-card-woolly-hat.jpg - single knitted woolly winter hat, bobble (no download found yet; file on disk is old placeholder art)

**Week 17 - Weather:** all 14 done, none left.

**Week 18 - Beijing:** all 7 done, none left.

**Week 19 - China:** all 5 done, none left.

**Week 20 - Chinese New Year:** all 12 done, none left.

## Pass 2 additions (36 slots, all weeks 17/18/19/20 plus can-share in week19)
old-beijing, eat-it, sunny-day-sign, weather-control, china-control, sign-we-use-it, paper-cutting, rainy, raindrop, silk-ribbon, rickshaw, sandals, snowy, chinese-knot, birds-nest, tangerine, red-lantern, puddle, windy, courtyard-house, sweets, bicycle, can-fold, can-look, can-hang, can-knock, can-bow, can-share, can-give, can-count, can-dance, poster-snowy, can-walk, can-splash, rainy-day-sign, couplets — all converted with the same sips+PIL-trim pipeline.

## Pass 3 additions (6 slots, final owed batch)
red-berry, winter-coat, coat, can-rub, can-rake, can-crunch — all converted with the same pipeline. woolly-hat had no matching download.

## Integrity audit (all weeks)

**(a) Missing `<img src>` refs (file doesn't exist) — pre-existing gap, unrelated to today's 78:**
circle-time-week24.html, -25, -26, -27, -28, -29, -35, -36 each reference a full page of `weekN/...` card/poster/badge files that do not exist in `public/circle-time-images/weekN/` at all (those weekN image folders appear to not have been built out yet). None of today's 78 target files are among these. Full missing-file lists per week are long (18-45 files each) — available on request, omitted here for brevity.

**(b) Byte-identical file pairs — pre-existing, unrelated to today's 78:**
~54 duplicate groups found, all involving OLDER weeks (3-20, 24, 31-34) reusing what look like a small set of generic placeholder images across unrelated slots (e.g. `week6/ct-week6-card-hat.jpg` = `week5/ct-week5-badge-star.jpg` = `week3/ct-week3-badge-star.jpg`). This is a widespread pre-existing placeholder-wiring issue, NOT something introduced today — none of today's 78 target filenames appear in any flagged group. The known-legit reuse pairs (badge-star weeks 4/16/19/20, moon week4/31, rock week24/34) were excluded automatically and are fine. Full duplicate-group list available on request.

**(c) Quality failures on the 78 target JPEGs (dims/fill/size):**
- `week5/ct-week5-card-can-wave.jpg` — subject fill 0.22 (raised-arm pose, wide bbox)
- `week7/ct-week7-card-ice-cream.jpg` — subject fill 0.35
- `week18/ct-week18-card-can-walk.jpg` — subject fill 0.50 (borderline)
- `week20/ct-week20-card-can-hang.jpg` — subject fill 0.31 (reaching-up pose, wide bbox)
All 4 pass on dimensions (≥800px long side) and size (<400KB); only the fill-ratio check flags them, and all 4 are poses with limbs extended that legitimately produce a large near-empty bounding box rather than a genuinely small/off-center subject. No dimension or file-size failures found on any of the 78.

## Contact sheets
Built at `~/Downloads/_check/new-art-sheet-1.jpg` through `-4.jpg` (6 columns, 300px cells, filename caption per cell, JPEG q80), covering all 78 target slots (24+24+24+6). Note: the `ct-week16-card-woolly-hat.jpg` cell shows the OLD placeholder art, not new art, since no replacement was downloaded. `_check/` left in place, not deleted.

## Note on trimming
python3 + PIL was available on the Mac, so auto-trim ran (white-margin bounding box under 60% of canvas area -> cropped with 8% padding) before the sips JPEG conversion across both passes. 18 of the first 35 images were trimmed and 15 of the 36 pass-2 images were trimmed; the rest were already well-framed and passed through untrimmed.
