# Dark Phonics Shelf System — PLAYBOOK
*(Written 2026-07-20 as executable scaffolding: any Claude session — Opus or Sonnet — following this
document step-by-step should produce packs indistinguishable from the pilot. Read ALL of it before
building anything. The pilot pack is `public/shelf-packs/dark-phonics-shelf-pack-lesson-05-s.pdf`.)*

## 1. The vision (Tredoux's words, paraphrased faithfully)

Each letter gets a four-level Montessori shelf, with the letter's wall card above it:

- **WALL** — one big letter card (lowercase, red, A4) displayed above the shelf.
- **SHELF 1 — Circle flashcards** — the picture+word cards used in circle time (8 per letter).
- **SHELF 2 — Object-to-picture matching** — picture-ONLY cards; child matches real classroom
  miniatures (toy snake, sock, star…) onto the pictures.
- **SHELF 3 — Three-part cards** — 6 target-vocab words. Control card (picture+label), picture
  card, label card. Same images as the flashcards — continuity is the point.
- **SHELF 4 — Sentence work + book** — for letters that HAVE a decodable reader: sentence strips
  matching the book's sentences (6), each with its matching picture, plus the book itself.
  For PRE-READER letters (s and a in the new SATPIN order): a pairs-matching game instead
  (two identical picture sets). This is deliberate — before the child can decode, the bottom
  shelf is still matching work, not sentences.

The system grows letter by letter. Pre-teach the vocabulary on this shelf → the reader gets faster.

## 2. Source-of-truth files (read these before building a pack)

| What | Where |
|---|---|
| This playbook | `docs/curriculum/satpin-redesign/SHELF_SYSTEM_PLAYBOOK.md` |
| Reader designs + page texts (SATPIN wks 1-6) | `docs/curriculum/satpin-redesign/reader-designs-v2.md` (incl. potato-cameo addendum) |
| Art manifest — every MJ job UUID (cast sheets, book pages) | `docs/curriculum/satpin-redesign/art-manifest.md` |
| Locked art style + Midjourney rules | `CLAUDE.md` section "Dark Phonics — locked Midjourney art style" |
| Per-letter vocab, image URLs, materials spec | `lib/montree/english-curriculum/spec/week-NN.json` (numbering below) |
| Pack build script (generalized) | `scripts/curriculum/build_shelf_pack.py` |
| Finished packs | `public/shelf-packs/dark-phonics-shelf-pack-lesson-NN-<letter>.pdf` |

**CRITICAL WEEK-FILE MAPPING** (the old spine numbering does NOT match the new SATPIN order):
new order s,a,t,p,i,n → week files: **s=week-05.json, a=week-01.json, t=week-02.json,
p=week-07.json, i=week-08.json, n=week-06.json**. Each file's `imageUrls` maps vocab word →
hosted image URL (`https://montree.xyz/api/montree/media/proxy/curriculum-images/wNN/<word>.webp`).
Fetch with plain curl from any cloud session — no browser needed.

## 3. Asset-sourcing rules (two style systems — do not mix them)

- **Materials layer (everything in the shelf pack)** uses the EXISTING hosted photo-style plates
  (spotlit, deep-green backdrop). These are the images children know from the songs/vocab packs.
  Never regenerate these if a hosted plate exists.
- **Book layer (readers)** uses the pen-and-ink Seuss style (locked prompt in CLAUDE.md), generated
  on Midjourney V7 with `--oref` character sheets (UUIDs in art-manifest.md). Book art NEVER uses
  photo plates; shelf packs NEVER use pen-and-ink for vocab cards.
- Sentence-strip PICTURES (shelf 4, reader letters) come from the READER's final page art (they
  must match the book) — pull from the MJ CDN via the UUIDs in art-manifest.md
  (`https://cdn.midjourney.com/<uuid>/0_<tile>.png`).

## 4. The per-letter recipe (follow in order)

1. Read the letter's `week-NN.json` → get `newWords` / `threePartCards` word list + `imageUrls`.
2. `curl` the vocab images to a working dir; `convert` webp → png.
3. Run `scripts/curriculum/build_shelf_pack.py` with a config block (see the script's `__main__`
   for the pilot 's' config — copy it and change letter/lesson/words/paths). The script emits the
   full A4 PDF: wall card → flashcards (4/page) → object cards (picture-only) → three-part cards
   (6 words) → shelf-4 section → teacher guide page.
