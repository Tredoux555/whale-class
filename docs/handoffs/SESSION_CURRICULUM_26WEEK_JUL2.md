# SESSION HANDOFF — 26-Week Sound Curriculum (Jul 2, 2026)
**Project: next year's classroom English curriculum · "Potato Phonics" · one sound per week**

🚨 **This is a CONTENT project, not a Montree-app feature.** Nothing wires into app code.
It lives in `docs/curriculum/` (specs + build scripts) and produces physical classroom
materials into `~/Desktop/English Curriculum 2026/` (NOT in git — PDFs, mp3s, MJ images).

---

## 1. What this is

Tredoux's own 26-week phonics curriculum for his Beijing ESL Montessori class (ages 3–6),
built four times before, finally nailed. One letter/sound per week in a custom
utility-first order (A→T→M→C→S→N→P→I→H→D→O→G→B→E→R→U→F→L→W→J→K→V→Y→X→Qu→Z). Each letter
unlocks a WORD (a → at → mat → cat…), the word unlocks a real SENTENCE, and each week
ships: sound work + 2 Suno songs (dark trap) + a book + a full Montessori printable pack.
26 weeks = 26 books + a song album + a complete English shelf.

**Canonical docs (read in this order to resume):**
1. `docs/curriculum/26_WEEK_SOUND_CURRICULUM.md` — THE FRAMEWORK. Vision (his words),
   7 elements per week, rules, full 26-week spine, word banks, production pipeline (§8),
   weekly pack contents (§8b), reusable prompts (§7).
2. `docs/curriculum/weeks/WEEK_01_A.md` + `WEEK_02_T.md` — per-week build files
   (target language, sound work, both Suno song boxes, book script, circle games,
   ASSET MANIFEST with MJ prompts, shelf list, week-at-a-glance).
3. `docs/curriculum/tools/` — the assembly line (python → HTML → headless-Chrome PDF):
   `build_week01_book.py`, `build_week01_pack.py`, `build_week02_book.py`,
   `build_week02_pack.py` (includes the hand-drawn SVG Big Map).

---

## 2. State: DONE

**Framework** ✅ complete + locked (spine for all 26 weeks, rules, pipeline).

**WEEK 1 — A** ✅ COMPLETE, all assets in `Desktop/English Curriculum 2026/Week 01/`:
- Book 1 *It's a…* (21pp A5, dark forest, Andika, potato finale, author mark)
- Song: *A is for Potato* (Suno, dark trap)
- Pack (all house-format, white bg, Comic Sans, #2D5A27 frames): worksheet (stroke-arrow
  letter tracing), 3-part cards, sentence strips, dictionary journal (color+trace+write),
  coloring pages (hand-drawn SVG line art), matching sheet, bingo (6 boards 4×4 full-pool
  + duplex 3×3 calling cards), vowel wall (5 blue A4 letters)
- All 17 MJ images incl. the 7 /ă/ sound cards

**WEEK 2 — T** ✅ COMPLETE, all assets in `Week 02/`:
- Book 2 *Where Is Segina?* (18pp — Segina the peg doll at 8 locations, "at" in gold)
- Songs: *T-T-Turtle* (sound song, stutter pattern) + *Where Is Segina?* (word song)
- THE BIG MAP: hand-drawn SVG board-game map (A3, loop road, 8 labeled landmarks) +
  black-and-white colorable version — `pack/Week02_map.pdf`
- Full pack: letter-t worksheet, 3-part (locations), sentence strips ("She's at ___"),
  dictionary (row 1 = **at**), coloring (12 new SVG shapes incl. tiger/turtle), matching,
  t/not-t sort labels, bingo
- 16 MJ images + potato + doll reference

---

## 3. Locked rules (don't relitigate)

- **Character:** Segina = wooden peg doll girl, black pigtails, purple polo (real student,
  outfit-based likeness — her photos never went to MJ). Print spelling **Segina**; Suno
  lyrics spell **Sejeena** (phonetic). Consistency via MJ omni/character-reference on the
  generated doll, not photos.
