# PHASE D PRODUCTION RUN — Levels 2–3 (W27–58) — started Jul 12, 2026 (Fable directing)

**Mission (Tredoux, authorized): produce ALL media for weeks 27–58 — ~640 MJ images + 64 songs × 2 takes
(128 Suno files) + render all 32 packs. Same proven loop as `OVERNIGHT_RUN_JUL11.md` (READ IT — all its
locked rules, techniques, and bug workarounds apply verbatim). If this session dies, ANY session resumes
from this doc. Disk was cleared to 20 GiB free before start; backup on Extreme SSD.**

## Locked rules (inherited Jul-11 + Levels 2–3 additions)
1. Suno style string (ALL songs): `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep whisper-rap verses, kids choir chant on hook, playful spooky, minimal, clean vocals, nursery trap`
2. WHOLE-WORDS lyric rule — already enforced in all 32 specs (director-read Jul 12). Lyrics are GROUND TRUTH; submit verbatim. If Suno's copyright filter rejects (W9 precedent), rewrite minimally, keep phonics content, and LOG the deviation here (JSON reconciliation owed).
3. MJ: submit one-at-a-time with feed verification; best-of-4 (photos: single clean subject; coloring: flat black-on-white, thick lines, no gray); **canvas-draw download technique** (Jul-11 W20–26 entry) is the standard; `cdn.midjourney.com` automatic downloads = Allow; transient "Creation failed" → resubmit up to 3×.
4. Render: `node scripts/curriculum/build-week.mjs --week N --assets "~/Desktop/English Curriculum 2026/Week NN/images" --gap-only` for prompts; full render with **explicit `--out ".../Week NN/pack-v2"`** (defaults to legacy pack/ otherwise); 0-byte-PDF guard is live and hard-fails.
5. Cast canonical looks are IN the spec prompts — follow prompt text verbatim. New debuts: Sheep W27, Chick W28, Snake W33, Bee W44, Star W47, Owl W52. Reuse L1 cast looks where they cameo (Dog=scruffy wire-haired terrier mix, Duck=plump white/orange, Fox=rust-orange white-chest, Segina/Sam=peg dolls, Cat=tabby).
6. Songs per week = exactly 2 (sound + word), lyrics from the week JSON `songs[]`. File naming: `WNN <title> (take K).mp3` → `~/Desktop/English Curriculum 2026/Week NN/`. Save BOTH takes (agents can't hear).
7. Suno credits: 1,590 at start; 64 songs ≈ ~1,330 credits expected. If credits run low (<100), STOP and log — do not start a song you can't finish.
8. Week folders: create `~/Desktop/English Curriculum 2026/Week NN/` + `images/` as needed (W27–58 are new).

## STATUS BOARD (update as chunks land) — re-chunked Jul 12 evening to match actual runs
- [x] Images W27–33 (M1 + extension)
- [x] Images W34–38 (M2 — Jul 12 evening: 71 imgs, 5 packs, all gap-clean)
- [ ] Images W39–43 (M3 — W41 ✅ 17 imgs+pack · W43 ✅ 18 imgs+pack · W42 in-flight 11+ imgs · **W39 + W40 NOT started**)
- [ ] Images W44–48 (M4)
- [ ] Images W49–53 (M5)
- [ ] Images W54–58 (M6)
- [x] Suno W27–37 (chunk S1 — 22 songs, 44 files)
- [x] Suno W38–46 (S2 head — 18 songs, 36 files; **W47–48 remain**)
- [ ] Suno W47–58 (24 songs, 48 files — NOT started, credits ~1,170)
- [ ] All 32 packs rendered to pack-v2/ + gap reports clean
- [ ] Morning review checklist (Tredoux): pick 1 of 2 takes × 64 songs · cast-consistency eyeball (esp. Sheep/Snake/Chick across their arcs; Snake W33 vs W38 name-day; graduation cast W58) · Pattern Tree wall render + W38 pattern-card tracing eyeball (FIRST REAL RENDER of the new builders) · coloring-page shading anomalies · any Suno lyric deviations logged below

## DEVIATIONS LOG (lyric rewrites, rerolls, casting calls)
- **Jul 12 (Suno agent, W32 resume) — DURATION-THRESHOLD CORRECTION, not a lyric deviation.**
  Resumed mid-W32: found "Wh-Wh-When?" (2 takes, 47-57s) sorted in Week 32/, plus a stray unsorted
  "Which Is It_.mp3" (34s) in Downloads. Initially treated the ~34-57s range as corrupted/truncated
  per the runbook's "abnormal duration" rule and REGENERATED both W32 songs from scratch (verbatim
  lyrics + locked style, 2 fresh takes each). Before discarding the originals, cross-checked against
  the already-shipped Week 27 files (`W27 Sh-Sh-Ship!` 52.2s/55.9s, `W27 The Fish on the Ship`
  32.4s/44.4s) — **same 32-58s range**. Conclusion: this IS the normal, correct output length for
  this dark-trap/minimal-lyrics style — NOT corruption. The true "abnormal/corrupted" case (W11-style)
  looks more like the stray 14-second "The King Can Sing" clip sitting in the library (a different,
  out-of-scope week — flagged here for whoever owns that week to check, not touched by this agent).
  **Net effect: W32 now has 4 valid, correctly-named files (both songs × both takes, all in the
  32-58s normal range) — no harm done, just ~20 extra credits spent on a redundant regen.**
  **RULE UPDATE for all future Suno chunks: do NOT treat 30-60s clips as corrupted — that's the
  expected length for this style/lyric-length combo. Only trash+resubmit on clips that are near-zero
  length (sub-15s) or that visibly cut off mid-word/mid-line on playback.**

