# Wave 1 Handoff — Montree Milestones Art Replacement

Date: 2026-08-04. Audience: Tredoux, and/or the next Claude session picking this up. This supersedes/extends `docs/evaluation/ART_REPLACEMENT_HANDOFF.md` with what actually happened in wave 1 — read that doc first for the pipeline architecture, this doc for wave 1's specific outcome and the infrastructure gaps that got fixed along the way.

## TL;DR

14 of 117 picture/scene stimuli now have Midjourney-generated raster art, live on both the web/tablet app and in print. `bankVersion` is `1.2.0`. Two pieces of previously-missing build tooling (the D2 tablet-embed builder, and the entire D3 paper-pack generator) were reconstructed from scratch and are now real, working, version-controlled scripts — future waves should be much faster since this infrastructure now exists.

Two commits, both pushed to `main` (`git@github.com:Tredoux555/whale-class.git`, legacy repo name — deploys to `montree.xyz` via Railway):
- `60dba700` — item bank + D2 tablet embed
- `e988294f` — paper pack generator + regenerated PDFs

## What shipped in wave 1

**Accepted (14):** ST.ant, ST.apple, ST.bag, ST.ball, ST.banana, ST.bed, ST.book, ST.bookclosed, ST.box, ST.bread, ST.cake, ST.cap, ST.chair, ST.cloud — each has a new `render.raster` field (base64 webp, ≤512×512, q80) alongside its untouched `render.svg`.

**Rejected in QC (5), still SVG-only, need regeneration:**
- ST.bird — off-style: rendered in a detailed gradient/thin-outline technique, broke from the flat-outlined set.
- ST.bun — weak subject identity: reads as an ambiguous glossy orange blob, no bread texture/seams.
- ST.bus, ST.car — off-style: flat-vector rendering (thin olive outline, no shading), a different pass entirely.
- ST.cat — off-style: painterly/gradient technique, inconsistent outline weight.

Pattern worth knowing: all 4 style-rejects landed in the same second batch, suggesting the Midjourney `--sref` style anchor dropped or got unpinned partway through that run. Worth re-checking the anchor is attached before the next batch.

**Never generated:** ST.bell — queued but skipped during generation, still pending.

**Not touched:** 98 remaining picture/scene stimuli, and all 124 letter/word/numeral/shape/quantity stimuli (permanently vector, out of scope per the original handoff).

## Digital pipeline (commit `60dba700`)

- `bankVersion` bumped `1.1.0` → `1.2.0` across all 5 authored files in `evaluation-kit/item-bank/`.
- `validate.mjs` passes clean.
- Merge required an explicit `--src evaluation-kit/item-bank` flag — `merge-item-bank.mjs`'s own `CANDIDATE_SRC` auto-discovery doesn't match this checkout's layout. Worth fixing in the script itself at some point so future runs don't need to remember this.
- New canonical `bankChecksum`: `e5d217c5d2ffc161cac93f6254903e5e2a33c6f443d93269312b36f34db16c19`. `BANK_CHECKSUM.txt` was already stale/wrong *before* this wave touched anything (pre-existing drift) — now correct as a side effect.
- **D2 tablet embed — infrastructure gap found and fixed.** The builder that inlines the bank into `D2_montree_milestones_app.html` didn't exist anywhere (no `app.template.html`, no inlining script, despite docs describing one). Reconstructed by extracting the template directly from the old built HTML's own embedded JSON (verified byte-identical round-trip against the original before trusting it), and fixing two bugs in the surviving `gen-d2-projection.mjs`: it didn't forward the new `render.raster` field, and its hardcoded canonical-bank path was wrong for this checkout. New file `evaluation-kit/build-d2.mjs` runs the whole thing standalone — future waves just run `node build-d2.mjs`, no reconstruction needed. New D2 size: 1,132,568 bytes (was 979,854), nowhere near the 2MB ceiling.

## Paper pipeline (commit `e988294f`)

**The entire paper-pack generator (`lib-bank.mjs`, `build-paper-packs.mjs`, `render.mjs`) was missing** — only the 6 `D3_paper_pack_*.pdf` + `D3_scoring_sheets_only.pdf` outputs survived, no scripts, no git history, no template. Reconstructed from scratch by reverse-engineering the surviving PDFs (text extraction, page geometry, section structure, `paper`/`timing`/`crosswalk`/`ageBand`/`formCode` field mapping in the item bank) rather than guessing.

**Important scope note:** this wave's raster art changes did *not* actually require any paper-pack content change — paper mode always uses `render.svg` (vector, print-safe), never `render.raster`, and none of the 14 accepted stimuli's SVGs were touched. The only thing that was actually stale was the printed version stamp. The full rebuild was done anyway per Tredoux's request, both to fix the stamp and to restore the missing tooling for future waves that *will* need it.

**Honest fidelity caveat:** this is a reconstruction, not a recovery of the original. Content (item text, prompts, IDs, scoring tables, section structure, ordering) was verified to match the original PDFs field-for-field. Exact typography/spacing/page-break placement could not be recovered (no source to check against) and is a close approximation — page counts differ slightly (93/92/93 vs original 96/95/96 per pack; 79 vs 91 for the scoring-only set) because CSS paginated the reconstructed layout naturally rather than matching the lost original's exact breaks. Fonts (Lora, Work Sans, Andika, DejaVu Sans Mono) and a plausible accent green were already available system-wide, no substitution needed there.

**Verification performed:** child-page counts matched the original exactly per pack (55/55/54/54/55/55). Version stamp confirmed as `1.2.0` / `sha256:e5d217c5...` on every cover and footer (re-verified independently after an initial false alarm — see below). Form A vs Form B content differences confirmed correct (different prompts/stimuli, same structure). A5 colour-notice block present where expected. Visual spot-checks of cover, teacher script, child page, and record sheet pages all rendered cleanly with no clipping/overflow/distortion.

**A note on process:** the first write-back looked stale when I independently re-checked it (showed the old `1.1.0` stamp). Traced it to a caching bug in my own file-staging tool, not the actual files on disk — the real files were correct the whole time. Re-verified directly against the Mac (bypassing the cache) before trusting it. Flagging this so a future session doesn't get fooled by the same caching quirk when spot-checking files right after a write-back.

## New permanent rule

`CLAUDE.md` rule #6, added and committed in `60dba700`: Claude no longer needs per-instance approval to `git commit`/`git push` in this repo — audit (`git status`/`git diff`, scoped file staging by name, never `git add -A`) then commit+push automatically if clean; stop and ask only if the audit finds something unexpected. Authorized by Tredoux in chat on 2026-08-04, after being explicitly told this removes the separate pre-deploy approval gate that existed for this task. Does not change the SQL rule (#4) — SQL still always goes to Tredoux in chat, never executed directly.

## What's next

1. Re-check the Midjourney `--sref` style anchor is still attached, then regenerate: ST.bell (never generated), ST.bird, ST.bun, ST.bus, ST.car, ST.cat (rejected).
2. Continue waves through the remaining ~98 picture/scene stimuli.
3. Optional cleanup: fix `merge-item-bank.mjs`'s `CANDIDATE_SRC` auto-discovery so the `--src` flag isn't needed every time.
4. Optional: since paper-pack CSS/typography is a from-scratch approximation, worth a manual eyeball pass against the old PDFs (if Tredoux has them printed/saved anywhere) to see if anything should be tightened before these go to a real classroom.
