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

## Full weekly table (w3–w27)

Letter gates are cumulative (every letter used in a sentence must belong to
the gate for that week's series letter, unless the word is a whitelisted
heart word read by sight: **a, an, I**). Series week/letter order: w1 s, w2 a,
w3 t, w4 p, w5 i, w6 n, w7 m, w8 d, w9 g, w10 o, w11 c, w12 k, w13 ck, w14 e,
w15 u, w16 r, w17 h, w18 b, w19 f, w20 l, w21 j, w22 v, w23 w, w24 x, w25 y,
w26 z, w27 qu.

| Week | New letter | Sentence | Notes |
|---|---|---|---|
| 3 | t | *(none)* | Covered by "The ___ Sat!" book |
| 4 | p | **"pat spat at a tap"** | Tredoux's pick, article version (his verbatim "pat spat at tap" also verifies) |
| 5 | i | **"pat spat a pip"** | Callback to Pat from week 4 |
| 6 | n | **"an ant naps in a pan"** | Tredoux's verbatim |
| 7 | m | **"sam naps in a tin"** | |
| 8 | d | **"a sad dad sat in sand"** | |
| 9 | g | **"a pig digs a pit"** | |
| 10 | o | **"a dog sits on a pot"** | |
| 11 | c | **"a cat tips a pot"** | |
| 12 | k | **"a kid dips a dog"** | |
| 13 | ck | **"a pig kicks a sock"** | ck = c+k, both already introduced (w11, w12) |
| 14 | e | **"a pig sits on an egg"** | |
| 15 | u | **"a pup sat in a cup"** | |
| 16 | r | **"a rat runs up dad"** | |
| 17 | h | **"a hen sat on a hot pan"** | |
| 18 | b | **"a bug naps in a bun"** | |
| 19 | f | **"a fat cat sits on a fan"** | |
| 20 | l | **"a dog licks a leg"** | |
| 21 | j | **"a pig jogs in jam"** | |
| 22 | v | **"a vet hugs a big pig"** | |
| 23 | w | **"a pig wins a wet wig"** | |
| 24 | x | **"a fox sits in a box"** | |
| 25 | y | **"a yak licks a yam"** | |
| 26 | z | **"a bug zips up a yak"** | |
| 27 | qu | **"a quick duck quits a quiz"** | qu adds q; u already introduced (w15) |

All 21 weekly sentences for w7–w27 are machine-verified against their
cumulative gate — see checker output below.

## Checker output — weeks 3–6 (machine-verified, 100% decodable)

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

## Checker output — weeks 7–27 + Alphabet Series (machine-verified 2026-07-31)

A fresh Python checker (lowercase, strip punctuation, every letter of every
word must be in that week's cumulative gate; hearts `a`/`an`/`I` whitelisted;
`ck` treated as `c`+`k`, both already available by w13 anyway) verified all
21 new weekly sentences (w7–w27) plus separately confirmed the Alphabet
Series covers all 26 letters. Full run output:

```
=== WEEKLY GATE CHECK (weeks 7-27) ===
w07 [ m] gate={aimnpst} :: "sam naps in a tin" -> PASS
w08 [ d] gate={adimnpst} :: "a sad dad sat in sand" -> PASS
w09 [ g] gate={adgimnpst} :: "a pig digs a pit" -> PASS
w10 [ o] gate={adgimnopst} :: "a dog sits on a pot" -> PASS
w11 [ c] gate={acdgimnopst} :: "a cat tips a pot" -> PASS
w12 [ k] gate={acdgikmnopst} :: "a kid dips a dog" -> PASS
w13 [ck] gate={acdgikmnopst} :: "a pig kicks a sock" -> PASS
w14 [ e] gate={acdegikmnopst} :: "a pig sits on an egg" -> PASS
w15 [ u] gate={acdegikmnopstu} :: "a pup sat in a cup" -> PASS
w16 [ r] gate={acdegikmnoprstu} :: "a rat runs up dad" -> PASS
w17 [ h] gate={acdeghikmnoprstu} :: "a hen sat on a hot pan" -> PASS
w18 [ b] gate={abcdeghikmnoprstu} :: "a bug naps in a bun" -> PASS
w19 [ f] gate={abcdefghikmnoprstu} :: "a fat cat sits on a fan" -> PASS
w20 [ l] gate={abcdefghiklmnoprstu} :: "a dog licks a leg" -> PASS
w21 [ j] gate={abcdefghijklmnoprstu} :: "a pig jogs in jam" -> PASS
w22 [ v] gate={abcdefghijklmnoprstuv} :: "a vet hugs a big pig" -> PASS
w23 [ w] gate={abcdefghijklmnoprstuvw} :: "a pig wins a wet wig" -> PASS
w24 [ x] gate={abcdefghijklmnoprstuvwx} :: "a fox sits in a box" -> PASS
w25 [ y] gate={abcdefghijklmnoprstuvwxy} :: "a yak licks a yam" -> PASS
w26 [ z] gate={abcdefghijklmnoprstuvwxyz} :: "a bug zips up a yak" -> PASS
w27 [qu] gate={abcdefghijklmnopqrstuvwxyz} :: "a quick duck quits a quiz" -> PASS

ALL WEEKLY SENTENCES PASS

=== ALPHABET SERIES COVERAGE CHECK ===
1. "a pig in a wig" -> letters: aginpw
2. "a fox in a box" -> letters: abfinox
3. "a duck licks jam" -> letters: acdijklmsu
4. "a vet hugs a yak" -> letters: aeghkstuvy
5. "a quick rat zips" -> letters: acikpqrstuz
Union of letters used: abcdefghijklmnopqrstuvwxyz
Missing letters: NONE
COVERAGE: PASS - all 26 letters covered
```

