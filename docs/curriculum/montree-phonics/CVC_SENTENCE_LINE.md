# CVC Sentence Line — "Their Dictionary"

Date: 2026-07-31

## Vision

One funny, 100%-decodable sentence per SATPIN week: the child traces it, reads
it, then matches a picture to it — a small, growing personal dictionary of
sentences the child has actually earned the right to read. The payoff is
repetition with real stakes: each week's sentence only uses letters the child
has already been taught (plus a short, explicit whitelist of heart words read
by sight), so success compounds week over week instead of resetting.

## Where this sits relative to existing SATPIN material

- **Weeks 1–6 "SATPIN" initial-sound books** (`books_def.py`, wired via the
  `book:` field in `app/montree/library/satpin/page.tsx`) use **real
  photographed objects** on a plain white background — the child shouts the
  picture word, it is not decoded. That is the "photo-real initial-sound-book
  exception" and it does **not** apply here.
- **Weeks 7–27 Dark Phonics readers** (`scripts/curriculum/dark-phonics-readers/`,
  documented in `docs/curriculum/dark-phonics-readers/HANDOFF_DARK_PHONICS_READERS_Jul25.md`)
  use a locked colored pen-and-ink house style. This new CVC sentence line is
  a **decodable-reader material**, same family as the Dark Phonics readers —
  so it uses that locked pen-and-ink style, not the weeks 1–6 photo style.
- Week 3 already has its decodable coverage handled by the existing
  `books_def.py` slug `the-sat` ("The ___ Sat!", the cat is the final-page
  reveal — hence Tredoux's shorthand "the cat sat"), now wired as a download
  chip on week 3's block in `app/montree/library/satpin/page.tsx` (see Job 1
  of this session). No new W3 sentence was needed; a candidate ("a tat sat")
  was checked but rejected as not funny/clear enough to ship — see the
  checker output below.

## Verified sentences per week

Letter gates are cumulative (every letter used in a sentence must belong to
the gate, unless the word is a whitelisted heart word read by sight).

| Week | Gate (cumulative) | Heart words | Sentence | Notes |
|---|---|---|---|---|
| 3 | s, a, t | a | *(none — see above)* | Covered by "The ___ Sat!" book |
| 4 | s, a, t, p | a | **"pat spat at a tap"** | Tredoux's pick, article version (his verbatim was "pat spat at tap" — both verify; the article version was preferred as instructed and reads more naturally) |
| 5 | s, a, t, p, i | a | **"pat spat a pip"** | Callback to Pat from week 4 — Pat spits a fruit seed this time. Alt considered: "pip sips sap" (also verifies; "pat spat a pip" was chosen as the funnier of the two verified options) |
| 6 | s, a, t, p, i, n | a, I | **"an ant naps in a pan"** | Tredoux's verbatim |

## Checker output (machine-verified, 100% decodable)

A small Python checker (`/tmp/verify_cvc.py` in this session) lowercases each
sentence, strips punctuation, splits into words, and requires every letter of
every word to be in that week's cumulative gate — unless the word is on that
week's heart-word whitelist. Full run output:

```
=== Week 3 — gate: ast (cumulative s,a,t,p,i,n up to letter t) — heart words: ['a'] ===
  [PASS] "a tat sat"  (candidate — only if genuinely good)
         words: ['a', 'tat', 'sat']

=== Week 4 — gate: apst (cumulative s,a,t,p,i,n up to letter p) — heart words: ['a'] ===
  [PASS] "pat spat at a tap"  (Tredoux's pick, article version)
         words: ['pat', 'spat', 'at', 'a', 'tap']
  [PASS] "pat spat at tap"  (Tredoux's verbatim)
         words: ['pat', 'spat', 'at', 'tap']

=== Week 5 — gate: aipst (cumulative s,a,t,p,i,n up to letter i) — heart words: ['a'] ===
  [PASS] "pat spat a pip"  (proposed — Pat callback)
         words: ['pat', 'spat', 'a', 'pip']
  [PASS] "pip sips sap"  (alt proposal)
         words: ['pip', 'sips', 'sap']

=== Week 6 — gate: ainpst (cumulative s,a,t,p,i,n up to letter n) — heart words: ['a', 'i'] ===
  [PASS] "an ant naps in a pan"  (Tredoux's verbatim)
         words: ['an', 'ant', 'naps', 'in', 'a', 'pan']
```

