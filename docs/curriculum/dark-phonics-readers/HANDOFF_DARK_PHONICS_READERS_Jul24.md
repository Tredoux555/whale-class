# Handoff — Dark Phonics Readers, full alphabet (Jul 24, 2026, Cowork)

Pickup note for a fresh chat. This session **authored** the Dark Phonics reader track
across the whole alphabet and aligned it to canon. **No art was generated and no book
was assembled** — that is the next session's job (render end-to-end via Midjourney).

---

## ▶️ KICKOFF PROMPT (paste this to resume immediately)

> Resume the Dark Phonics readers render. First read
> `docs/curriculum/dark-phonics-readers/HANDOFF_DARK_PHONICS_READERS_Jul24.md` — it has
> everything (conventions, the 27-mascot roster, per-book page prompts, output paths,
> MJ gotchas). Then render **Book 7 (Week 7, m — “Sam and the Monkey”)** end-to-end:
> drive **Midjourney in my Chrome** (Claude-in-Chrome, Relax mode) to generate the 4
> page images + the potato finale from the art prompts in the handoff; download them;
> assemble a finished reader HTML that matches the structure of
> `public/satpin-books/sit-sit-sit.html`; and place the generated art under
> `phonics-images/dark-phonics-readers/w07/`. Show me the finished Book 7, then we do
> Books 8–27 the same way. MJ has effectively unlimited credits — render away, but stay
> in Relax mode and watch the silent queue-cap bug (see handoff §7).

---

## 1. What this is (context)

**Montree / Dark Phonics.** Two reader tracks share one phonics path but are DIFFERENT
products — do not mix them:

- **English Curriculum track (a-first: A T M C S N …).** The 26-week decodable set,
  already FULLY PRODUCED. Specs live at `lib/montree/english-curriculum/spec/week-NN.json`.
  Art style = **photoreal** single subject, spotlit on forest-green. Canon =
  `docs/curriculum/spec/MASTER_SPINE.md`. **This session did NOT touch this track.**
- **Dark Phonics track (SATPIN, s-first: S A T P I N M D G O C K CK E U R H B F L J V W X Y Z QU).**
  The fun library that pairs with the songs. 6 readers already live at
  `public/satpin-books/*.html` (weeks 1–6). Art style = **googly-eye pen-and-ink,
  one spot colour, white background** (same look as the song cards). **This session
  extended THIS track to the full 27 weeks (authoring only).**

## 2. What this session produced (all committed to the Mac)

- `docs/curriculum/dark-phonics-readers/Dark_Phonics_Readers_Books_7-27_ALIGNED.docx`
  — **THE source of truth for content.** Books 7–27, aligned to Dark Phonics reader
  canon: header line, hybrid set-up + decodable target word, potato finale on every
  book, gate labels, song-mascot per book, googly-ink art prompt per page.
- `docs/curriculum/dark-phonics-readers/Dark_Phonics_Readers_Books_1-27.docx`
  — earlier standalone draft (pre-canon; keep for reference, superseded by the ALIGNED
  doc and by the live weeks 1–6 readers).
- The original word-bank docx was delivered in chat only (not committed) — not needed;
  the ALIGNED doc supersedes it.

## 3. Canon conventions (LOCKED — every reader follows these)

- **Header:** `Dark Phonics · Week N (x) · [reader type] · Gate: Lesson L · potato finale`
  where **L = N + 4** (song-card lesson number).
- **Reader-type ramp:** sound-hunt read-aloud (wks 1–2) → **hybrid** (teacher reads the
  italic set-up, child decodes the BOLD target word; wks 3–10) → decodable (wk 11+).
- **Page shape:** teacher-read italic set-up + one **bold decodable target word** that
  drills the week's sound. Target must be decodable with letters taught up to that
  SATPIN week.
- **Every book ends on the wordless potato-shout finale** — “And the…?!”, the class
  shouts POTATO; the word is NEVER printed.