All 21 new weekly sentences (w7–w27) pass their cumulative gate. No
substitutions were required.

## Alphabet Series — "The Whole Alphabet"

A separate, short mini-line (not tied to weekly SATPIN gates) that together
covers every one of the 26 letters across just 5 short, funny, illustrated
sentences — a fast, complete alphabet-letter tour that can run alongside or
after the weekly CVC line.

| # | Sentence | Letters contributed |
|---|---|---|
| 1 | **"a pig in a wig"** | a, p, i, g, n, w |
| 2 | **"a fox in a box"** | a, f, o, x, i, n, b |
| 3 | **"a duck licks jam"** | a, d, u, c, k, l, i, s, j, m |
| 4 | **"a vet hugs a yak"** | a, v, e, t, h, u, g, s, y, k |
| 5 | **"a quick rat zips"** | a, q, u, i, c, k, r, t, z, p, s |

**Letter-coverage proof** (union of all letters used across the 5 sentences,
machine-verified above): `a b c d e f g h i j k l m n o p q r s t u v w x y z`
— all 26 letters present, `set(used) == set('abcdefghijklmnopqrstuvwxyz')`
evaluates `True`.

## Midjourney prompt pack

Locked Dark Phonics pen-and-ink house style — used verbatim as the suffix on
every prompt below (per `HANDOFF_DARK_PHONICS_READERS_Jul25.md`):

```
, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes, plain white background. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark.
```

Any liquid (spit, water) is described per the locked rule as "thin ink lines
and droplets with only light blue watercolor accents" — never a solid wash,
and never red (red liquid reads as blood in this style, per the Dark Phonics
handoff's lesson #7), **except** goo/jam scenes, which use amber/red per the
scene-specific direction noted at each prompt below.

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

### Weeks 7–27 (21 new prompts)

#### [CVC-W07|tin] — "sam naps in a tin"

> A boy named Sam curled up fast asleep inside a large open tin can, one arm
> dangling comfortably over the rim, a soft sleepy smile on his face, colored
> hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book
> style, big googly eyes, plain white background. no text, no words, no
> letters, no numbers, no captions, no speech bubbles, no border, no
> watermark. --ar 3:2

#### [CVC-W08|sand] — "a sad dad sat in sand"

> A sad-looking dad sitting cross-legged in a big mounded pile of sand,
> comically huge teardrop welling in one eye, arms crossed grumpily, sand
> heaped around him, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W09|pit] — "a pig digs a pit"

> A chubby pig energetically digging a deep pit with its front hooves, dirt
> flying up in little clumps behind it, only its curly tail and rear end
> visible above the ground, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W10|pot] — "a dog sits on a pot"

> A dog sitting proudly on top of a large upside-down cooking pot like a
> throne, chest puffed out, tail wagging, colored hand-drawn pen-and-ink,
> fine crosshatch, whimsical Dr. Seuss children's-book style, big googly
> eyes, plain white background. no text, no words, no letters, no numbers,
> no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W11|tips] — "a cat tips a pot"

