# Grace & Courtesy — V2 REGROUPED SERIES — Canonical Handoff

**THIS SUPERSEDES `HANDOFF_GRACE_COURTESY_SERIES.md`'s entire book model.**
That file's one-rule-per-book architecture (20 individual books, one
7-spread storybook per rule) is RETIRED as of 2026-08-19, founder decision.
Read THIS file first for anything Grace & Courtesy related. The old file is
kept only as historical record of the art style, cast descriptors, and repo
mechanics — which still apply — but its book list, its BOOKS/KEY_MAP/RAW
entries, and its whole "one rule = one book" premise are gone.

**If you are a fresh session picking this up: read this file in full before
doing anything.** It is written to be fully self-contained — you should not
need to dig through old chat transcripts to continue this work.

---

## 0. The one-sentence version

Twenty individual rule-books, taught and shipped one at a time, was too
granular and too slow ("one by one is just painful" — founder). The series
is being rebuilt as **6 combined storybooks, each teaching 3-4 related
rules as one continuous story, plus a 7th standalone recap finale.** Every
existing single-rule book (shipped or not) is being retired and replaced —
this is a full rewrite, not a patch. Cut losses on the old art/text; keep
the parts of the pipeline (art style, repo mechanics) that still work.

## 1. Repo essentials (unchanged from the old doc)

