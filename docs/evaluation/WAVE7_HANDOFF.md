# Wave 7 Handoff — Montree Milestones Art Replacement

Date: 2026-08-05. Audience: Tredoux, and/or the next Claude session picking this up. This supersedes/extends `docs/evaluation/ART_REPLACEMENT_HANDOFF.md` (pipeline architecture) and the wave 1–6 handoffs (per-wave history) — read those first for background, this doc for where things stand after wave 7 plus this session's follow-up fix.

## TL;DR

Art replacement waves 2–7 are complete. 100 of 117 in-scope picture/scene stimuli now have `render.raster` (webp, ≤512×512, q80, base64) at bank `1.8.1`. This session additionally replaced ST.hand's vector art after a contact-sheet reviewer flagged it as an inappropriate gesture — confirmed, fixed, bank bumped `1.8.0` → `1.8.1`. 17 stimuli remain without raster; see "What's left" below.

Commit history for the art-replacement effort:
- `4a494132` — wave 2
- `88dbb7c0` — live-app raster parity (`bank-projection.ts` + `StimulusSvg.tsx`)
- `38bf6212` — wave 3
- `624c48e6` — wave 4
- `18293a44` — wave 5
- `e9fa03bc` — wave 6 + pagescribble q80 repair
- `2e25bf9d` — wave 7 (15 MJ singles + 16 composited scenes + repaired hand raster)
- this session — `1.8.1` hand-SVG fix (ST.hand vector replaced; digital + paper pipelines rebuilt)

## What's left (17 stimuli, no raster)

**5 awaiting Midjourney re-rolls (style anchor slipped):** sun, at_light, sc_drink, sc_eat, sq_outside. The `--sref` style anchor repeatedly drops in long MJ sessions — re-attach it before the next batch. Fallback reference URL if the anchor chip needs re-grabbing: `https://cdn.midjourney.com/6b697ee7-4947-4cd6-9e90-f5defc573c0d/0_3.jpeg`.

