# Art Final Handoff — Montree Milestones Art Replacement (COMPLETE)

Date: 2026-08-05. Audience: Tredoux, and/or the next Claude session picking this up. **This
supersedes `WAVE1_HANDOFF.md` and `WAVE7_HANDOFF.md` for current-state truth** — those remain in
place as per-wave history and are still useful for "how did we get here" detail, but if anything
here conflicts with them, this doc wins. `ART_REPLACEMENT_HANDOFF.md` (pipeline architecture) is
still the correct read for how the bank/D2/paper build chain is wired together.

## TL;DR

Art replacement is **DONE**. All 115 of 117 in-scope picture/scene stimuli
(`ST.col.blue`/`ST.col.red` stay vector by design, not a gap) now carry Midjourney-generated,
composited, and/or programmatically-drawn `render.raster` (webp, ≤512×512, q80, base64) with
`render.svg` preserved as the fallback everywhere. Bank is `1.10.0`,
`sha256:3cb8ee0b3bea14ddebb6cb8a73dd9192b9033775780d6e2825660afaacb4dc82`. A go-live audit
(repo+bank, D2 functional, paper) passed 20/20 checks on 2026-08-05. One gate remains open: live
montree.xyz verification, blocked on Tredoux logging back into the site (see "Outstanding").

## Final state