- Repo: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree`,
  remote `git@github.com:Tredoux555/whale-class.git`, branch `main`.
- Public page, no auth: `app/montree/library/grace-courtesy/page.tsx`.
- Git: **only Desktop Commander** (`mcp__remote-devices__Desktop_Commander__*`)
  for git operations — never `device_bash` (index/HEAD lock issues; that
  bridge can't `rm` a stale lock file either). Stage exact files touched,
  never `git add -A`.
- Picture Bank ingestion script (needs native `sharp`, Mac only, so also
  Desktop Commander not `device_bash`):
  `scripts/curriculum/upload-grace-courtesy-book-art.mjs`.
- Print build script: `scripts/curriculum/grace-courtesy-books/build_a5_readers.py`
  — **this script currently assumes a fixed shape: cover + why-page + 7
  story spreads + back cover, one rule per book.** It needs to be
  generalized to accept a variable-length spread list (26 for Book 1,
  fewer/more for other units) before it can build a V2 book. This has NOT
  been done yet — whoever builds Book 1 needs to extend `make_book()` /
  `BOOKS` entries to take a full ordered list of (text, art) tuples of
  arbitrary length instead of the fixed `pages=[...7 tuples...]` shape.
  The painters/imposition logic in `scripts/curriculum/flashcards/build_booklets.py`
  should not need to change — it's page-count agnostic already.
- Draft-preview technique (show Tredoux before ANY commit — hard rule,
  unchanged): copy the build script + `build_booklets.py` into a scratch
  dir *under an allowed Desktop Commander path* (e.g.
  `/Users/tredouxwillemse/Desktop/Master Brain/_scratch/...` — NOT `/tmp`,
  Desktop Commander's file tools refuse paths outside its allow-list, only
  `start_process` can freely write to `/tmp`), filter to the one book being
  previewed, set `MONTREE_CANVAS_FONTS` / `MONTREE_BOOKS_ROOT` /
  `MONTREE_BOOK_OUT` env vars to point at the real repo's fonts/art and a
  scratch output dir, run it for real, rasterize with `pdftoppm`, and
  either build a contact sheet or view pages directly. To get files from
  that scratch dir into this chat session for `SendUserFile`/`Read`, they
  must be copied into the connected-folder tree first (the montree repo or
  Downloads — `mcp__remote-devices__get_device_info` lists connected
  folders) and staged with `device_stage_files`; clean up scratch/preview
  files afterward (`mv` them out of the repo, not `rm` via `device_bash`
  which can't delete).
- Never fake progress: don't move anything into `RAW` in `page.tsx` until
  the real art and real print PDFs exist and have been eyeballed page by
  page. This rule is why Books 1-3 were real before, and it's why the old
  Books 1-6 (see §5) are being retired rather than silently left half-done.
- Tredoux is not a coder: run lint/typecheck/git/build yourself, never ask
  him to. The only manual step he ever does is pasting SQL into Supabase
  (not relevant to this series — no DB migrations here) and running MJ
  prompts himself (see §2).

## 2. Art & MJ workflow (unchanged)

- MJ v8.2. No `--cref`/`--oref` ever.
- **Tredoux runs every MJ prompt himself, always.** Claude delivers full
  prompt packs IN CHAT and never submits anything. This is non-negotiable
  and has held for the entire series.
- Cast descriptors — repeat VERBATIM every time a character is named in a
  prompt (not by pronoun/name alone):
  - CAT = "a big scruffy golden tabby cat with dark scratchy stripes, wild
    wiry whiskers, and big round googly eyes"
  - POTATO = "a round brown potato with tiny round wire glasses, two little
    sprout tufts, thin bendy legs, and big round googly eyes"
  - SNAKE = "a small friendly green snake with a slim curving body, big
    round googly eyes, and a wide happy smile"
  - APPLE = "one large glossy red apple with a curved brown stem and big
    round googly eyes"
  - ANT = "one small shiny black ant with big round googly eyes and thin
    bendy legs"
  - STAR = "a smiling golden five-pointed star with big round googly eyes"
- House suffix, every single prompt: `colored hand-drawn pen-and-ink, fine
  crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes,
  plain white background. no text, no words, no letters, no numbers, no
  captions, no speech bubbles, no border, no watermark. --ar 3:2`
- Test-run any genuinely new prop/scene 3x before committing to a full
  pack (e.g. Book 1's doorway/line-up scene has never been drawn before).

## 3. The V2 architecture — 6 combined books + 1 finale

Audience: 3-6 year old EFL (Chinese L1) children who can barely read yet —
pictures carry the story, text is a predictable-pattern anchor, not
something they decode. Each book is ONE continuous scene/day, not stitched
mini-stories, and each teaches 3-4 rules that share a real underlying
skill (not just similar titles).

1. **How I Move** — Walking Feet, Indoor Voice, Gentle Hands, Line Up
2. **How I Take Care** — Wash Your Hands, Cover Your Cough, Helping Hands
3. **How I Ready My Work** — Roll the Mat, Push In Your Chair, Everything
   Has a Home
4. **How I Share the Room** — May I Watch?, Walk Around the Mat, Careful
   Carrying
5. **How I Speak** — Hello Hello!, Please and Thank You, Excuse Me
6. **How I Get Along** — My Turn Your Turn, Kind Words, Sorry
7. **The Whale Class Way** — standalone recap finale, one line per book:
   "We move. We take care. We ready our work. We share the room. We speak
   kindly. We get along. That's the Whale Class way!" Full cast, one big
   send-off scene. Not built out chapter-by-chapter like books 1-6 — just
   this single recap spread plus a cover/why/back, same shape as the old
   single-rule books had.

No songs anywhere in V2 (this was already decided before the regroup
pivot — see the old handoff's §2e — and still stands).

## 4. The language & psychology design system (locked — apply to every book)

**Predictable sentence-skeleton**, repeated across the whole series so a
pre-reading L2 child can anticipate the shape of each beat before they can
decode a single word (same principle as "Brown Bear, Brown Bear" —
patterned text supports emergent reading through anticipation, not
decoding). Six beats per rule/chapter:

1. **Establish** — "We ___." (plural, present tense, group doing it right)
2. **Oops** — "Oh! [Name] ___." (concrete, visible, never abstract). The
   rule-breaker stays cheerful/oblivious — that obliviousness is the
   comedic engine and what makes the "Oh, Potato/Cat/whoever" correction
   land as gentle, not punishing.
3. **Reaction** — TWO registers, pick the one that's actually true:
   - *Physical consequence* (something fell, spilled, got bumped): the
     affected character(s) react HONESTLY — surprised, dizzy, dismayed —
     same "not extreme either direction" rule as always. Not fake-cheerful
     about it, not genuinely hurt/scared/crying either.
   - *Social consequence* (nobody's hurt, a rule was just skipped): the
     group is warmly **unimpressed** — flat expression, arms crossed, a
     silent "hmm," not mean, not devastated, not pretending it's fine.
     This is the NEW addition for V2 — most Book 1 breaks are physical
     (bumping, squeezing), but manners/turn-taking rules later in the
     series (Please and Thank You, My Turn Your Turn, etc.) need this lane.
4. **Remember** — "Oh, [Name]. We ___." — same verb phrase as Establish.
5. **Fix** — "Now [Name] ___!"
6. **Landing** — "[Rule phrase], happy friends!" or similar — closes the
   chapter's loop, echoes Establish's verb again.

Each book ends with ONE shared **unit closing**: a cumulative recap line
stringing every chapter's Establish line together in sequence, over a full
group scene, everyone happy including whoever was the rule-breaker in that
book. This is the "work of art" device — a child who's heard the whole
book can predict the ending sentence before you finish reading it.

**Cast rotation — no character is "always" the one who messes up.** Locked
assignment, no repeats within the same book:

| Book | Rule | Breaker |
|---|---|---|
| 1 How I Move | Walking Feet | Star |
| 1 How I Move | Indoor Voice | Cat |
| 1 How I Move | Gentle Hands | Snake |
| 1 How I Move | Line Up | Potato |
| 2 How I Take Care | Wash Your Hands | Apple |
| 2 How I Take Care | Cover Your Cough | Ant |
| 2 How I Take Care | Helping Hands | Cat |
| 3 How I Ready My Work | Roll the Mat | Star |
| 3 How I Ready My Work | Push In Your Chair | Potato |
| 3 How I Ready My Work | Everything Has a Home | Apple |
| 4 How I Share the Room | May I Watch? | Ant |
| 4 How I Share the Room | Walk Around the Mat | Cat |
| 4 How I Share the Room | Careful Carrying | Potato |
| 5 How I Speak | Hello, Hello! | Potato |
| 5 How I Speak | Please and Thank You | Apple |
| 5 How I Speak | Excuse Me | Snake |
| 6 How I Get Along | My Turn Your Turn | Cat |
| 6 How I Get Along | Kind Words | Ant |
| 6 How I Get Along | Sorry | Star |

Totals across the 19 chapters: Potato 4, Cat 4, Ant 3, Apple 3, Star 3,
Snake 2. Nobody is the permanent fool; Potato stays the most frequent
guest star (series mascot) without being exclusive.

## 5. Full locked text — all 6 books

Format per chapter: Establish / Oops / Reaction / Remember / Fix / Landing.

### Book 1 · How I Move — frame: a morning arriving at Whale Class

**Walking Feet (Star).** "We walk inside." / "Oh! Star runs inside." /
"Oh! Star bumps into Apple." (physical, honest surprise) / "Oh, Star. We
walk inside." / "Now Star walks calmly." / "Walking feet, happy friends!"

**Indoor Voice (Cat).** "We use indoor voices." / "Oh! Cat shouts hello."
/ "Whoa! Ears ring." (physical/sensory, honest startle) / "Oh, Cat. We use
indoor voices." / "Now Cat whispers." / "Soft and quiet, happy friends!"

**Gentle Hands (Snake).** "We use gentle hands." / "Oh! Snake squeezes too
tight." / "Oh! Apple feels squished." (physical, dizzy-stars convention) /
"Oh, Snake. We use gentle hands." / "Now Snake holds gently." / "Gentle
hands, happy friends!"

**Line Up (Potato).** "We line up, one behind one." / "Oh! Potato cuts to
the front." / "Not so fun, friends." (SOCIAL, unimpressed lane) / "Oh,
Potato. We line up, one behind one." / "Now Potato waits its turn." / "One
behind one, ready to go!"

**Closing:** "We walk inside. We use indoor voices. We use gentle hands.
We line up, one behind one. We're ready for the day!" — full cast walking
out into sunshine together.

### Book 2 · How I Take Care — frame: getting ready for snack time

**Wash Your Hands (Apple).** "We wash our hands." / "Oh! Apple skips the
sink." / "Yuck! Dirty hands on the crackers." (physical, honest recoil) /
"Oh, Apple. We wash our hands." / "Now Apple scrubs, scrubs, scrubs." /
"Clean hands, ready to help!"

**Cover Your Cough (Ant).** "We cover our cough." / "Oh! Ant coughs into
the air." / "Oh! Friends lean back." (physical/sensory, honest startle) /
"Oh, Ant. We cover our cough." / "Now Ant coughs into an elbow." / "Cover
it up, keep friends well!"

**Helping Hands (Cat).** "We help our friends." / "Oh! Cat walks away." /
"Not so fun, friends." (SOCIAL, unimpressed lane) / "Oh, Cat. We help our
friends." / "Now Cat helps clean up." / "Many hands, tidy table!"

**Closing:** "We wash our hands. We cover our cough. We help our friends.
We take good care!" — full cast around a clean, tidy table.

### Book 3 · How I Ready My Work — frame: one full work cycle

**Roll the Mat (Star).** "We roll out our mats." / "Oh! Star leaves the
mat in a heap." / "Not so fun, Ant." (SOCIAL, unimpressed lane) / "Oh,
Star. We roll out our mats." / "Now Star rolls it out neatly." / "Neat and
ready to work!"

**Push In Your Chair (Potato).** "We push in our chairs." / "Oh! Potato
leaves the chair out." / "Oh! Ant bumps the chair." (physical, dizzy-stars
convention) / "Oh, Potato. We push in our chairs." / "Now Potato pushes it
in." / "Nice and neat, nobody bumps!"

**Everything Has a Home (Apple).** "Everything has a home." / "Oh! Apple
drops toys everywhere." / "Not so fun, friends." (SOCIAL, unimpressed
lane) / "Oh, Apple. Everything has a home." / "Now Apple puts it all
away." / "A place for everything, ready for a friend!"

**Closing:** "We roll out our mats. We push in our chairs. Everything has
a home. We're ready to work!"

### Book 4 · How I Share the Room — frame: crossing a room full of others' work

**May I Watch? (Ant).** "We ask, 'May I watch?'" / "Oh! Ant leans right
in." / "Not so fun, Star." (SOCIAL, unimpressed lane) / "Oh, Ant. We ask,
'May I watch?'" / "Now Ant asks first." / "Ask first, watch happily!"

**Walk Around the Mat (Cat).** "We walk around the mat." / "Oh! Cat walks
straight across." / "Oh! Potato's tower wobbles." (physical, honest
startle) / "Oh, Cat. We walk around the mat." / "Now Cat walks around." /
"Space to work, happy friends!"

**Careful Carrying (Potato).** "We carry with two hands, slow feet." /
"Oh! Potato rushes with a wobbly tray." / "Oh no! Beads spill everywhere."
(physical, honest dismay) / "Oh, Potato. Two hands, slow feet." / "Now
Potato carries carefully." / "Careful hands, safe work!"

**Closing:** "We ask, 'May I watch?' We walk around the mat. We carry with
two hands, slow feet. We share the room."

### Book 5 · How I Speak — frame: the words that thread through a whole day

**Hello, Hello! (Potato).** "We say hello." / "Oh! Potato runs straight
past." / "Not so fun, friends." (SOCIAL, unimpressed lane) / "Oh, Potato.
We say hello." / "Now Potato says, 'Hello, hello!'" / "Hello, hello!
Friends feel seen."

**Please and Thank You (Apple).** "We say please and thank you." / "Oh!
Apple grabs without asking." / "Not so fun, Star." (SOCIAL, unimpressed
lane) / "Oh, Apple. We say please and thank you." / "Now Apple asks
nicely." / "Please and thank you, magic words!"

**Excuse Me (Snake).** "We say excuse me." / "Oh! Snake squeezes through
without asking." / "Not so fun, Ant and Star." (SOCIAL, unimpressed lane)
/ "Oh, Snake. We say excuse me." / "Now Snake says, 'Excuse me.'" /
"Excuse me — the polite way in!"

**Closing:** "We say hello. We say please and thank you. We say excuse
me. We use kind words to speak."

### Book 6 · How I Get Along — frame: building a block tower together

**My Turn, Your Turn (Cat).** "We take turns." / "Oh! Cat grabs the
blocks." / "Not so fun, Ant and Apple." (SOCIAL, unimpressed lane) / "Oh,
Cat. We take turns." / "Now Cat waits." / "Turn by turn, the tower grows!"

**Kind Words (Ant).** "We use kind words." / "Oh! Ant's words are sharp."
/ "Not so fun, Snake." (this one lands as an honest hurt-feelings
reaction, mild — not devastated) / "Oh, Ant. We use kind words." / "Now
Ant says something kind." / "Kind words, happy friends."

**Sorry (Star).** "We build together." / "Oh! Star bumps the tower." /
"Oh no! The tower falls!" (physical, honest dismay, not devastated) / "Oh,
Star. Say sorry." / "Star says sorry. Friends help rebuild." / (chapter
landing folds into the unit closing below)

**Closing:** "We take turns. We use kind words. We say sorry. We get
along!" — full cast, including Potato even though this book wasn't
Potato's chapter, around the finished tower.

### Book 7 · The Whale Class Way — standalone recap finale

Not chapter-built like books 1-6. One recap spread, one line per book:
"We move. We take care. We ready our work. We share the room. We speak
kindly. We get along. That's the Whale Class way!" Full cast, one big
send-off scene. Cover + why-page + this one recap spread + back cover —
same shape as the old single-rule books had.

## 6. What happens to the old single-rule books

Books 1-3 (walking-feet, indoor-voice, gentle-hands) are shipped and live
in `RAW`. Books 4 (wash-your-hands) shipped 2026-08-19. Book 5
(roll-the-mat) was one art step from shipping. Book 6
(push-in-your-chair) only had prompts delivered, nothing generated. **All
six are write-offs under this pivot** — their rule content lives on inside
the new combined books (per the rotation table in §4), but their
storybook art/text/print-pipeline entries do not carry forward as-is.

**Do not delete anything yet.** The plan is: build and ship New Book 1
first, confirm the new format actually works end to end (art, print
build-script changes, Picture Bank ingestion, `page.tsx` presentation),
THEN retire old Books 1-3's `RAW` entries and old print PDFs/Picture Bank
tags in the same commit that ships New Book 1. Old Books 4-6's
half-finished assets (art files under `phonics-images/grace-courtesy-books/`,
which is gitignored anyway) can be cleaned up whenever, they were never
fully shipped.

## 7. Current status (2026-08-19) — start here

**Book 1 "How I Move" MJ prompt pack has been delivered to Tredoux in chat
and he is about to start generating in Midjourney.** Nothing has been
filed, no code has been touched for V2 yet. The prompt pack is reproduced
in full below so a new session can hand it straight back to him without
re-deriving anything.

**Immediate next steps, in order:**
1. Wait for Tredoux to send winners (26 images: cover + 4 chapters x 6
   beats + 1 unit closing). He may send them in batches by chapter.
2. File winners to a new directory, e.g.
   `phonics-images/grace-courtesy-books/how-i-move/` (page-01-cover.png …
   page-26.png, matching the naming below).
3. Generalize `build_a5_readers.py` to accept a variable-length page list
   (see §1's flag) and add a `how-i-move` entry.
4. Build a real draft in a scratch dir, rasterize, show Tredoux the full
   book before touching anything live — hard rule, does not change.
5. On approval: run the real build, retire old Books 1-3 from `RAW` and
   their Picture Bank tags/print PDFs, add the new `how-i-move` `RAW`
   entry, re-ingest the 26 new pages into the Picture Bank
   (`KEY_MAP['how-i-move']`), scoped typecheck, commit + push, verify live.
6. Update this file's status and move to Book 2 (How I Take Care) prompts.

## 8. Book 1 "How I Move" — full MJ prompt pack (already delivered to Tredoux)

New this book: a doorway/line-up scene, never drawn before. Test-run
page-20 first (trickiest expression: unimpressed, not mean).

**page-01-cover** — CAT, POTATO, ANT, APPLE, STAR, and SNAKE all walking
in through a doorway together, warm morning light, all cheerful, [suffix]

**Chapter 1 — Walking Feet (Star)**
- page-02 — CAT, ANT, and APPLE walking calmly through a doorway
  together, calm and happy, [suffix]
- page-03 — STAR running through a doorway with big excited energy, short
  dashed ink motion lines, big happy oblivious grin, [suffix]
- page-04 — STAR colliding into APPLE, APPLE with arms flung out, a
  startled wide-eyed expression, a few tiny ink motion lines, not smiling,
  not distressed, [suffix]
- page-05 — CAT standing with one paw gesturing calmly toward STAR, STAR
  looking up sheepishly, [suffix]
- page-06 — STAR walking calmly beside CAT, small proud smile, [suffix]
- page-07 — CAT, STAR, ANT, and APPLE all walking together calmly,
  smiling, [suffix]

**Chapter 2 — Indoor Voice (Cat)**
- page-08 — ANT, APPLE, STAR, and SNAKE sitting together calmly in a
  circle, relaxed and quiet, [suffix]
- page-09 — CAT with mouth wide open mid-shout, big enthusiastic burst of
  energy, [suffix]
- page-10 — ANT, APPLE, and SNAKE flinching back with startled wide eyes,
  paws and leaves near their ears, a few tiny ink motion lines, not
  smiling, not distressed, [suffix]
- page-11 — APPLE gently gesturing toward CAT, CAT looking sheepish,
  [suffix]
- page-12 — CAT with one paw near its mouth, whispering softly, calm
  expression, [suffix]
- page-13 — CAT, ANT, APPLE, STAR, and SNAKE sitting together calmly in a
  circle, smiling, [suffix]

**Chapter 3 — Gentle Hands (Snake)**
- page-14 — STAR passing a small basket carefully to APPLE at a small
  table, both calm and gentle, [suffix]
- page-15 — SNAKE wrapped tightly around the basket, squeezing it, big
  happy oblivious smile, [suffix]
- page-16 — APPLE looking a little wobbly and squished, a few tiny ink
  stars circling around its head, not smiling, not distressed, [suffix]
- page-17 — STAR gently pointing at the basket, SNAKE looking sheepish,
  [suffix]
- page-18 — SNAKE holding the basket loosely and gently, calm coiled
  posture, [suffix]
- page-19 — SNAKE, STAR, and APPLE all smiling together around the
  basket, [suffix]

**Chapter 4 — Line Up (Potato)**
- page-20 — CAT, ANT, APPLE, STAR, and SNAKE standing in a neat line by a
  doorway, calm and orderly, [suffix]
- page-21 — POTATO squeezing past the line toward the front, big happy
  oblivious grin, [suffix]
- page-22 — CAT, ANT, APPLE, STAR, and SNAKE all looking at POTATO with
  flat, unimpressed expressions, arms crossed, not smiling, not upset,
  [suffix]
- page-23 — CAT gently gesturing toward the back of the line, POTATO
  looking up sheepishly, [suffix]
- page-24 — POTATO standing patiently at the back of the line, small
  proud smile, [suffix]
- page-25 — CAT, POTATO, ANT, APPLE, STAR, and SNAKE all standing in a
  neat line together, smiling, [suffix]

**page-26 — unit closing** — CAT, POTATO, ANT, APPLE, STAR, and SNAKE all
walking out of a doorway together into bright sunshine, big joyful group
scene, everyone happy, [suffix]

`[suffix]` = `colored hand-drawn pen-and-ink, fine crosshatch, whimsical
Dr. Seuss children's-book style, big googly eyes, plain white background.
no text, no words, no letters, no numbers, no captions, no speech
bubbles, no border, no watermark. --ar 3:2`

## 9. Maintenance rule (same as always)

This file must never fall behind reality. If you file art, build a book,
or ship anything, update §7's status and the fate-of-old-books note in
the SAME commit. If a fresh session reads this and Tredoux has already
sent Book 1 winners, skip straight to filing them (§7 step 2) — don't
re-derive the prompt pack, it's already above.