Every candidate sentence passed decodability. The week 3 candidate
("a tat sat") passed decodability too but was rejected on editorial grounds
(the word "tat" doesn't paint a clear, funny picture for a small child) —
decodability alone was not sufficient to ship it.

## Midjourney prompt pack

Locked Dark Phonics pen-and-ink house style — used verbatim as the suffix on
every prompt below (per `HANDOFF_DARK_PHONICS_READERS_Jul25.md`):

```
, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes, plain white background. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark.
```

Any liquid (spit, water) is described per the locked rule as "thin ink lines
and droplets with only light blue watercolor accents" — never a solid wash,
and never red (red liquid reads as blood in this style, per the Dark Phonics
handoff's lesson #7).

**Note on character consistency:** "Pat" (the boy in weeks 4–5) and the ant
(week 6) are new to this sentence line and do not yet have a locked
Midjourney character-reference (`--oref`), unlike Sam/Cat/Dog/etc. in the
weeks 7–27 readers. The prompts below deliberately do not invent one — see
"Next session" below.

### Week 4 — "pat spat at a tap"

> A cheeky young boy standing on tiptoes at a bathroom sink, cheeks puffed
> out, spitting a comic jet of water in a wide arc at the wall-mounted tap in
> front of him, thin ink lines and droplets with only light blue watercolor
> accents for the water jet, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

### Week 5 — "pat spat a pip"

> The same cheeky young boy, mouth puckered, spitting a single small fruit
> pip/seed in a comic arc through the air in front of him, thin ink lines and
> droplets with only light blue watercolor accents for any spit trail,
> colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss
> children's-book style, big googly eyes, plain white background. no text, no
> words, no letters, no numbers, no captions, no speech bubbles, no border, no
> watermark. --ar 3:2

*(If "pip sips sap" is preferred instead, swap the scene for: the same boy
sipping tree sap through a tiny straw stuck into a tree trunk, sap rendered as
thin ink lines and droplets with only light blue watercolor accents — same
locked suffix, same --ar 3:2.)*

### Week 6 — "an ant naps in a pan"

> A tiny ant fast asleep, curled up snugly inside a big frying pan that dwarfs
> it, one leg dangling over the pan's rim, a soft swirl of sleepy mist above
> its head, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr.
> Seuss children's-book style, big googly eyes, plain white background. no
> text, no words, no letters, no numbers, no captions, no speech bubbles, no
> border, no watermark. --ar 3:2

## Next session

Once Tredoux has generated and picked the art for these three (or four,
if the week 5 alt is chosen instead) scenes:

1. **Lock a character reference** for "Pat" the boy (and optionally the ant)
   the same way Sam/Cat/Dog etc. were locked for the weeks 7–27 readers, if
   this cast is going to recur across future CVC-sentence weeks.
2. **Build the sheet template** per week: READ IT (the sentence set solid, for
   reading) + TRACE IT (the same sentence in dotted/arrow trace font, via the
   existing `stroke_font` tracing convention used elsewhere in the SATPIN
   print materials) + picture-match cut-outs (the picture above, plus 1–2
   decoy pictures, for the child to match to the sentence they just read).
3. **File art at** `phonics-images/satpin-v2/cvc/<week>/` — e.g.
   `phonics-images/satpin-v2/cvc/week-04/`, `.../week-05/`,
   `.../week-06/` — one folder per week, mirroring the existing
   `phonics-images/satpin-v2/books/<object>/` convention used by the Dark
   Phonics readers.
4. Wire the finished sheet PDF into `app/montree/library/satpin/page.tsx`
   once built — likely as a new row alongside `PaperworkRow`/`ReaderRow`
   rather than reusing either directly, since this is a new material type
   (trace + read + match), not a worksheet pack or a reader.
