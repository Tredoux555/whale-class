# Backup object cards — the four missing photographs

**2026-09-05.** `11-backup-object-cards.pdf` prints a card for every miniature
the Writing Shelf asks for. Twenty-one of the twenty-six pieces have a
photograph already; **five do not**, because four objects were never shot:

| Word | Pieces | Wanted by |
|---|---|---|
| `sun` | **2** | Tray 1 basket · Tray 2 Set B |
| `pot` | 1 | Tray 2 Set A |
| `pan` | 1 | Tray 2 Set A |
| `tin` | 1 | Tray 2 Set A |

Until they land, those slots print as amber dashed outlines with the word on
them and no cut ticks.

## The house string

Same string as every other photo in `phonics-images/satpin-v2/cvc-photos/`:
single real object, pure white seamless background, studio light, nothing else
in frame, **square**. The only thing that changes between prompts is the noun
phrase — and where a word is ambiguous, the disambiguator goes **inside** the
noun phrase, as adjectives, never as a trailing instruction (Midjourney drifts
on species and material otherwise).

## Run them

Four prompts. Run each **three times** and pick the cleanest of the twelve
tiles per word. Save the winner as `<word>.png` in
`phonics-images/satpin-v2/cvc-photos/` (that folder is gitignored and lives
only on the Mac), then rerun:

```
python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
```

The slot fills itself, the amber dashes become a card, and the footer count on
sheet 2 updates. Nothing else needs editing.

---

### sun

There is no real-world "sun" you can put on a shelf, so the object is the one
the shopping list already names: a small wooden sun. Say *wooden* and *carved
triangular rays* or Midjourney hands back a sunset, a sunflower or a lens
flare.

```
ultra-realistic professional studio photograph of a single small round wooden toy sun with a smooth face and carved triangular rays around its edge, warm natural wood, centered, soft even studio lighting, plain pure white seamless background, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 1:1
```

### pot

A **cooking** pot, and it has to be unmistakably not the pan below: deep, two
small side handles, a lid. Say *not a flower pot* by describing the metal —
"stainless steel cooking pot" never renders as terracotta.

```
ultra-realistic professional studio photograph of a single deep stainless steel cooking pot with two small side handles and a fitted lid, standing upright, centered, soft even studio lighting, plain pure white seamless background, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 1:1
```

### pan

A **frying** pan, shot from a raised three-quarter angle so the shallow round
base and the one long handle both read at 46 mm. A flat overhead shot of a pan
is a circle, and a circle at card size is a pot.

```
ultra-realistic professional studio photograph of a single shallow round black frying pan with one long straight handle, seen from a raised three-quarter angle so the flat base and the handle both show, centered, soft even studio lighting, plain pure white seamless background, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 1:1
```

### tin

A plain sealed food can, **unlabelled** — a label would put words on a card,
which this sheet does not do. Say *plain unlabelled bare metal* twice over; the
house negative list alone does not stop Midjourney printing a label.

```
ultra-realistic professional studio photograph of a single plain unlabelled sealed cylindrical metal food tin can, bare silver metal with a rolled rim and no label and no printing of any kind, standing upright, centered, soft even studio lighting, plain pure white seamless background, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 1:1
```

---

**After the photographs land**, the same four words also unblock the
`#miniatures` table's "No photo card" notes on
`public/dark-phonics-shelves.html` — that column is about Tray 4's dictation
deck, not this sheet, so it stays as it is unless the dictation deck is
reissued.
