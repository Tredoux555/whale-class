---
description: Build printable Montessori materials as PDFs for a letter, pattern or word list
argument-hint: <letter or words> [materials...]  e.g. "s" · "sh three-part cards" · "cat,hat,mat"
---

Build printable Montessori materials for: **$ARGUMENTS**

Use the `montessori-materials` skill. Work out from the request above:

- the **letter/pattern** (`--letter s`), the **week** (`--week 5`), or an explicit
  **word list** (`--words cat,hat,mat`)
- which **materials** were asked for (`--materials three_part_cards,sentence_strips`).
  If none were named, build the default five.

Then run `node scripts/curriculum/make-material.mjs` with those flags.

If the request names no letter, pattern, week or word list at all, run
`node scripts/curriculum/make-material.mjs --list` and ask which letter to build
rather than guessing.

When it finishes, tell me where the PDFs landed and name any pictures that came
out as placeholders.
