# Pink Readers — Build Handoff (pin, May 24 2026)

**Status: Book 1 sample built and approved. Build Books 2–15 + both guides +
ship as a Montree library page, in one go.** This doc is self-contained — a
fresh session can execute the whole build cold from here.

---

## What this is

A graded series of **decodable readers** for the Montree Pink Phase (UFLI
lessons 5–53) — real little story books a child can read end to end with no
guessing, because every word is phonics already taught or a heart word already
introduced. They fill the gap between the lesson content's isolated sentence
cards and "a real book."

The user reviewed the Book 1 sample and greenlit the full series. **Book 1's
voice, format and quality bar are approved — match them exactly.**

---

## Read these FIRST (canonical references)

1. **`docs/readers/Pink_Readers_SERIES_PLAN.md`** — the series bible. Craft
   principles, the iron decodability rule, recurring cast, locked visual style,
   the full 15-book map. This is the law.
2. **`docs/readers/Book_01_Cat_Can_Nap.md`** — the approved sample. It IS the
   template: every book matches its document format exactly (header with word
   inventory + decodability check → cover → each page as text + art brief +
   composition note → teacher note).
3. **`public/language-area-lessons.html`** — THE canonical Pink Phase word
   inventory. Per-lesson "letter pool" annotations + per-lesson "Reading words"
   lists + the heart-word schedule table. Every word in every book is checked
   against this.

---

## The job

1. Write **Books 2–15** as `docs/readers/Book_NN_Title.md`, each in Book 1's
   exact format.
2. Write the **Teacher Guide** and the **Canva Production Guide**.
3. Ship everything as a **Montree library page**: a new static HTML page
   `public/pink-readers.html` + a card wired into the library.
4. Commit + push via Desktop Commander.

---

## The iron rule (do not break this)

For every book, every word is either:
- a letter-sound / pattern taught **up to that book's gate lesson**, or
- a **heart word already introduced** by that gate (heart-word schedule is in
  `language-area-lessons.html`), or
- `and` (decodable a-n-d from L13).

**Safe-vocabulary method:** Book N's safe word pool = the union of every
"Reading words" list in lessons L5 → [gate lesson] in `language-area-lessons.html`,
plus heart words introduced through the gate, plus `and`, plus decodable
proper names. Pull words from there. If a word isn't reachable that way, it
doesn't go in the book.

**The usual mistakes — do NOT make them:**
- `h` is not taught until L21 → no `had`, `has`, `hat`, `hot`, `hop` in Book 1.
- `r` (L20), `b` (L22), `f` (L23), `l` (L24) gate large word families.
- **No `-s` plurals, no `-ing`/`-ed`, no possessive `'s`** anywhere in the
  series — Pink Phase never teaches inflectional morphology. Write around them.
- Proper names must be decodable at their gate (Sam = s-a-m). Use only the
  cast in the series plan; no character before its name decodes.
- Run a word-by-word decodability self-audit on every finished book.

---

## Gate table (precomputed — letters & heart words available per book)

| Book | Gate | New decoding tools since previous | Heart words newly available |
|------|------|-----------------------------------|------------------------------|
| 1 ✅ | after L17 | s a t p i n m d g o c k ck; short a/i/o | a, I, the, to, was, of |
| 2 | after L21 | + e u r h (all 5 short vowels) | + he, she, me, we, be, you, are, here, have |
| 3 | after L24 | + b f l | + said, for, there, where |
| 4 | after L31 | + j v w x y z qu (alphabet complete) | + do, does, your, what, want, one, two, this, they |
| 5 | after L34 | Phase 1 close — consolidation only | + that, with, from, would |
| 6 | after L37 | short a/i/o automaticity (no new letters) | (no new) |
| 7 | after L40 | five short vowels, minimal pairs | (no new) |
| 8 | after L41 | FLSZ doubling: ff ll ss zz at word end | (no new) |
| 9 | after L43 | + sh, ch digraphs | + over |
| 10 | after L46 | + th (voiced & unvoiced), wh | + any, many |
| 11 | after L48 | + ending blends -st -nd -mp -nk -nt -lt | + come, some |
| 12 | after L50 | + s-blends (sl sm sn sp st sw), l-blends (bl cl fl gl pl) | + who, don't |
| 13 | after L51 | + r-blends (br cr dr fr gr pr tr) | (no new) |
| 14 | after L53 | + tw dw, triple blends (str scr spl spr thr shr) | (no new) |
| 15 | Pink finale | everything — full consolidation | all |