> A mischievous cat pushing a large cooking pot over with one paw, the pot
> caught mid-tip about to topple, cat wearing a pleased, sly grin, colored
> hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book
> style, big googly eyes, plain white background. no text, no words, no
> letters, no numbers, no captions, no speech bubbles, no border, no
> watermark. --ar 3:2

#### [CVC-W12|dips] — "a kid dips a dog"

> A small child dunking a wriggling dog into a big washtub of sudsy water,
> the dog mid-splash with a startled expression, thin ink lines and droplets
> with only light blue watercolor accents for the splash, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W13|sock] — "a pig kicks a sock"

> A pig mid comic karate-kick, one hoof raised high, sending a single sock
> flying through the air, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W14|egg] — "a pig sits on an egg"

> A plump pig perched awkwardly on top of one giant egg, legs splayed wide
> for balance, wobbling slightly, colored hand-drawn pen-and-ink, fine
> crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes,
> plain white background. no text, no words, no letters, no numbers, no
> captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W15|cup] — "a pup sat in a cup"

> A tiny puppy sitting scrunched up snugly inside an oversized teacup, ears
> drooping over the rim, looking cozy and squished, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W16|runs] — "a rat runs up dad"

> A small rat scurrying up a startled dad's leg and torso, dad's arms
> flailing and hair standing on end in surprise, rat mid-climb near his
> shoulder, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr.
> Seuss children's-book style, big googly eyes, plain white background. no
> text, no words, no letters, no numbers, no captions, no speech bubbles, no
> border, no watermark. --ar 3:2

#### [CVC-W17|pan] — "a hen sat on a hot pan"

> A hen sitting on top of a frying pan over a stove flame, feathers puffed
> up and eyes wide, one foot lifted mid-hop from the heat, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W18|bun] — "a bug naps in a bun"

> A round little bug fast asleep tucked snugly inside a split hamburger bun
> like a sleeping bag, a tiny sleepy swirl above its head, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W19|fan] — "a fat cat sits on a fan"

> A round, chubby cat sitting directly on top of a spinning electric fan,
> fur comically blown back and whiskers flapping, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W20|leg] — "a dog licks a leg"

> A dog with its tongue out, enthusiastically licking a person's bare
> leg/shin, the person's face showing ticklish surprise, thin ink lines and
> droplets with only light blue watercolor accents for the lick trail,
> colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss
> children's-book style, big googly eyes, plain white background. no text,
> no words, no letters, no numbers, no captions, no speech bubbles, no
> border, no watermark. --ar 3:2

#### [CVC-W21|jam] — "a pig jogs in jam"

> A pig jogging determinedly through a wide puddle of jam, jam splashes and
> footprints trailing behind it, thin ink lines and droplets with only red
> watercolor accents for the jam splashes, colored hand-drawn pen-and-ink,
> fine crosshatch, whimsical Dr. Seuss children's-book style, big googly
> eyes, plain white background. no text, no words, no letters, no numbers,
> no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W22|vet] — "a vet hugs a big pig"

> A kind vet in a white coat wrapping both arms around an enormous pig in a
> big warm hug, the pig's front hooves lifted off the ground, both looking
> happy, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr.
> Seuss children's-book style, big googly eyes, plain white background. no
> text, no words, no letters, no numbers, no captions, no speech bubbles, no
> border, no watermark. --ar 3:2

#### [CVC-W23|wig] — "a pig wins a wet wig"

> A pig standing on a small winner's podium wearing a dripping-wet curly
> wig, holding up a ribbon trophy with a proud grin, water dripping off the
> wig rendered as thin ink lines and droplets with only light blue
> watercolor accents, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W24|box] — "a fox sits in a box"

> A fox curled up neatly inside a small cardboard box, ears poking over the
> edges, tail wrapped around itself, content expression, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W25|yam] — "a yak licks a yam"

> A shaggy yak with its huge tongue out, licking a giant yam held between
> its front hooves, eyes crossed in concentration, colored hand-drawn
> pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style,
> big googly eyes, plain white background. no text, no words, no letters, no
> numbers, no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [CVC-W26|zips] — "a bug zips up a yak"

> A tiny bug zooming rapidly up the back of a tall shaggy yak, comic speed
> lines trailing behind the bug, the yak glancing back over its shoulder in
> surprise, colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr.
> Seuss children's-book style, big googly eyes, plain white background. no
> text, no words, no letters, no numbers, no captions, no speech bubbles, no
> border, no watermark. --ar 3:2

