# Tracing workbook fix — all 16 sat-cast books rebuilt (2026-09-02)

## What was wrong

All 16 sat-cast Dark Phonics `tracing-workbook.pdf` files being served from
`public/dark-phonics-materials/<slug>/tracing-workbook.pdf` (and mirrored in
the Supabase `static-assets` bucket) were **stale artifacts from an older
version of the tracing builder** — one that traced the full narration
sentence on every spread, not just the hero word. The current, canonical
builder (`build_tracing_booklet.py`, `mode='word'`) has traced ONLY the
hero word (the last word of the book's title sentence — e.g. "sat", "spat",
"pit", "dog") for some time, with narration lines ("The ant...", "The
snake sat in the...") rendered small and in italic, untraced. The 16
on-disk/on-bucket PDFs simply hadn't been regenerated against that current
builder, so live readers were getting the old sentence-tracing layout.

## Root cause

Stale build output — not a bug in `build_tracing_booklet.py` or
`_patched_trace.py` themselves. The pipeline is correct and deterministic;
it just hadn't been re-run for these 16 slugs since the mode='word' /
hero-word-only standard was locked in.

## The 16 slugs

the-sat, the-spat, the-pit, the-pat, the-nap, the-mat, the-sad, the-dig,
the-dog, the-cot, the-kit, the-egg, the-mud, the-rat, the-hot, the-bug

## What was done

1. **Rebuild** — `scripts/curriculum/flashcards/_patched_trace.py <slug...>`
   (wraps `build_tracing_booklet.build_trace_booklet(book, dest_dir,
   mode='word', celebrate=False)` from `build_tracing_booklet.py`, using
   `books_def.py` as the book source) rebuilt all 16
   `public/dark-phonics-materials/<slug>/tracing-workbook.pdf` files.

2. **Independent audit** — every rebuilt PDF was rendered page-by-page
   (`pdftoppm`) into a per-book contact sheet (`montage`) and visually
   reviewed. Confirmed for all 16: only the hero word is traced (dotted
   skeleton + stroke-order arrows), narration text is small italic and
   never traced, cover/word-list/celebration pages are intact, and page
   counts are consistent (12 pages standard; the-spat is 10 pages because
   its cast has fewer characters). Zero anomalies found.

3. **Publish** — uploaded all 16 rebuilt PDFs to the Supabase `static-assets`
   bucket via:
   ```
   node scripts/curriculum/publish-static-materials.mjs \
     public/dark-phonics-materials/<slug>/tracing-workbook.pdf
   ```
   (See `scripts/curriculum/publish-static-materials.mjs`'s header comment
   for the bucket-path-mapping contract: `public/<rest>` → bucket key
   `<rest>`, served live at `https://montree.xyz/<rest>`.)

   **Gotcha hit this run:** large PDFs (10-20MB) sometimes hung
   indefinitely mid-upload when several files were queued in one process
   call (observed both via the on-device shell and via Desktop Commander).
   Uploading **one file per invocation** was reliable every time (a single
   file upload never hung, just took anywhere from ~9s to ~2m45s depending
   on network conditions). If a multi-file batch hangs, kill it and retry
   the stuck file alone — the script is idempotent (`upsert:true`), so
   re-running never duplicates or corrupts anything.

4. **Verify** — downloaded each of the 16 live URLs
   (`https://montree.xyz/dark-phonics-materials/<slug>/tracing-workbook.pdf`)
   and MD5-compared against the local rebuilt file. **All 16/16 matched.**

5. **Cache bust** — `STORYBOOK_PRINT_VERSION` in
   `app/montree/library/dark-phonics/page.tsx` was already at 25 (from an
   unrelated same-day Work-3 change) rather than 24, so it was bumped to
   **26** with a dated comment, per the standing rule below.

## The rule (follow this every time tracing workbooks are rebuilt)

After any tracing-workbook rebuild for one or more sat-cast slugs:

1. Rebuild via `_patched_trace.py` (mode='word', celebrate=False) — this
   is the only canonical path; never hand-edit a PDF.
2. Publish via `publish-static-materials.mjs`, **one file per invocation**
   to avoid the multi-file upload hang described above.
3. MD5-verify each live URL against the local file before declaring done.
4. Bump `STORYBOOK_PRINT_VERSION` in
   `app/montree/library/dark-phonics/page.tsx` (check the CURRENT value
   first — it may already have been bumped by an unrelated same-day change;
   always bump by one from whatever it currently is, never assume it's at
   the last-known number) — the media proxy's Cloudflare edge cache holds
   PDFs for up to 7 days, and only a `?v=` bump reliably busts it site-wide.
5. Commit + push (via Desktop Commander only — see the repo's permanent
   git rule) and confirm the Railway deploy succeeds before considering
   the fix live.