**10 size-set stimuli, blocked on a design decision:** at_ball_mid/small, at_rod_long/mid/short, at_pencil_long/short, at_tree_tall/mid/short. Two competing designs:
- **Isolated-card** (current item design; director recommends) — each size shown alone on its own card.
- **All-three-plus-arrow** (Tredoux's proposal) — all three sizes shown together with a size-ordering arrow. This breaks option-card discrimination for the size-set items, and breaks two single-object items that assume one object per card: `IT.ATL-X.A3.A.03` and `IT.E1.A5.A.03`.

  Decision pack (`size_set_decision.png`) was delivered in chat for Tredoux to review before either design is executed.

**2 permanent vector skips:** col.blue, col.red — colour-identity stimuli, stay SVG by design, not in scope for raster replacement.

## Compositing pipeline (proven, wave 7)

16 scene/group stimuli were built by cutting out already-accepted single-object art (flood-fill mask + colour decontamination + feather) and composing them to hit exact object counts and occlusion-based spatial relations. Counts and spatial relations were verified against each item's scoring key. Base assets for future composites (open box, table, pencil) live in `<repo>/_assets_incoming/`; a red rod can be drawn programmatically rather than sourced (see the size-set decision pack for the reference approach). This pipeline works and is reusable for any future scene/group stimuli.

## This session: ST.hand SVG fix (bank 1.8.1)

A contact-sheet worker flagged that ST.hand's `render.svg` (the vector fallback — also what paper packs print, since paper mode never uses `render.raster`) depicted a raised middle finger: a closed fist/palm shape with a single finger extended, everything else curled. Rendered and visually confirmed before touching anything — it was exactly that, not a false alarm.

ST.hand is referenced by 3 option/distractor slots across 2 items in `items-efl.json`: `IT.E1.A3.A.06` (distractor) and `IT.E1.A3.B.06` (correct target, "Hand. Tap the hand."). `IT.E1.A3.B.06` prints on page 59 of `D3_paper_pack_A3_formB.pdf` — rasterized and visually confirmed the new art after rebuild.

Replaced with a flat open palm, palm forward, five spread fingers (four fingers + thumb, each a rounded capsule), ending at the wrist — matching ST.foot/ST.leg's conventions exactly: `viewBox="0 0 100 100"`, fill `#e9a13b`, stroke `#12100e` width 3, round linecap/linejoin. Other stimulus record fields (`svgSymbolId`, `viewBox`, `printMinMm`, `monochromeSafe`, `altText`, `tags`) were left untouched — `altText.en` is `"a hand"`, still accurate for the new art. Verified rendering at 512px and at 60px (print-min) — reads instantly as an open hand with five countable fingers, no gesture ambiguity, at both sizes.

Standard mini-pipeline run: `bankVersion` bumped `1.8.0` → `1.8.1` in all 5 authored files, `validate.mjs` clean (PASS, no warnings beyond the pre-existing 3 informational ones), `merge-item-bank.mjs --src evaluation-kit/item-bank` re-run, `BANK_CHECKSUM.txt` updated to `1.8.1 sha256:9c3c5bb139a13dbafa8f01201b20b58ccbdfc007d7b032536a67451a2402cf1b`, `build-d2.mjs` re-run, all 7 paper PDFs rebuilt via `buildAll()`/`renderAll()` called programmatically (the CLI main-guard fails on this checkout's path, which has spaces). All 7 PDFs re-stamped `1.8.1` / the new checksum, confirmed via `pdftotext`. Exactly the 15 standard task files changed; committed and pushed separately from this handoff commit.

## Operational gotchas for the next session

- **D2 size ceiling is now soft.** Tredoux confirmed the 2MB ceiling is a soft target, not a hard limit — `D2_montree_milestones_app.html` is currently ~2.14MB with q80 everywhere and no quality fallback. Don't block on this; just don't let it balloon without reason.
- **Device staging cache serves stale `stimuli.json`.** Don't stage the full file to inspect it — filter the record(s) you need down to a small derived file with a fresh filename first, then stage that.
- **Paper build scripts' CLI main-guard fails on paths with spaces.** This checkout lives under `.../ACTIVE/montree` with no spaces, but if that ever changes (or you're driving from a different checkout), call `buildAll()`/`renderAll()` programmatically from a small driver script rather than via `node build-paper-packs.mjs` / `node render.mjs` directly.
- **`pdf-lib` and `playwright` are not in `package.json`.** They were installed `--no-save --no-package-lock` back in wave 7 and are still present in `node_modules`, but a clean checkout/`npm ci` will not have them — reinstall the same way if they're missing.
- **`evaluation-kit/item-bank/gen/` is a landmine, not a tool.** It's a stale generator (bank `1.1.0`) whose `build.mjs` unconditionally overwrites the five authored files and `BANK_CHECKSUM.txt` with old content if run. Never run anything in that directory. See `evaluation-kit/item-bank/gen/DO_NOT_RUN.md` (added this session) for the one-paragraph version — the real merge tool is always `scripts/evaluation/merge-item-bank.mjs --src evaluation-kit/item-bank` (supports `--check`).
- **ST.hand's original SVG was an offensive gesture**, now replaced (see above). If any other stimulus SVG looks visually "off" on a thumbnail or contact sheet, zoom in and render it standalone before trusting the thumbnail — this one sat unnoticed through at least one prior wave's "repaired hand" pass because nobody rendered it full-size.
- **`Downloads/milestones-art/`** is the canonical watch folder and is fully synced through wave 7.
- **`_wave7_incoming/`** can be deleted once Tredoux has done a detailed review of it — not yet deleted as of this handoff.

## What's next

1. Re-attach the MJ `--sref` style anchor and regenerate: sun, at_light, sc_drink, sc_eat, sq_outside.
2. Get Tredoux's decision on the size-set design (isolated-card vs all-three-plus-arrow) before touching the 10 size-set stimuli — the current design impacts two single-object items if changed.
3. col.blue / col.red stay vector permanently — no action needed.
4. Once the above land, the raster count should reach 115 of 117 in-scope stimuli (2 permanent vector skips excluded).