4. SHELF 4 branching:
   - Pre-reader letters (s, a): pairs pages (the script's default) — print-twice instruction is on the page.
   - Reader letters (t onward): replace pairs pages with sentence strips: each strip = one sentence
     of the reader in 28pt+ type on a cut strip, plus the matching book-art picture card. 6 strips
     max, drawn from the reader's page texts in reader-designs-v2.md. NEVER invent sentences — only
     verbatim book sentences (they are the decodable, already-validated text).
5. QA checklist (all must pass before delivery):
   - Every image renders (no broken/blank cells); words spelled correctly on every card.
   - Cut lines dashed, cards within printable margins (15mm), footer on every page.
   - Three-part card labels match flashcard words EXACTLY (same lowercase form).
   - For reader letters: every sentence-strip word verifies letter-by-letter against the letters
     taught by that week (+ approved glue words) — the decodability gate is absolute.
   - Render page thumbnails (`pdftoppm -r 40`) and eyeball a contact sheet before shipping.
6. Deliver the PDF to Tredoux in chat AND commit to `public/shelf-packs/` on his Mac
   (device bridge → commit files → git add/commit). He pushes manually — the sandbox cannot
   reach GitHub; never claim to have pushed.
7. Append the letter's pack to the status table at the bottom of this playbook + commit.

## 5. Card/format specs (locked by the pilot)

A4 portrait, reportlab. Colors: letter red `#c62828`, ink `#1a1a1a`, muted `#777`. Fonts:
Helvetica family only (no missing-glyph risk). Wall letter ~420pt lowercase. Flashcards:
2×2 per page, picture + 26pt bold word. Object cards: same grid, NO label. Three-part cards:
2 words/page — control (pic+label, 88mm), picture card (74mm), label strip (18mm). Pairs: 3×2
picture grid + "print twice" note. Dashed cut lines 0.7pt everywhere. Footer every page:
`Dark Phonics · Lesson NN · '<letter>' · <section>` + `teacherpotato.xyz`.

## 6. Midjourney generation rules (only when NEW art is unavoidable)

All in CLAUDE.md + art-manifest.md, summarized: V8 does NOT support `--oref` — append
`--v 7 --oref <cast-sheet-cdn-url>`. Locked style suffix verbatim, every prompt. Characters:
use canonical sheet UUIDs from the manifest. SLEEP RULE: if the text says a character sleeps,
lead the prompt with "fast asleep, eyes completely closed" and swap the suffix's "big googly
eyes" phrase — otherwise MJ draws it awake. Liquids = "thin ink lines and droplets with <color>
watercolor accents". Expect drawn "Sam" signatures on Sam pages — patch with white rects on
plain-white margins (see build scripts) or pick clean tiles. Wordless potato cameo closes every
reader (potato-cameo addendum) — no shout page, no fake decode.

## 7. Session economics (why this document exists)

Browser work costs context: every MJ screenshot is an image in the session. Discipline:
- SUBMIT prompts in bulk (text-only, cheap) while the MJ unlimited window is open; HARVEST later —
  images persist on the MJ CDN indefinitely and download free via curl once the UUID is known.
- Collect job UUIDs by clicking a feed tile and reading the URL from the tool result (free) —
  close (click 980,111 at 1400×653) → scroll 3 ticks → click next tile (421,288). One screenshot
  to orient, then none. NEVER poll with screenshot loops.
- Review art locally: download all tiles, build one contact-sheet image, look once.
- Shelf packs need NO browser at all (hosted assets + reportlab): Sonnet-safe, cheap.
- Split work across sessions: one session = one letter-batch. Everything durable goes in the repo
  first; sessions are disposable, files are not.

## 8. Status table

| Letter | Reader | Shelf pack | Notes |
|---|---|---|---|
| s | n/a (sound-only wk) | ✅ lesson-05-s (pilot, 2026-07-20) | pairs on shelf 4 |
| a | n/a (sound-only wk) | ☐ | pairs on shelf 4; a=week-01.json |
| t | "Segina Sat!" (hybrid, designed) | ☐ | first sentence-strip shelf ("Sat!" lines) |
| p | "SPAT!" (art done exc. p6 hushed-hover re-roll) | ☐ | strips from SPAT! text |
| i | "Sit! Sit! Sit!" (art done) | ☐ | strips from Sit! text |
| n | "Nap, Ant, Nap!" (COMPLETE) | ☐ | strips from Nap text |
| m→qu | not designed | ☐ | design via reader-designs-v2 system, batch of 4-5 letters/session |

---
# CORRECTION (2026-07-21, from Tredoux's feedback — RULE OVERRIDES §4 ABOVE)

**For reader letters, shelf vocabulary MUST flow from the Dark Phonics book — never from
generic initial-sound lists.** The first p/i/n packs used pig/panda/igloo-style vocab from the
old week files and were rejected ("incredibly weak"). The corrected rule:

- Shelf 1 flashcards = the book's DECODABLE words, illustrated with the book's OWN pen-and-ink
  page art (word→page mapping in `scripts/curriculum/build_reader_packs.py`-style configs).
- Shelf 2 = word-card-to-picture-card matching (same words, same art).
- Shelf 3 = three-part cards, same words, same art.
- Shelf 4 = verbatim sentence strips + matching pages + the book.
- The whole shelf is ONE visual chain that ends in the child reading the book. If a picture on
  the shelf does not appear in the book, it does not belong on a reader letter's shelf.
- Pre-reader letters (s, a) keep the SONG vocabulary (snake/sock/seal…) because their circle
  flashcards ARE the song vocab — that was Tredoux's explicit instruction.
- 't' pack: decodable pool is only at/sat; full pack ships WITH "Segina Sat!" art (Thursday).