- **Two songs per week:** SOUND song (stutter isolation: "T-t-turtle!", answer line reuses
  a prior frame) + WORD song (the sentence frame). One pattern per song, ~10-15 words.
  Style string (one album): `dark trap, 68 bpm, heavy 808 bass, sparse hi-hats, deep
  whisper-rap, kids choir chant, playful spooky, minimal, clean vocals, nursery trap`.
- **Books:** dark forest #0a1a0f, Andika (single-storey a), page-turn = the reveal,
  Q-left/A-right, gold #E8C96A for the week's word, author mark on back. A5; print A3
  scale-to-fit for circle.
- **Printables:** WHITE bg (ink rule), Comic Sans MS bold, #2D5A27 colored-frame technique
  (card bg = border color, 0.5cm padding, white inner, diamond cut-guides). Formats ported
  from HIS generators: `components/card-generator/print-utils.ts` (3-part squares 7.5cm +
  21×6.5 sentence strips w/ identical-overlay) + `public/tools/picture-bingo-generator.html`
  (4×4 boards full-pool, duplex calling cards col-mirrored, SHORT-edge flip, 18mm headers).
- **Bingo:** 16-word pool = learnt vocab + sound-basket stretch words; 6 boards; potato is
  a permanent joke tile in every week's pool.
- **Sound work every week:** pure initial-sound list (exclusions flagged), basket, daily
  I Spy (Dwyer — sound not letter name), sandpaper trace→say→match. W2+: mixed-basket
  discrimination + "does it start with X?" sort using prior weeks' cards as the NO pile.
- **MJ style suffix (everything):** `ultra-realistic photograph, single subject centered,
  dramatic spotlight on deep forest-green backdrop, soft shadows, cinematic, slightly
  whimsical --ar 3:2 --style raw` (dioramas: `miniature diorama, dramatic spotlight, deep
  forest-green tones, cinematic, whimsical`).
- **ASSET MANIFEST RULE:** every week file lists ALL images with exact filenames
  (`01-… .png`) + ready-to-run prompts BEFORE anything is built.

## 4. The weekly production workflow (the machine)

1. Fable writes `WEEK_NN_X.md` (spine → full week: songs, book script, games, manifest).
2. Tredoux: one Suno session (2 tracks) + one MJ session (manifest prompts) → files land
   in `~/Downloads`.
3. Fable: sorts/renames into `Desktop/English Curriculum 2026/Week NN/images/`, adapts
   `build_weekNN_book.py` + `build_weekNN_pack.py` from the previous week, renders via
   headless Chrome, eyeballs previews, ships PDFs to `Week NN/pack/`.
4. Tredoux prints, laminates, ring-binds. Repeat ×26.

Render command pattern:
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu
--no-pdf-header-footer --print-to-pdf=OUT.pdf file://…/pack_X.html`

## 5. NEXT STEPS (pick up here)

1. **Week 3 — M · mat, am · "It's on the mat."** Prepositions (on/under/next to), mat
   etiquette, Hokey Pokey unplugged + 2 Suno tracks (/m/ sound song "M-m-mat"? + word song
   on the preposition frame), book *On the Mat*, /m/ sound list (moon, mouse, monkey,
   mango, milk, map…), manifest. Last teacher-read book — W4 is the first DECODABLE one.
2. **Week 4 — C · cat — THE FLAGSHIP.** First real reading week: *The Cat Is on the Mat*
   (the levitating cat!), digraph th + sight words the/is, the cast begins (Cat).
3. Ongoing: after each week's approval, keep building sequentially. The spine in the
   framework file holds all 26 weeks' designs.
4. Optional improvements queued: QR song cards once mp3s are hosted somewhere scannable;
   A3 book printing guidance card; per-week teacher one-pager.

**Resume prompt for a fresh session:** "Read docs/handoffs/SESSION_CURRICULUM_26WEEK_JUL2.md
and docs/curriculum/26_WEEK_SOUND_CURRICULUM.md, then build Week N per the workflow."