## IMAGE CHUNK PROGRESS (Sonnet MJ agent, Jul 12 resume after mid-W29 death)
- [x] **W27** — images complete (inherited from prior agent), pack rendered.
- [x] **W28** — images complete (inherited from prior agent), pack rendered.
- [x] **W29 /th/** — COMPLETE. Found 10 pre-cooked jobs sitting unharvested in the MJ feed
  (predecessor had submitted but not harvested): thumb-coloring, thin-moth, potato-in-bath,
  path, math, thin, thumb, three, moth-coloring, bath-coloring. Best-of-4 picked for each
  (moth-coloring and bath-coloring each had TWO grids of 4 cooked — picked best across all 8).
  Canvas-draw downloaded, sorted to `Week 29/images/`. `--gap-only` → "✅ All manifest images
  present" (17/17). Full pack rendered to `pack-v2/` — 10 doc types, 20 files, bingo.pdf 44MB/
  10pg, book.pdf 24MB/20pg, both valid non-zero. Residual warnings are the standard out-of-scope
  shapes (grammar words this/that/then/with have no dedicated art; bingo 14-pool cycled to fill 16).
- [x] **W30 /ck/** — COMPLETE. Found 9 of 11 jobs pre-cooked+unharvested in the feed (bell-on-hill,
  chick-eyes-bell, chick-puff-hill, chick-hit-bell, bell-fell, bell-rolling, sheep-got-bell, puff,
  bell-coloring, potato-on-hill). Only `hill.png` had never actually been submitted (search confirmed
  no exact match) — submitted fresh, cooked clean, best-of-4 picked. **Gotcha this chunk: the MJ
  prompt textarea intermittently silently ate typed text on the first attempt after a fresh /imagine
  navigation (value stayed empty despite `type` reporting success) — fix was to `document.execCommand
  ('delete')` via JS to clear/reset the textarea then retype; verified via reading `textarea.value`
  before pressing Enter every time going forward.** All 11 canvas-drawn, sorted to `Week 30/images/`.
  `--gap-only` → "✅ All manifest images present" (11/11). Pack rendered to `pack-v2/` — 10 doc types,
  20 files, bingo.pdf 44MB/10pg, book.pdf 24MB/20pg. Residual warnings = standard out-of-scope
  (miss/off/kiss grammar-adjacent words with no dedicated art; bingo 14-pool cycled to fill 16).
- [x] **W31 /ng/** — images harvested. Found 12 of 13 jobs pre-cooked+unharvested in the feed
  (king-singing-big, long-song, chick-sing, sheep-sing, gong-bang, king-sang-cast, king-sings-potato,
  gong, song, king-coloring, ring-coloring, gong-coloring). Only `king-sing.png` had never actually
  been submitted (exact-match search confirmed missing) — submitted fresh. **Textarea gotcha
  ESCALATED this chunk: the W30 `execCommand('delete')`-then-retype fix stopped working (textarea.value
  read back empty after both a plain `type` and after execCommand-clear+retype). Root cause: MJ's
  compose box is a React-controlled textarea — neither raw keystrokes nor execCommand mutate React's
  internal value tracker reliably. DEFINITIVE FIX: set the value via the native property setter and
  dispatch a real `input` event so React's change detection picks it up:**
  ```js
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
  setter.call(textarea, PROMPT_TEXT);
  textarea.dispatchEvent(new Event('input', {bubbles:true}));
  ```
  **then still verify `textarea.value` (and ideally screenshot) before pressing Enter.** Submission
  confirmed correct (title + prompt text matched exactly in the "Submitting…" panel). All 13
  canvas-drawn, sorted to `Week 31/images/`. `--gap-only` → "✅ All manifest images present" (13/13).
  Full pack rendered to `pack-v2/` — 10 doc types, 20 files, bingo.pdf 44MB/10pg, book.pdf 25MB/20pg,
  both valid non-zero, exit code 0. Residual warnings = standard out-of-scope grammar words (sing/hang/
  long have no dedicated art; bingo 14-pool cycled to fill 16; 2 songs' QR cards show audioUrl
  placeholder pending Suno chunk). **W27–31 (chunk M1) now fully COMPLETE.**
- [x] **W32 /wh/** — COMPLETE. Found 10 of 16 jobs pre-cooked+unharvested in the feed (whiz-blur,
  chick-what, sheep-which, guess-whip, guess-ship, guess-fish, where-look, whiz-again, potato-reveal,
  whip). 6 had never actually been submitted (exact-match search confirmed missing each time) —
  submitted fresh: whisk, whale, wheel, whip-coloring, whale-coloring, wheel-coloring. **Caught + fixed
  a real mis-download this chunk**: a batched navigate+javascript_exec pair had the navigate step fail
  transiently, but the javascript_exec still ran against the STALE previous page — produced a file named
  `whip.png` that actually contained `potato-reveal.png` pixel content. Caught by re-checking `img.src`
  after the retry (didn't match the expected job URL first time), corrected by re-downloading under a
  temp name and shell-renaming over the bad file. **NEW STANDING RULE for all future chunks: after ANY
  navigate (especially a retried one), run a read-only `javascript_exec` confirming `img.src` matches the
  expected job ID BEFORE running the actual download-and-click script — never chain navigate+download
  blind.** All 16 canvas-drawn, sorted to `Week 32/images/`. `--gap-only` → "✅ All manifest images
  present" (16/16). Full pack rendered to `pack-v2/` — 10 doc types, 20 files, bingo.pdf 43MB/10pg,
  book.pdf 24MB/20pg, both valid non-zero, exit code 0. Residual warnings = standard out-of-scope grammar
  words (when/which/whiz/white have no dedicated art; bingo 14-pool cycled to fill 16; 2 songs' QR cards
  show audioUrl placeholder pending Suno reconciliation — see deviations log above).
- [x] **W33 /s-blends/ (Snake's cast debut)** — COMPLETE. Fresh week, all 14 jobs genuinely missing
  (search-first confirmed none pre-cooked) — submitted one-at-a-time. **Casting-director pass on Snake:**
  submitted `snake-spin.png` FIRST to establish the canonical look, picked the clearest direct-eye-contact
  variant (emerald-green scales with darker striping, warm amber/gold eyes, rounded gentle non-threatening
  face) as the reference, then held every subsequent snake pick (snake-spinning, snake-swim, chick-chase-
  snake, chick-sheep-stop, snake-snap-twig, snake-still-going, potato-stops-snake) to that same look —
  all 8 book-scene snake renders came back visually consistent (emerald body, amber eyes, friendly
  expression) with no need to reroll for cast drift. Also covered: 4 standalone cards/bingo/basket subjects
  (spider, snail, swan, skip) + 2 coloring pages (spider-coloring, swim-coloring — rejected one gray-shaded
  spider-coloring variant in favor of a flat black-on-white pick). All 14 canvas-drawn, sorted to
  `Week 33/images/`. `--gap-only` → "✅ All manifest images present" (14/14). Full pack rendered to
  `pack-v2/` — 10 doc types, 20 files, bingo.pdf 39MB/10pg, book.pdf 24MB/20pg, both valid non-zero, exit
  code 0. Residual warnings = standard out-of-scope grammar/action words (spin/stop/swim/step/snap have no
  dedicated art; bingo 14-pool cycled to fill 16; 2 songs' QR cards show audioUrl placeholder — Suno chunk
  reports W33 songs already complete, 4 takes sorted, so this is a JSON-linking step pending reconciliation,
  not missing audio).

- [x] **W34–38 (chunk M2, Jul 12 evening — fresh-browser run after Tredoux restarted Chrome).**
  All 71 images freshly submitted (feed held no pre-cooked jobs for these weeks beyond 3 W34 jobs
  the director spotted at launch): W34 15/15 · W35 13/13 · W36 13/13 · W37 14/14 · W38 16/16.
  All 5 packs rendered to pack-v2/ exit 0 (bingo 40–54MB/10pg, book 22–25MB/20pg). Rerolls: W35
  grin ×2 · W36 band ×1 (material drift) · W37 skunk ×1 (color drift back to canonical green) ·
  W38 snake-spelling ×1 (watermark). **W38 money shots verified: SNAKE name-plate legible, Snake
  held W33 canonical (emerald + amber eyes) throughout.** NEW GOTCHAS for every future MJ agent:
  (1) **hallucinated watermarks/fake photographer credits** are frequent in fine-detail product-shot
  prompts — zoom-check BOTH bottom corners of full-res before download; if all 4 quadrants dirty,
  resubmit with "no watermark, no signature" appended before --ar. (2) **Material/species drift** —
  spell out disambiguating adjectives in the noun phrase ("matte rubber texture, no metal, no
  jewelry"; "emerald-green garden snake with amber eyes"), never bare nouns. (3) **Avoid literal
  isolated-human-anatomy prompts** (a "big toothy grin" prompt produced disembodied denture horror) —
  substitute an established cast character instead of iterating. (4) Coloring-page quadrants can
  carry faint gray shading despite the prompt — compare ALL 4 for flattest pure white, not the first
  acceptable one.
- [ ] **W39–43 (chunk M3, Jul 12 night — IN FLIGHT).** Launch turn was interrupted but the agent
  SPAWNED ANYWAY and kept working orphaned (its report may never arrive — monitor by folder counts,
  the sessions-management lesson again). Worked out of order: **W41 ✅ 17 imgs + pack rendered
  (21:22) · W43 ✅ 18 imgs + pack rendered (20:53) · W42 in-flight (11 imgs by 21:43, cast-crossing
  bridge scenes landing) · W39 + W40 untouched (0 imgs).** Whoever resumes: ground-check `Week 39/40/
  42/images/` counts first, finish W42 (gap-only → pack), then W39 → W40, then M4.

## SUNO CHUNK PROGRESS (Sonnet Suno agent, Jul 12 resume after mid-W32 death)
- [x] **W27–31** — inherited complete from prior agent/session (4 mp3s each, sorted).
- [x] **W32** — reconciled (see deviations log above): 4 files, both songs × both takes, 38-58s range.
- [x] **W33 /s-blends/ (Snake debuts)** — COMPLETE. "St-St-Stop!" (sound) + "Stop, Snake, Stop!" (word),
  verbatim lyrics from week-33.json, both submitted via suno.com Advanced mode. All 4 takes downloaded
  and sorted to `Week 33/`: St-St-Stop! take 1 (62.0s), take 2 (54.9s), Stop Snake Stop take 1 (38.9s),
  take 2 (39.6s) — all normal range. **Credits after W33: 1,430.**
- [x] **W34 /l-blends/** — COMPLETE. "Fl-Fl-Flag!" (sound) + "The Flag on the Sled" (word), verbatim
  lyrics from week-34.json. All 4 takes downloaded and sorted to `Week 34/`: Fl-Fl-Flag! take 1 (60.8s),
  take 2 (46.6s), The Flag on the Sled take 1 (51.6s), take 2 (31.8s) — all normal range.
- [x] **W35 /r-blends/** — COMPLETE. "Fr-Fr-Frog!" (sound) + "Frog Can Grin" (word), verbatim lyrics
  from week-35.json. All 4 takes downloaded and sorted to `Week 35/`: Fr-Fr-Frog! take 1 (56.0s), take 2
  (72.1s), Frog Can Grin take 1 (32.5s), take 2 (36.0s) — all normal range. **Credits after W35: 1,390.**
  Hit two new UI quirks this week (both resolved, folded into the rule below): (1) reusing the Create
  form for a second song — the Lyrics textarea can silently keep the OLD song's text after
  click+cmd+a+type; fix is click → cmd+a → explicit Delete keypress → screenshot-verify the empty-state
  placeholder shows → then type the new lyrics. (2) the Title field can retain garbage
  auto-concatenated text from the previous song; fix is click → cmd+a → type the correct title (this
  alone was enough to overwrite it). (3) a "Download all" bulk action off a song's "..." menu is NOT
  scoped to any row selection — it offered to download all 24 workspace songs, not just the checked
  ones. Closed the modal without confirming; avoid that path entirely, always download via each song's
  own detail-page menu.
- [x] **W36 /final blends I/ (🚨 hardest EAL week)** — COMPLETE. "Hand-Hand-Hand!" (sound) + "The Best
  Nest" (word), verbatim lyrics from week-36.json. All 4 takes downloaded and sorted to `Week 36/`:
  Hand-Hand-Hand! take 1 (64.9s), take 2 (61.2s), The Best Nest take 1 (48.3s), take 2 (36.4s) — all
  normal range. **Credits after W36: 1,370.** Confirmed the fastest reliable download method: from the
  Library list view (not the song detail page), each row's "..." icon → Download → MP3 Audio works
  identically to the detail-page flow, and lets all 4 songs' menus be reached without navigating away —
  still always wait for "Preparing your mp3..." to resolve before the next click.
- [x] **W37 /final blends II/ (final-/l/ trap, completes the blend branch)** — COMPLETE. "Pink-Pink-Pink!"
  (sound) + "Help the Skunk!" (word), verbatim lyrics from week-37.json. All 4 takes downloaded and
  sorted to `Week 37/`: Pink-Pink-Pink! take 1 (74.9s), take 2 (60.6s), Help the Skunk! take 1 (47.6s),
  take 2 (33.7s) — all normal range. **Credits after W37: 1,350.** **🎉 CHUNK S1 (W27–37, 22 songs, 44
  files) — COMPLETE.**
- [x] **W38 /a_e magic-e/ (🎂 Fable exemplar week — Snake's name-day)** — COMPLETE. "Magic E Makes Cake"
  (sound) + "The Snake and the Cake" (word), verbatim lyrics from week-38.json (incl. the C-A-K-E/G-A-T-E/
  S-N-A-K-E spell-out verses and the "Happy name-day, Snake…" outro). All 4 takes downloaded and sorted to
  `Week 38/`: Magic E Makes Cake take 1 (62.4s), take 2 (49.2s), The Snake and the Cake take 1 (34.1s),
  take 2 (35.5s) — all normal range. **Credits after W38: 1,330.**
  **🚨 NEW UI BUG this week — checkbox-selection hijacks cmd+a.** While clearing stale lyrics from the
  Create-form textarea for song 2, clicking into the textarea then pressing cmd+a sometimes selects
  page-level LIBRARY ROWS (checkboxes tick on the panel to the right) instead of the textarea's own text —
  confirmed via screenshot (checkmarks on rows, no blue text-highlight in the textarea). When any row is
  checkbox-selected, that row's "..." menu becomes the DANGEROUS bulk-action menu (Add to Playlist / Add
  to Queue / **Download all** / Move to Workspace / Move to Trash) instead of the normal per-song menu
  (Remix/Edit/Publish/Share/Download/Manage/Add to Queue/Add to Playlist/Song Radio/Move to Trash) — and
  "Download all" is NOT scoped to the selection, it downloads the entire workspace. **Fix: if a row shows
  a checkmark, click it again to uncheck before touching any "..." menu; to clear a textarea, click
  precisely on top of visible text (not empty space) before cmd+a, and always screenshot-verify blue
  highlighted text inside the textarea (not checkmarks on the library list) before pressing Delete.**
  **Also reconfirmed the reliable download path from the full Library page (`suno.com/me` → Songs tab,
  wide layout): each row's own "..." → Download → MP3 Audio → wait for "Preparing your mp3..." toast to
  resolve (~7-9s) → verify via `ls -lt ~/Downloads/*.mp3` before the next click.**
- [x] **W39 /i_e magic-e/** — COMPLETE. "Magic E Makes Bike" (sound) + "The Bike Ride" (word), verbatim
  lyrics from week-39.json. All 4 takes downloaded and sorted to `Week 39/`: Magic E Makes Bike take 1
  (53.7s), take 2 (52.3s), The Bike Ride take 1 (49.8s), take 2 (43.9s) — all normal range. **Credits
  after W39: 1,310.** No new UI quirks — the checkbox-selection cmd+a bug from W38 did not recur when
  clicking precisely on visible textarea text before cmd+a; the fix from that entry holds.
- [x] **W40 /o_e magic-e/ (Dog returns to star)** — COMPLETE. "Magic E Makes Bone" (sound) + "The Bone at
  Home" (word), verbatim lyrics from week-40.json. All 4 takes downloaded and sorted to `Week 40/`: Magic
  E Makes Bone take 1 (64.4s), take 2 (49.6s), The Bone at Home take 1 (51.2s), take 2 (54.9s) — all
  normal range. **Credits after W40: 1,290.** No new UI quirks.
- [x] **W41 /u_e magic-e/ (🎉 MAGIC-E COMPLETE — final vowel, a-i-o-u-e)** — COMPLETE. "Magic E Makes Cube"
  (sound) + "The Mule and the Flute" (word), verbatim lyrics from week-41.json. All 4 takes downloaded and
  sorted to `Week 41/`: Magic E Makes Cube take 1 (59.6s), take 2 (46.2s), The Mule and the Flute take 1
  (45.4s), take 2 (39.1s) — all normal range. **Credits after W41: 1,270.** No new UI quirks.
- [x] **W42 /soft c·g + tch·dge/ (🎉 LEVEL 2 FINALE — celebration week, not a magic-e week)** — COMPLETE.
  "Ice-Ice-Bridge!" (sound — celebrates all 4 patterns: soft c /s/, soft g /j/, -tch, -dge, plus the
  "Level Two is DONE! The tree is full!" narrative beat) + "The Bridge to the Ice" (word — the whole cast,
  Dog/Sheep/Snake/Chick, crosses the bridge into Level 3), verbatim lyrics from week-42.json. All 4 takes
  downloaded and sorted to `Week 42/`: Ice-Ice-Bridge! take 1 (48.7s), take 2 (58.2s), The Bridge to the
  Ice take 1 (34.0s), take 2 (34.8s) — all normal range. **Credits after W42: 1,250.** No new UI quirks —
  the W38 checkbox-selection fix (click precisely on visible textarea text before cmd+a) continues to hold
  clean.
- [x] **W43 /ai·ay vowel team/ (🎉 LEVEL 3 BEGINS — the Reading Year)** — COMPLETE. "Ay-Ay-Play!" (sound
  — teaches the positional rule: ai in the middle, ay at the end, both saying long-a) + "The Train in the
  Rain" (word — Sheep/Snake/Chick play in the storm), verbatim lyrics from week-43.json. All 4 takes
  downloaded and sorted to `Week 43/`: Ay-Ay-Play! take 1 (58.6s), take 2 (52.3s), The Train in the Rain
  take 1 (43.0s), take 2 (49.8s) — all normal range. **Credits after W43: 1,230.** No new UI quirks — the
  W38 checkbox-selection fix continues to hold clean across the Level 2→3 transition.
- [x] **W44 /ee·ea vowel team/ (🎉🎉 SHEEP'S NAME-DAY — Bee debuts, biggest word harvest of the program)**
  — COMPLETE. "Ee-Ee-Tree!" (sound — builds to the S-H-E-E-P spell-out as the emotional peak, a promise
  made since Week 27) + "Sheep Can Read!" (word — the full name-day celebration song, Bee's decodable
  debut), verbatim lyrics from week-44.json. All 4 takes downloaded and sorted to `Week 44/`: Ee-Ee-Tree!
  take 1 (42.4s), take 2 (60.0s), Sheep Can Read! take 1 (49.9s), take 2 (49.3s) — all normal range.
  **Credits after W44: 1,210.** No new UI quirks — one `type` call timed out on song 2's lyrics (30s CDP
  timeout) but the text landed correctly regardless; verified via screenshot before proceeding (both the
  ending and, extra-cautiously, the beginning of the lyrics matched the spec verbatim).
- [x] **W45 /oa·ow vowel team/ (long-o, two spellings; ow's "two-faced" warning planted for Week 52)**
  — COMPLETE. "Oh-Oh-Snow!" (sound — positional rule: oa in the middle, ow at the end) + "The Goat in the
  Snow" (word — Sheep and Bee brave the cold, goat is a decodable story friend), verbatim lyrics from
  week-45.json. All 4 takes downloaded and sorted to `Week 45/`: Oh-Oh-Snow! take 1 (56.4s), take 2
  (66.0s), The Goat in the Snow take 1 (37.6s), take 2 (52.6s) — all normal range. **Credits after W45:
  1,190.** No new UI quirks — two more `type` calls timed out (30s CDP) on both songs' lyrics but text
  landed correctly both times, verified via screenshot before proceeding each time.
- [x] **W46 /igh·ie long-i vowel team/ (two spellings for long i — igh three letters one sound, silent g+h;
  ie is a tiny four-word family pie/tie/die/lie met all at once; Right-branch leaf #4)** — COMPLETE.
  "igh-igh-Night!" (sound — I-G-H spell-out teaching silent letters, then N-I-G-H-T/L-I-G-H-T/P-I-E/T-I-E)
  + "The Light at Night" (word — Sheep and Bee spot a pie balanced impossibly high in the night sky),
  verbatim lyrics from week-46.json. All 4 takes downloaded and sorted to `Week 46/`: igh-igh-Night! take 1
  (65.7s), take 2 (68.2s), The Light at Night take 1 (56.2s), take 2 (51.6s) — all normal range. **Credits
  after W46: 1,170.** No new UI quirks — two more `type` calls timed out (30s CDP) on song 2's lyrics and
  the title-menu click briefly opened a song detail side-panel instead of the download submenu on the
  first attempt (closed via the panel's ✕, retried the row's "..." menu cleanly the second time) — both
  resolved via the standard screenshot-verify-before-proceeding practice, no data loss.
- [ ] W47–48 (rest of chunk S2)
- [ ] W49–58 (chunk S3)

**🚨 NEW RULE learned this chunk — MP3 download needs a wait, not just a click.** Clicking Download →
MP3 Audio on a song's detail page triggers a **"Preparing your mp3... This may take a few seconds"**
toast — the actual browser download doesn't fire until that toast resolves (observed ~5-7s). Navigating
away or moving to the next song too fast (as the predecessor's batched flow did) means the click registers
in the UI but **no file ever lands in ~/Downloads** — silent failure, nothing to catch except checking the
Downloads folder. **Fix: after clicking MP3 Audio, wait ~6-7s (or screenshot-confirm the toast is gone)
BEFORE navigating to the next song.** Lost 3 of 4 W33 downloads to this the first pass; all recovered on
retry. Also noted: the song detail-page layout varies by browser window width — narrow width shows a
bottom playbar "..." icon (~[196,899]) that needs Download→MP3 Audio via a full-screen vertical menu;
wide/desktop width shows a "..." icon next to the play button (~[631,311]) with a hover-flyout submenu.
Screenshot first each time to see which layout is live rather than assuming coordinates.

## ⏱ CURRENT STATE — Jul 12, ~21:50 (Fable, evening/night session)
- **Images: W27–38 + W41 + W43 COMPLETE with packs. W42 IN FLIGHT** (orphaned MJ agent still landing
  files at 21:43 — ground-check `Week 42/images/` count vs its 11 before doing anything). **W39, W40,
  W44–58 remain (~17 weeks, ~240 jobs, 18 packs).**
- **Suno: W27–46 COMPLETE (80 files). W47–58 remain (24 songs, 48 files).** Credits ~1,170 expected
  (last logged 1,170 after W46) — verify counter on resume. The Suno rail NEVER ran this evening:
  first two launches died to browser blockers (see below).
- **🚨 BROWSER-BINDING SAGA (the evening's tax, so nobody repeats it):** Tredoux closed the original
  two Chrome windows (~17:30) → the extension kept GHOST connections under the old deviceIds. Agents
  driving ghosts saw: MJ "logged out" renders, suno.com ERR_CONNECTION_TIMED_OUT, navigations
  reverting to chrome://newtab, tabs vanishing. **Network was fine the whole time (curl 200).**
  FIX: `switch_browser` confirmation flow → Tredoux clicks Connect in the live window → binding
  works. **RULE: after ANY browser restart, treat all remembered deviceIds as suspect — verify by
  actually loading a page and reading text back, not by connection listing.** Live MJ browser at
  handoff: deviceId 7d422c1a-16c6-440f-8660-bd73adfec31e ("Tredoux"). A second browser for the Suno
  rail was requested from Tredoux; bind it via a fresh list_connected_browsers / switch_browser when
  it appears (both his browsers have BOTH sites logged in, so either works for either rail — just
  never run both rails in ONE browser, the agents fight over the active tab).
- **Watchdog restarted 21:47** (`nohup ~/phase-d-monitor.sh &`, "mp3s sorted" metric still broken —
  trust per-week folder counts). **Disk: 21Gi free** (improved — cleanup landed). 
- **Sessions lesson AGAIN, sharpened: an interrupted parent turn does NOT always kill the sub-agent.**
  The M3 launch was user-interrupted; the agent spawned anyway, worked orphaned for hours (W41+W43
  done, W42 mid-flight), and its final report is unreachable. Corollary to the old rule: ground-check
  folder counts before assuming a rail is dead OR alive — and never spawn a second agent onto a
  browser that file-mtimes say is still being driven.

## ⏱ PRIOR STATE — Jul 12, ~17:00 (superseded, kept for the record)
- **Images: W27–33 COMPLETE** (105 imgs + 7 packs rendered, all gap reports "✅ All manifest images
  present"). **W34–58 REMAIN (~25 weeks, ~360 jobs).** The M2 relaunch (W34–38) died twice to
  API/interrupt blips — the MJ rail is DOWN at handoff; nothing was submitted for W34+ (search-first
  anyway on resume). Worklists for every week are pre-built:
  `~/Desktop/English Curriculum 2026/_phase_d_worklists/week-NN-jobs.txt`.
- **Suno: W27–44 COMPLETE** (72 files, 4 per week, verified naming). The Suno agent was alive and
  self-extending at 16:41 (4 weeks in 23 min) — it may still be running at resume; ground-check
  W45+ folders before relaunching. **W45–58 remain (28 songs, 56 files).** Credits: 1,470 at 12:12,
  minus ~W33–44 spend — check the counter; plenty of headroom expected.
- **Watchdog**: `~/phase-d-monitor.sh` logging to `~/Desktop/phase-d-monitor.log` every 2 min
  (restarted 16:41, dies ~20:40 — restart it: `nohup ~/phase-d-monitor.sh > /dev/null 2>&1 &`).
  Its "mp3s sorted" metric is broken (glob bug) — ignore it; trust per-week folder counts.
- **Disk: 13Gi free and falling** as media lands. If it drops below ~8Gi: offload completed L1 week
  folders or rendered pack-v2 dirs to `/Volumes/Extreme SSD/Offloaded_Jul12/` (backup already has
  L1; verify before moving anything not yet on the SSD).
- **Browsers: 2 connected extension instances** (deviceIds may persist: MJ ran on
  7d422c1a-16c6-440f-8660-bd73adfec31e, Suno on 7f0adec3-6fab-4d5f-99de-a2f84ff9911f) — re-verify
  with list_connected_browsers + check which browser has which site logged in before pinning agents.
- **🚨 Hard-won fixes (all captured in IMAGE CHUNK PROGRESS above — every future MJ agent MUST use):**
  React-textarea native-setter fix (W31 entry) · img.src verification before canvas-draw (W32 entry) ·
  search-first before submitting (feed may hold pre-cooked jobs) · Suno 30–60s clips are NORMAL, not
  corrupted (deviations log) · W38 money shots: SNAKE name-plate legible + Snake matches W33 canonical.
- **Sessions-management lesson: agent launches die when the user interrupts the parent turn — always
  ground-check file counts before assuming an agent is alive or dead; respawn per chunk.**

## RESUME PROMPT (paste into a fresh session — updated Jul 12 ~21:50)
"Read CLAUDE.md's top Jul-12 session blocks + docs/curriculum/PHASE_D_RUN_JUL12.md (STATUS BOARD +
CURRENT STATE ~21:50 + IMAGE CHUNK PROGRESS — the hard-won MJ fixes AND the browser-binding saga live
there) + docs/curriculum/OVERNIGHT_RUN_JUL11.md (technique bible). You are Fable directing Phase D.
FIRST: ground-check per-week counts of Week NN/images/*.png and Week NN/*.mp3 for W39–58 via Desktop
Commander (an ORPHANED MJ agent may still be working W42 — check file mtimes; never spawn onto a browser
whose files are still moving), restart the watchdog if dead, and verify browser bindings by LOADING A
PAGE (deviceIds go stale after browser restarts — use switch_browser Connect-click if in doubt).
THEN run both rails in parallel with Sonnet browser agents (quality over speed): (1) MJ agent —
remaining images are W39, W40 (skipped by the out-of-order M3 agent), W42 if unfinished, then W44–58
in ~5-week chunks; search-first + one-at-a-time submits with the React-setter textarea fix + feed
verification, watermark corner-check, best-of-4, canvas-draw downloads with img.src verification, sort,
gap-only until clean, pack render with explicit --out; (2) Suno agent on the OTHER browser — W47–58
(24 songs), verbatim JSON lyrics + locked style string, both takes, WNN naming, 30-60s normal, wait for
the 'Preparing your mp3' toast, stop if credits <100. Respawn each rail the moment a chunk agent retires.
Update this doc per chunk; commit+push via Desktop Commander. When all 32 weeks show complete images +
4 mp3s + rendered packs: final verification sweep (PDF counts/sizes, mp3 counts, gap reports), update
CLAUDE.md, write the closing handoff, surface the Tredoux morning-review checklist."
