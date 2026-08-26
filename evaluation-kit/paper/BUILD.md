# D3 paper packs — build and render

**Last built:** 2026-08-26 · bank `1.11.0` · 8 band packs + 1 reprint set.

## What ships here

| File | Pages | Notes |
|---|---:|---|
| `D3_paper_pack_A3_formA.pdf` / `_formB.pdf` | 93 / 93 | |
| `D3_paper_pack_A4_formA.pdf` / `_formB.pdf` | 92 / 92 | |
| `D3_paper_pack_A5_formA.pdf` / `_formB.pdf` | 93 / 93 | |
| `D3_paper_pack_G1_formA.pdf` / `_formB.pdf` | 96 / 95 | **Montree Canopy — added 2026-08-26** |
| `D3_scoring_sheets_only.pdf` | 106 | Reprint set: just the sheets that get written on, all eight combinations. Regenerated 2026-08-26 — the previous file was 79 pages and predated G1. |

Each band pack is **one** PDF containing: cover · guide · teacher scripts (Word & Sound Play,
Number & Shape Play, **English Time**) · child pages (stimulus cards) · record sheets ·
observation booklet · band lookup and summary.

**There is no standalone EFL booklet.** An early revision of `ARCHITECTURE.md` §D3 specified an
`efl-pack.pdf`; it was never built. English Time is emitted inline by `build-paper-packs.mjs` as a
section of each band pack, sharing the pack's cover, guide and lookup pages. `ARCHITECTURE.md` has
been corrected to match.

## Why G1 was missing until 2026-08-26

`build-paper-packs.mjs` has had `G1` in `AGE_BANDS` since the Canopy content landed, and
`build/pack_G1_A.html` / `pack_G1_B.html` were being generated correctly. The renderer was the
problem: `render.mjs` derived the output filename with `/pack_(A\d)_([AB])\.html/`, which does not
match `pack_G1_A.html`. `.exec(f)` returned `null` and the run threw on the first Canopy file, so
only A3/A4/A5 were ever written. Fixed by `outputNameFor()`, which matches `[A-Z]\d` and returns
`null` (skip with a warning) rather than throwing on anything unrecognised.

## Building

```bash
cd evaluation-kit/paper
npm install                       # playwright + pdf-lib, local to this kit
npx playwright install chromium   # or --only-shell for the smaller headless build

node src/build-paper-packs.mjs    # item-bank.json -> build/*.html   (9 files, seconds)
node src/render.mjs               # build/*.html   -> *.pdf          (9 files, ~10s total)
```

`MONTREE_ITEM_BANK=/path/to/item-bank.json` overrides the bank path for both steps.
`node src/render.mjs [htmlDir] [outDir]` overrides the directories.

Dependencies are installed **into this kit**, not the repo root — `evaluation-kit/paper/node_modules`
is gitignored here, and the repo root's `node_modules` is untouched.

### Rendering one pack at a time

`src/render-one.mjs` renders a single document with an on-disk per-unit cache, for environments that
cannot hold a long-running process (sandboxes with a short command timeout, CI steps with a hard
wall clock). Re-run it until it prints `COMPLETE`; each run resumes from the cache.

```bash
node src/render-one.mjs build/pack_G1_A.html D3_paper_pack_G1_formA.pdf
# optional: node src/render-one.mjs <html> <out> [cacheDir] [budgetMs]
```

Output is identical to `render.mjs` — same chrome table, same header/footer templates, same
unit-by-unit printing that makes the section-relative `N OF M` resolve.

## Environment note (Linux)

Playwright's bundled Chromium needs `libXdamage.so.1`, which is not present on every minimal Linux
image and cannot be installed without root. Without root, fetch and extract it locally:

```bash
mkdir -p /tmp/xlibs && cd /tmp/xlibs
apt-get download libxdamage1                      # no root needed to download
dpkg-deb -x libxdamage1_*.deb ./root
export LD_LIBRARY_PATH=/tmp/xlibs/root/usr/lib/$(uname -m)-linux-gnu:$LD_LIBRARY_PATH
```

Then run the render commands in the same shell. On the machine the 2026-08-26 build ran on, the
extracted library is kept at `~/.cache/montree-paper-deps/lib`, so:

```bash
export LD_LIBRARY_PATH=$HOME/.cache/montree-paper-deps/lib:$LD_LIBRARY_PATH
```

`npx playwright install` will print a host-validation warning about the same library. The download
still completes; only the launch fails, and `LD_LIBRARY_PATH` fixes that.

## Sanity checks after a render

```bash
for f in D3_*.pdf; do echo -n "$f "; pdfinfo "$f" | grep -E '^(Pages|Page size)'; done
```

Expect A4 at `594.96 x 841.92 pts` and 90–110 pages per band pack. A pack under 50 pages means a
module was dropped; a page size other than that A4 means `PAGE` in `render.mjs` was edited.