Heart words are **cumulative** — Book 5 onward has the whole Pink set.

---

## Per-book spec

- **Length:** Book 1 = 9 pages. Books 2–5 ≈ 10–12 pages. Books 6–15 ≈ 10–14.
- **Sentences/page:** Book 1 = 1. Books 2–5 = 1–2. Books 6–15 = 2–3. Never
  more than 3 (user's rule). Short sentences always.
- **Structure:** cover + story pages. A real arc — small want, a turn, a warm
  or funny resolution. A page-turn hook on most pages (question / trailing
  sentence). A "button" final page. Early books lean on a repeated sentence
  frame so the child predicts and feels fluent.
- **Art briefs carry the emotion.** The constrained words can't say "Sam was
  amused" — the art brief must specify every character's expression and the
  emotional subtext of the scene. This is the core technique. Every page gets
  a vivid, specific art brief + a composition note (where the text sits).
- **Recurring cast** (series plan has the table): Sam + the cat anchor every
  book; pup, Mom, Dad, hen, fox, frog join as their names become decodable.
- **Working titles** are in the series plan's 15-book map — refine them but
  keep each title decodable at its own gate.

---

## Deliverable — the Montree library page

Ship as a static HTML page, exactly the pattern used for the existing Pink
lesson content (CLAUDE.md Session 112).

1. **Create `public/pink-readers.html`** — one page containing: a short intro,
   all 15 readers (each = the decodability header, then every page as text +
   art brief), the Teacher Guide, the Canva Production Guide. **Neutral
   branding** — "The Complete Language Area — Pink Readers" or similar, NO
   "Whale" branding (the library versions are neutral, per Session 112). Style
   it to match `public/language-area-lessons.html` — same CSS look, fonts,
   layout classes. Reuse that file's `<style>` as the base.
2. **Wire a card into `app/montree/library/language-area/page.tsx`** — that
   page already has cards for the Setup Guide and Pink Phase Lessons (Session
   112). Add a third card, "Pink Readers", linking to `/pink-readers.html` via
   a plain `<a href>` (NOT an iframe — CSP `frame-ancestors 'none'`, rule #96).
3. **Optional:** mirror an admin tile (`/admin/...`) like Session 112's
   reading-content tile — only if quick; the library card is the requirement.

---

## The two guides (write these into the HTML page)

**Teacher Guide** — must cover: what a decodable reader is and why it differs
from a levelled/predictable reader; the rule that a book is a *milestone
reward* after its gate lesson, not a daily worksheet; the **three reads**
routine (decode → smooth → read for story — see Book 1's teacher note); using
page-turn hooks; the comprehension question pattern (including "how do we know
how the character feels?" → child reads the picture); the Mandarin-L1 watch
points (final stops, the hard sounds per the lesson content's ESL notes); and
a table mapping each book to its gate lesson so teachers know when to hand it
over.

**Canva Production Guide** — how to turn the manuscripts + art briefs into
finished books in Canva: one **locked visual style** for all 15 (palette,
flat warm illustration, consistent Sam + cat character designs — see series
plan); building each page as a scene from Canva elements / Canva Magic Media,
white/clean backgrounds; **typography rules** — lowercase print, the **Andika**
font (free, literacy-designed, single-storey a/g), large + generously spaced,
high contrast, text on a clean band never over a busy image; page size /
spread layout; how to assemble, export and print-and-staple a little book.
(The picture-sourcing playbook at the bottom of `language-area-lessons.html`
is related prior art — stay consistent with it.)

---

## Git

Commit + push via Desktop Commander ONLY (per CLAUDE.md): `start_process` with
`cd ~/Desktop/Master\ Brain/ACTIVE/whale && rm -f .git/index.lock && git add docs/readers public/pink-readers.html app/montree/library CLAUDE.md && git commit -m "..." && git push origin main 2>&1`, `timeout_ms: 30000`. Clear any
stale `.git/index.lock` first. If the library page touches an admin route too,
add that path.

---

## Verification before shipping

- Word-by-word decodability self-audit on **every** book against its gate.
- Lint any changed `.tsx` (the library page edit).
- Confirm the library card links correctly and the HTML page renders.
- Each book has: a real arc, page-turn hooks, a button ending, a complete set
  of art briefs with specified expressions, and a teacher note.

---

## Done when

15 readers + Teacher Guide + Canva Production Guide all live on
`public/pink-readers.html`, reachable from a card on the language-area library
page, committed and pushed.