#### [CVC-W27|quiz] — "a quick duck quits a quiz"

> A duck mid-sprint away from a small school desk with a quiz paper and
> pencil left behind flying in its wake, feathers ruffled, comic motion
> lines showing speed, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

### Alphabet Series (5 new prompts)

Scene directions per Tredoux: 1 plump pig wearing an enormous curly powdered
wig; 2 sly fox sitting snug inside a cardboard box; 3 duck licking a big
glob of red jam off its own bill; 4 kind vet in a white coat hugging a huge
shaggy yak; 5 rat sprinting at top speed with motion lines and puffed
cheeks.

#### [ABC-1|wig] — "a pig in a wig"

> A plump pig wearing an enormous curly powdered wig, strutting proudly with
> its snout in the air, colored hand-drawn pen-and-ink, fine crosshatch,
> whimsical Dr. Seuss children's-book style, big googly eyes, plain white
> background. no text, no words, no letters, no numbers, no captions, no
> speech bubbles, no border, no watermark. --ar 3:2

#### [ABC-2|box] — "a fox in a box"

> A sly fox sitting snug inside a cardboard box, peeking over the edge with
> a sneaky grin, colored hand-drawn pen-and-ink, fine crosshatch, whimsical
> Dr. Seuss children's-book style, big googly eyes, plain white background.
> no text, no words, no letters, no numbers, no captions, no speech bubbles,
> no border, no watermark. --ar 3:2

#### [ABC-3|jam] — "a duck licks jam"

> A duck licking a big glob of jam off its own bill, tongue out mid-lick,
> thin ink lines and droplets with only red watercolor accents for the jam,
> colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss
> children's-book style, big googly eyes, plain white background. no text,
> no words, no letters, no numbers, no captions, no speech bubbles, no
> border, no watermark. --ar 3:2

#### [ABC-4|yak] — "a vet hugs a yak"

> A kind vet in a white coat hugging a huge shaggy yak, both arms wrapped
> around its neck, warm smile on both faces, colored hand-drawn pen-and-ink,
> fine crosshatch, whimsical Dr. Seuss children's-book style, big googly
> eyes, plain white background. no text, no words, no letters, no numbers,
> no captions, no speech bubbles, no border, no watermark. --ar 3:2

#### [ABC-5|zips] — "a quick rat zips"

> A rat sprinting at top speed, comic motion lines trailing behind it and
> cheeks puffed out from the effort, colored hand-drawn pen-and-ink, fine
> crosshatch, whimsical Dr. Seuss children's-book style, big googly eyes,
> plain white background. no text, no words, no letters, no numbers, no
> captions, no speech bubbles, no border, no watermark. --ar 3:2

## Next session

Once Tredoux has generated and picked the art for these scenes:

1. **Lock a character reference** for "Pat" the boy (and optionally the ant,
   Sam, and the other recurring animals now appearing across weeks 7–27 and
   the Alphabet Series) the same way Sam/Cat/Dog etc. were locked for the
   weeks 7–27 readers, if this cast is going to recur across future
   CVC-sentence weeks.
2. **Build the sheet template** per week: READ IT (the sentence set solid, for
   reading) + TRACE IT (the same sentence in dotted/arrow trace font, via the
   existing `stroke_font` tracing convention used elsewhere in the SATPIN
   print materials) + picture-match cut-outs (the picture above, plus 1–2
   decoy pictures, for the child to match to the sentence they just read).
3. **File art at** `phonics-images/satpin-v2/cvc/<week>/` — e.g.
   `phonics-images/satpin-v2/cvc/week-04/` … `.../week-27/`, plus
   `phonics-images/satpin-v2/cvc/alphabet-series/<n>/` for the 5 Alphabet
   Series images — one folder per week/entry, mirroring the existing
   `phonics-images/satpin-v2/books/<object>/` convention used by the Dark
   Phonics readers.
4. Wire the finished sheet PDF into `app/montree/library/satpin/page.tsx`
   once built — likely as a new row alongside `PaperworkRow`/`ReaderRow`
   rather than reusing either directly, since this is a new material type
   (trace + read + match), not a worksheet pack or a reader.
5. The full 27-week CVC sentence set (w3–w27) and the 5-sentence Alphabet
   Series are now both fully approved and machine-verified as of 2026-07-31
   — no further sentence work is needed; remaining work is art + layout.
