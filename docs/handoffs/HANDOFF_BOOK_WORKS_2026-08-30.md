# HANDOFF — Book Works Online Lessons (2026-08-30)

## State
- 21 online lessons LIVE in book-works: displays 1-14, 19-21 (letters s a t p i n m d g o c k e ck f l j). Display = raw n − 4.
- Live surfaces: teacher live stage (📖 Book button; needs migration 343 run in Supabase — STILL PENDING), public parent-led /parents (teacherpotato tab 👪 Parents), portal /montree/parent/lessons, no-auth preview /montree/dev/lesson1-preview.
- Blueprint artifact (status board + formula + pipeline): https://claude.ai/code/artifact/0d0adde8-cb34-442b-83d2-51c36114bc4a

## The locked formula (every lesson)
Video → Book read-along → Trace the letter → Physical opener → Match → Find the picture → Yes/No → the book's ending.
LAWS: silent by default (voice toggle teacher-only, absent in solo); NO rewards/stars/scores ever; every child-facing line VERBATIM from a governing source or absent; tablet-first; yes/no Y-N-Y-N-N-Y (Y-N-N-Y for 4-question books), unguessable; endings close on resolution/potato gag.

## Source-of-truth contract (hard-won, do not re-derive)
- Lessons 2-10: books_def.py page text + dp-<slug>.json (cast/yesno/matchDisplayOrder).
- Lessons 11-18: same.
- the-fast / the-lost / the-jump (19-21): build_a5_readers.py SPLITS **LOCKED TEXT RULE 2026-08-22 GOVERNS** — dp-json for these carries superseded phrasing ("lost and sad" is retired). Applies to the remaining n≥26 books too: check SPLITS first.
- the-cat-sat (13): dp-json pages[] is the only source. 5-card cast; false questions use imageWord → picture-bank photos.
- Deliberate 4-of-6 casts: a book's art dir with "missing" cast pages may be COMPLETE (ARTWORK-HANDOFF lists "NOT built for this book"). Check before generating art.
- matchDisplayOrder must be a derangement — generator asserts; the-lost/the-jump needed minimal repairs.
- Regenerate lib/montree/dark-phonics/book-works-lessons.ts (export BOOK_WORKS_GENERATED_LESSONS) — never hand-edit.
- Art serves from public/dark-phonics-live/pages/<slug>/ (sips -Z 700, <700KB; keep .jpg as .jpg). public/dark-phonics-books/ is gitignored/bucket-rewritten — never file lesson art there.

## NEXT MISSION — book by book, one at a time. Each image is CURATED BY TREDOUX.
Order (series order, so yes/no can borrow the next cast): **the-vest (v, 22) → the-swim (w, 23) → the-yam (y, 25) → the-zip (z, 26) → the-quilt (qu, 27)**. Fox in a Box (x, 24) decision open: wire as book-works from existing art, or stays reader-only.
Per book loop:
1. MJ prompts from _dark-phonics-book-run/ARTWORK-HANDOFF.md — strip "Caption:" clauses (style law: no rendered text), append house style + cast description + --ar 1:1. Claude may submit via Chrome; TREDOUX PICKS FINALS and saves to Downloads.
2. File picks → phonics-images/dark-phonics-books/<slug>/pN-<key>.png (filenames load-bearing).
3. Wire the lesson (generator + sips + verify: tsc, eslint, verbatim audit, paths-resolve, allowlist ['matched','drop','trace'] and voice gating untouched) → fresh-eyes audit → commit → deploy.
4. Only then start the next book.
MJ session state: the-vest p1-vest submitted; 4 spare top-up generations for the-lost/the-jump exist in MJ history — IGNORE (those pages are deliberately absent from the books).

## Also pending
- Migration 343 (Supabase SQL) — unlocks 📖 Book on the live teacher stage.
- Print pipeline for new books (books_def.py entry, lessons.ts books[], booklets/works/publish) not yet run for 13/19/20/21 — online lessons only so far.