- **Bank**: `1.10.0`, checksum `sha256:3cb8ee0b3bea14ddebb6cb8a73dd9192b9033775780d6e2825660afaacb4dc82`.
- **Scope**: 115/115 in-scope picture/scene stimuli have raster art. `ST.col.blue` / `ST.col.red`
  are permanent vector skips (colour-identity stimuli — the whole point is the flat colour, an
  image model can't guarantee it, so they were never in scope).
- **D2 tablet app**: single-file `D2_montree_milestones_app.html`, 2,283,137 bytes. The 2MB
  ceiling is **soft** per Tredoux (confirmed wave 7) — don't block on it, just don't let it
  balloon without reason.
- **Paper packs**: 5.7–6.9MB each now that raster art prints (previously vector-only, much
  smaller). Scoring-only pack is unchanged (no stimulus art on scoring sheets).
- **Renderers**: both the D2 app template (`app.template.html`'s `stimSVG()`) and the paper
  generator (`build-paper-packs.mjs`'s `svgArt()`) are now **raster-first with SVG fallback** —
  see "The renderer-gap lesson" below for why this mattered.

## Commit chain (all on `main`, pushed)

| Commit | What |
|---|---|
| `4a494132` | wave 2 (6 stimuli, bank 1.3.0) |
| `88dbb7c0` | live-app raster parity (`bank-projection.ts`, `types.ts`, `StimulusSvg.tsx`) |
| `38bf6212` | wave 3 (12, 1.4.0) |
| `624c48e6` | wave 4 (15, 1.5.0) |
| `18293a44` | wave 5 (12, 1.6.0) |
| `e9fa03bc` | wave 6 (10 + pagescribble q80 repair, 1.7.0) |
| `2e25bf9d` | wave 7 (31: singles, action/sequence scenes, 16 composited group/spatial scenes, repaired hand raster, 1.8.0) |
| `d4229b11` | ST.hand SVG replacement, 1.8.1 — original vector was an inappropriate raised-middle-finger gesture; replaced with an open palm. **Printed packs affected — physical reprints advised.** |
| `d060e6c7` | docs + `gen/` DO_NOT_RUN warning |
| `7134f7f8` | wave 8 (4, 1.9.0) |
| `3ddcfe62` | wave 9 (final 11 size-set stimuli: drawn rods + feather, composited balls/pencils/trees, 1.10.0 — **115/115 complete**) |
| `267e37ae` | docs: mark art replacement complete at 1.10.0 |
| `4d94ac0b` | **CRITICAL renderer fix** — D2 app template and paper generator were SVG-only despite the bank carrying raster for 8 waves; both now raster-first with SVG fallback; D2 + all 7 PDFs rebuilt |

(Waves 1 and its wave-1-specific infrastructure builds precede this chain — see
`WAVE1_HANDOFF.md`: commits `60dba700` / `e988294f`, bank `1.2.0`, 14 stimuli.)

## Design decisions

**Size-set stimuli — one size per answer card (Tredoux, 2026-08-05).** The 10 `at_ball/rod/pencil/tree_*`
size-set stimuli were resolved as **Option A: one size per card**, not the competing
all-three-with-arrow design. Rationale: sizes are separate answer options within items ("Tap the
longest one" — each size is its own tappable card, so showing all three together would break
option-card discrimination), and two items show a single size alone with no comparison
(`IT.ATL-X.A3.A.03`, an inhibition item, and `IT.E1.A5.A.03`, EFL vocabulary) — the all-three
design breaks both of those outright. This decision unblocked wave 9 (final 11 stimuli).

**ST.hand SVG replacement (1.8.1) is a correctness fix, not a style choice.** A contact-sheet
review caught that the original vector — closed fist, one finger extended, everything else
curled — was an inappropriate gesture, not an ambiguous hand shape. Replaced with an open palm
(five spread fingers, same construction conventions as ST.foot/ST.leg). This stimulus is
referenced by 2 EFL items and prints on physical paper packs — **any pack printed before
`d4229b11` carries the old art and should be treated as needing a reprint**, independent of the
raster-art project generally.

## Composite pipeline (proven, reusable)

Built and proven across waves 7–9 for any future scene/group/size stimuli:
- **Cutouts** from already-accepted flat art via flood-fill mask + colour decontamination +
  feather.
- **Exact-count stamping** for `gp_` counting-group scenes (counts verified against each item's
  scoring key, not eyeballed).
- **Occlusion-based spatial relations** for `sc_` scenes (in-front-of/behind/next-to etc.,
  likewise verified against scoring keys).
- **Proportional scaling** for `at_` size-set stimuli, matching the original SVG geometry so the
  size relationships an item is testing stay correct in the new art.
- The **rod** and **feather** stimuli have no Midjourney source — they're original programmatic
  drawings, built to match the composited set's style.
- Base assets for composites (open box, table, pencil) live in `<repo>/_assets_incoming/`.

## Go-live audit (2026-08-05)

- **Repo + bank — 9/9 PASS**: checksum chain intact, `validate.mjs` clean, all 115 rasters decode
  as valid images, 1946/1946 item→stimulus references resolve, zero dirt in protected paths.
- **D2 functional — 5/5 PASS**: 3 full sessions run across age bands, 0 console messages, 256/256
  picture/scene renders showed raster on-screen (not just present in the data — actually
  rendered), 193/193 vector-kind stimuli (letters/words/numerals/shapes/quantity/the 2 colour
  skips) correctly stayed vector, export payload carries bank `1.10.0` + the correct checksum.
- **Paper — 6/6 PASS**: all 7 PDF stamps identical (`1.10.0` + checksum), page counts match
  across the set (93/93/92/92/93/93/79), 26 sampled pages visually clean, A5 colour-notice block
  intact.
- **LIVE SITE gate — PENDING.** montree.xyz was logged out in Chrome during the audit; needs
  Tredoux to log in, then verify the served bank is `1.10.0` and raster renders correctly in the
  live runner. This is the one audit leg not yet closed.

### The renderer-gap lesson

Waves 2–8 passed every audit run against them — checksum correct, bank data correct, rasters
present and valid — while the D2 app and paper generator were quietly still SVG-only underneath,
so **nothing anyone actually looked at on a screen or a printed page had changed** for those eight
waves' worth of "shipped" art. `4d94ac0b` fixed it. The generalizable lesson: **an audit has to
verify what renders on screen or on the printed page, not just what data a file carries.**
Checking that `render.raster` exists and decodes is necessary but not sufficient — you have to
also confirm the renderer that's actually in front of the user reads that field at all. Every
audit after `4d94ac0b` (see go-live audit above) explicitly checks on-screen/on-page rendering,
not just bank contents, for this reason.

## Outstanding for Tredoux

1. **Live-site verification** — log into montree.xyz, confirm served bank = `1.10.0` and rasters
   render in the live runner (the one open audit gate).
2. **Redistribute `D2_montree_milestones_app.html`** to any tablets still holding an older copy —
   old builds trigger the `acceptBankDrift` 409 on import against the new bank.
3. **Reprint any physical packs** printed before this project (old art) or before `d4229b11`
   specifically (the offensive ST.hand vector) — both are reasons to reprint independently.
4. **Decide on committing** the currently-untracked `evaluation-kit/item-bank/validate.mjs` and
   whether to leave the stale `evaluation-kit/item-bank/gen/` scripts in place (already warned off
   via `DO_NOT_RUN.md` — see gotchas below) or remove them.
5. **Optional**: a compact cut-out paper edition (2–4 cards/page) was offered, not built.
6. **Optional**: an actual-duration field on record sheets — design target is 15 min/sitting;
   realistic paper estimate is 18–25 min based on the rebuilt packs.

## Operational gotchas for future sessions

- **Device staging cache serves stale copies of previously-staged paths.** Workaround: `cp` to a
  fresh filename on the Mac, stage that instead of re-staging the original path.
- **`device_bash` has no network and cannot `rm`.** Anything needing network (git push, installs)
  or deletion goes through Desktop Commander, not the Cowork device bridge.
- **`git push` ONLY via Desktop Commander** — the device bridge's `git push` fails every time (no
  network). See CLAUDE.md rule #1.
- **Paper scripts' CLI main-guards silently no-op** on this repo's space-containing path
  (`.../Master Brain/ACTIVE/montree`). Invoke `buildAll()` / `renderAll()` via a small driver
  script (dynamic import) rather than `node build-paper-packs.mjs` / `node render.mjs` directly.
- **`pdf-lib` and `playwright` are not in `package.json`.** Installed `--no-save --no-package-lock`
  back in wave 7; a clean checkout/`npm ci` won't have them — reinstall the same way if missing.
  The Chromium cache used by Playwright can also vanish between sessions — expect to re-download.
- **`evaluation-kit/item-bank/gen/` is a landmine, not a tool** — a stale generator (bank `1.1.0`)
  that unconditionally overwrites the five authored files and `BANK_CHECKSUM.txt` if run. Never
  run anything in that directory; see `evaluation-kit/item-bank/gen/DO_NOT_RUN.md`. The real merge
  tool is always `scripts/evaluation/merge-item-bank.mjs --src evaluation-kit/item-bank`.
- **The Midjourney style anchor (`--sref`) drops repeatedly in long sessions.** Re-attach the ant
  image chip before the next batch if style-rejects start clustering; fallback reference URL:
  `https://cdn.midjourney.com/6b697ee7-4947-4cd6-9e90-f5defc573c0d/0_3.jpeg`.
- **THE BIG LESSON (see "The renderer-gap lesson" above)**: audits must verify what actually
  renders on screen or page, not just what data a file carries — the D2/paper renderer gap shipped
  through 7 waves of audits that all technically "passed."
