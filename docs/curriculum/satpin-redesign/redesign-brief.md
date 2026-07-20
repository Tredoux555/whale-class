# Dark Phonics SATPIN Readers — Redesign Brief (v2, "from the top")

You are designing the first six weeks of decodable readers for Dark Phonics, a phonics
program whose songs are wildly popular with young children because they are dramatic,
funny, chantable, and slightly gross. Version 1 of these readers FAILED and was rejected
by the author. You are starting over.

## Why v1 failed (read this carefully — do not repeat it)

V1 was a word list wearing a costume: "Tap." → picture of a faucet with googly eyes.
"Sap." → picture of sap on bark. Isolated objects, no story, no character, no tension,
no payoff, no reason to turn the page. The author's verdict: "there's no 'ah' moment —
it's more like an aaaah? moment." Pedagogically correct, emotionally dead.

## The core insight v1 missed

ONLY THE TEXT must be decodable. THE PICTURES DON'T.
The established cast can act out a real story with drama and jokes entirely in the art,
while the printed words stay within the few letters the child can read. The art carries
the narrative; the text is the child's victory lap. When the child decodes "Sat." the
picture must be the punchline — Ant has SAT somewhere catastrophic. Reading the word =
getting the joke. That is the "ah" moment.

## The brand voice (this is the register — study the reference files)

Dark Phonics catchphrases: "snake in my sock!", "pop, pop, puppy poop!", "tick-tock,
stinky sock!", "icky, sticky pig!", "goat got my gum!". Punchy, chantable, rule-of-three,
mildly gross, big feelings. Every reader ends with the house ritual: a suspense page
("Is it a...?!") and the class shouts "POTATO!" — the potato gag is sacred.

## Established cast (locked visual identities — use them)

- **Segina** — small wooden peg-doll girl, painted black pigtails, red dress. The heroine.
- **Sam** — small wooden peg-doll boy, painted brown hair, blue dungarees.
- **Cat** — a tabby cat. Expressive, dramatic.
- **Ant** — small shiny black ant, big googly eyes, proud upright posture. A born comedian.
Characters may APPEAR in art in any week regardless of whether their name is decodable.
Names may only appear in TEXT when decodable (Ant: week 6. Sam: not until m. Segina/Cat: much later)
— except in a readAloud-exempt book (see constraints).

## Hard constraints (violating these = automatic rejection)

1. Week order: 1=s, 2=a, 3=t, 4=p, 5=i, 6=n. Cumulative letter pool.
2. Weeks 1–2 cannot support decodable words. Propose what these weeks GET instead —
   e.g. a read-aloud "sound hunt" book where the child's job is spotting/roaring the
   target sound (existing art: snake, sun, sock, star, soap, seal, saw, sandwich for s).
   Make it feel like part of the same series, not a gap.
3. Week 3 (s,a,t): decodable words are only: at, sat, tat, "a". A readAloud-exempt book
   ("Where Is Segina?") already exists for this slot — you may keep it, improve it, or
   propose a hybrid (readAloud narration + one decodable word the child reads on every
   page, e.g. "at" or "sat" as the child's line). The hybrid is likely the first real
   "I read that!" moment — treat it as precious.
4. Week 4 (s,a,t,p) legal words include: at, sat, pat, tap, taps, sap, spat, past, pats, a.
5. Week 5 (+i): adds it, is, sit, sits, sip, sips, tip, tips, pit, spit, pip, pat/tap family.
6. Week 6 (+n): adds an, ant, ants, in, nap, naps, pan, pans, tin, tins, pin, pins, tan,
   nip, snap, snip, pant, pants, "I" (glue word introduced here).
   VERIFY EVERY WORD LETTER BY LETTER against the cumulative pool. No exceptions ("the",
   "and", "on", "no", "am", "mat", "cat" are all ILLEGAL in weeks 1–6).
7. Reader length: 7–9 pages. 1–6 words per page. Repetition with escalation is a feature.
8. Every reader ends with the potato-gag ritual page.
9. Art style is LOCKED (do not restyle): colored hand-drawn pen-and-ink, fine crosshatch,
   whimsical Dr. Seuss children's-book style, big googly eyes, plain white background.
   No text/words/letters/numbers/captions/speech bubbles/border/watermark in the image.
   Liquids drawn as thin ink lines and droplets with watercolor accents.

## The "ah moment" checklist (every page of every reader must pass)

- Does the text SET UP and the art PAY OFF? (text is the setup, picture is the punchline)
- Is there a reason to turn the page? (escalation, suspense, rule of three)
- Would a 4-year-old laugh, gasp, or shout?
- Does the child's hardest decode land on the biggest laugh?
- Is a cast member driving the action (not an inanimate object with eyes)?

## Deliverables (write to the output file specified in your task)

For EACH of weeks 1–6:
1. Title + format (soundHunt / readAloud / hybrid / decodable).
2. One-line premise (the story/joke engine).
3. Page-by-page table: page #, TEXT (exact printed words), SCENE (what happens),
   THE JOKE (why the child reacts), ART DIRECTION (composition, character, emotion).
4. For every page needing NEW art: a complete Midjourney prompt = scene description
   using the locked character descriptions + the locked style suffix verbatim:
   ", colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss
   children's-book style, big googly eyes, plain white background. no text, no words,
   no letters, no numbers, no captions, no speech bubbles, no border, no watermark."
   Also state a character-consistency strategy (e.g. generate one canonical Ant
   character sheet first, then use Midjourney omni-reference/--cref for every
   subsequent Ant page so he looks identical across the book).
5. Flag any page that can REUSE existing hosted art (see week JSONs' imageUrls).
6. Decodable-word flashcard list per week (only words actually appearing in the reader).

## Reference files (read them)

- /mnt/user-data/uploads/montree/lib/montree/english-curriculum/spec/dark-phonics.json — catchphrase/voice bible
- /mnt/user-data/uploads/montree/public/whale-reading-content.html — existing SATPIN reader trove (mine for reusable bones)
- /mnt/user-data/uploads/montree/lib/montree/english-curriculum/spec/week-02.json — "Where Is Segina?" (house book style, readAloud)
- /mnt/user-data/uploads/montree/lib/montree/english-curriculum/spec/week-01.json, week-05.json, week-06.json, week-07.json, week-08.json — existing a/s/n/p/i weeks (art inventories in imageUrls, threePartCards vocab)
- /mnt/user-data/uploads/montree/lib/montree/english-curriculum/spec/types.ts — WeekSpec schema (spreads format the final content must eventually fit)
- /tmp/montree-satpin-realignment-plan.md — the approved realignment plan context