- **Cast:** the week's **song mascot** stars in the pictures; the recurring reader cast
  (Snake, Ant, the tabby Cat, **Sam the peg-doll boy**, and Teacher Potato) threads
  through. Cast names are decodability-exempt (known by heart).
- **Art = googly-eye pen-and-ink, one spot colour, white background.** NOT the photoreal
  shelf-card style. Match the song cards in `phonics-images/dark-phonics-song-cards/`.

## 4. Song-mascot roster (locked from the lesson song-cards, weeks 1–27)

The mascot is the picture star; the target word drills the sound.

| Wk | Snd | Mascot (from song card) | First render target word(s) |
|----|-----|--------------------------|------------------------------|
| 1 | s | Snake in a striped sock | (sound-hunt) |
| 2 | a | Ant on a red apple | (sound-hunt) |
| 3 | t | Turtle / sitting ensemble | sat |
| 4 | p | Puppy (POOF) | pat, tap |
| 5 | i | Piglet (icky slop) | sit, pit — **LIVE + illustrated** |
| 6 | n | Ant (napping) | nap |
| 7 | m | **Monkey** (banana, mud) | mat, Sam |
| 8 | d | **Muddy Dog** (digging) | dig, Dad, mad |
| 9 | g | **Goat** (bubble gum) | dig, gap |
| 10 | o | **Octopus** (on a log) | pot, on |
| 11 | c | **Ginger Cat** (cookie) | cat, can |
| 12 | k | **King** — a crowned kid, kicking | Kim, kit |
| 13 | ck | **Chicken/Duck** (cluck, cracked egg) | sock, kick |
| 14 | e | **Chick hatching** (egg) | egg, net, pet |
| 15 | u | **Green cup-Monster** (up) | up, cup |
| 16 | r | **Red Rat** (run) | rat, run, rip |
| 17 | h | **Hippo** (ha-ha) | hat, hop, hug |
| 18 | b | **Baby in a boat** (bubbles) | bug, big |
| 19 | f | **Fox at a fan** | fan, fun, fig |
| 20 | l | **Lazy Lion** (licking a paw) | lap, log, lick |
| 21 | j | **Boy jumping into jam** | jam, jig |
| 22 | v | **Van** (the vet's van) | van, vet |
| 23 | w | **Wet Worm** (water) | wet, web, wig |
| 24 | x | **Boxful of Foxes** | box, fox, six |
| 25 | y | **Boy with a yellow Yo-yo** | yak, yam, yes |
| 26 | z | **Zebra** (zigzag) | zip, zigzag |
| 27 | qu | **The Duck** (quack) — FINALE, whole cast | quack, quick, quiz |

## 5. Current state (what's done vs not)

- **Weeks 1–6:** LIVE readers at `public/satpin-books/` (`snake-in-my-sock.html`,
  `an-apple-for-ant.html`, `the-sat.html`, `spat.html`, `sit-sit-sit.html`,
  `nap-ant-nap.html`). **Week 5 (`sit-sit-sit.html`) already has 9 embedded images —
  fully illustrated. Do NOT redo unless asked.**
- **Picture bank:** photoreal single-object photos at `docs/picture-bank/photos/{word}/`.
  `pig/pig.jpg` already exists. (This is the shelf/3-part-card track — photoreal single
  objects, NOT book scene art.)
- **Books 7–27:** TEXT + ART PROMPTS ONLY (in the ALIGNED docx). **No images generated,
  nothing assembled.** ← the work.

## 6. The task — render Books 7–27 end-to-end (start with Book 7)

Per book:
1. **Generate** the page images via **Midjourney in Chrome** (Claude-in-Chrome), using
   the per-page art prompts from the ALIGNED docx + the style suffix in §8.
2. **Download** the images.
3. **Place** them under `phonics-images/dark-phonics-readers/w{NN}/` on the Mac
   (create the folder). Naming: `p1.png`, `p2.png`, … `finale.png`.
4. **Assemble** a finished reader HTML by copying the structure of
   `public/satpin-books/sit-sit-sit.html` (self-contained, images embedded or linked
   per that file's pattern — check how it references images first). Save as
   `public/satpin-books/{slug}.html` (e.g. `sam-and-the-monkey.html`).
5. **Verify** it opens and every page shows its image + text + the potato finale.
6. Show Tredoux the finished book before moving to the next.

**⚠️ Open decision to confirm with Tredoux before running:** "I want the media in my
picture bank" — the picture bank is the **photoreal single-object** track; book art is
**googly scenes**. Recommend: keep book scene art in `phonics-images/dark-phonics-readers/`,
and only add a **photoreal object card** to the picture bank if a needed object is
missing there. Confirm which he wants (book scenes into the bank = mixing tracks, which
the picture-bank handoff explicitly warns against).

## 7. Midjourney operational gotchas (from the Jul 23 picture-bank run)

- Drive MJ via **Claude-in-Chrome** against midjourney.com; user approves screen access.
- **Stay in Relax mode.** A mid-run switch to Fast hit an out-of-Fast-hours purchase
  paywall last time — do not buy Fast hours without explicit sign-off.
- **Silent queue-cap bug:** submissions past ~4–5 queued jobs are silently rejected with
  NO error unless you read the page text for "Too many queued prompts… your prompt was
  not submitted." Submit in small batches; **verify the textarea actually cleared after
  Enter**, and diff intended-vs-completed at the end, resubmitting misses one-by-one.
- Occasional stale `.git/index.lock` on the Mac when committing → `rm -f .git/index.lock`
  then retry (do it via Desktop Commander / device shell).
- Deploys: Railway auto-deploy on `git push origin main`; hard-refresh after.

## 8. Art style suffix (append to every page prompt)

```
— googly-eye storybook character, loose pen-and-ink cross-hatching, one bold spot colour
on a clean white background, whimsical, expressive, lots of white space --ar 1:1 --style raw
```
Consistency: add `--sref <a song-card image URL/file>` to lock the house look, and build
a character sheet per mascot and add `--cref <that image>` when the mascot recurs.
(First confirm the exact aspect ratio the live readers use by checking an existing
`public/satpin-books/*.html` image — default 1:1 if unclear.)

## 9. Worked example — Book 7 (Week 7, m — “Sam and the Monkey”)

`Dark Phonics · Week 7 (m) · hybrid reader · Gate: Lesson 11 · potato finale`
Say /m/. Mascot: the muddy Monkey. Celebrate: Sam the peg-doll boy joins (his name needs /m/).

1. *‘A monkey sat on the…’* **mat!**
   Art: a scruffy muddy monkey with a banana plopping onto a small woven mat
2. *‘Sam sat on the…’* **mat!**
   Art: a wooden peg-doll boy in blue dungarees sitting neatly on the mat
3. *‘The cat sat on the…’* **mat!**
   Art: a tabby cat squeezing onto the same crowded little mat
4. *‘The monkey sat on…’* **Sam!**  (THE GAG)
   Art: the muddy monkey flopping right on top of the peg-doll boy, banana in the air
5. *‘And the…?!’* — wordless, class shouts **POTATO!**
   Art: a single raw potato on a woven mat; monkey, peg-doll boy and tabby cat all
   staring at it deadpan

(Books 8–27: full page lists + prompts are in the ALIGNED docx — one book per section.)

## 10. References
- Content source of truth: `docs/curriculum/dark-phonics-readers/Dark_Phonics_Readers_Books_7-27_ALIGNED.docx`
- Reader HTML template to copy: `public/satpin-books/sit-sit-sit.html`
- Canon: `docs/curriculum/spec/MASTER_SPINE.md`, `docs/curriculum/HOW_TO_USE_THE_PHONICS_SYSTEMS.md`
- Song cards (mascots + house style): `phonics-images/dark-phonics-song-cards/lesson-05..31.png`
  (lesson = week + 4)
- Picture bank: `docs/picture-bank/photos/{word}/` + `docs/picture-bank/HANDOFF_PICTURE_BANK_Jul23.md`
