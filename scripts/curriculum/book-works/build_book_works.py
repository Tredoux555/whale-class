# -*- coding: utf-8 -*-
"""Book Works pipeline -- reusable, data-driven, per-book.

Generates the four approved manipulative works (picture match, sentence &
picture match, sentence builder guided/free) for any Dark Phonics book.
Same fonts/layout/geometry as the approved the-cat-sat draft
(_draft_book_works.py), refactored so the book content (title, sentences,
art) is data-driven instead of hard-coded.

Two content sources, auto-detected by slug:
  a) EASY READERS   -- lib/montree/english-curriculum/spec/
                        easy-readers-manifest-v2.json (e.g. the-cat-sat)
  b) LETTER BOOKS   -- scripts/curriculum/flashcards/books_def.py (BOOKS)
                        (e.g. the-sat, the-spat, the-pat, the-pit, the-nap)

Usage:
    python3 build_book_works.py [--page a4|a5] [--track second-language]
                                <slug> [<slug> ...]

Output:
    materials-out/book-works[-second-language][-a5]/<slug>/
        <slug>-work1-picture-match.pdf (etc.)

================================================================================
LAYOUT STANDARD (2026-08-27, approved)
================================================================================
Approved by Tredoux on 2026-08-27. This is the house layout for every Dark
Phonics book work. Do NOT revert to the old rounded/dashed-card-per-item
layout, and do not "tidy" these rules away in a later pass.

1. BASE / WORKING / CONTROL SHEETS
   Solid thin rules (0.6 pt), square corners, zero gap between cells: a plain
   shared-boundary table grid. Every slot is drawn FULL SIZE and bordered.
   These sheets are never cut -- their instruction line says so.

2. CUT SHEETS
   The only lines on a cut sheet are the DASHED guillotine lines. Tabs
   themselves carry NO border of their own -- you cut directly on the dashed
   line. Cut sheets reuse the base grid's row/column COUNT so a cut tab always
   corresponds 1:1 to a slot.

3. ONE CONTINUOUS STROKE PER BOUNDARY
   Each cut line is a single full-width / full-height stroke (see grid_lines),
   never one rect per cell. That is what makes each boundary exactly one
   straight guillotine cut.

4. TAB CLEARANCE -- TAB_GAP = 2 mm
   A cut tab must DROP INTO its slot, so each cut-grid cell is 2 mm smaller on
   every side, i.e. 4 mm narrower and 4 mm shorter than the slot it fills
   (see tab_grid). The cut grid is centred on the sheet.

5. INSTRUCTION LINE STATES THE CUT COUNT
   Cut sheets print "Cut on the dashed lines - N straight cuts." where
   N = (n_rows + 1) + (n_cols + 1) (see cut_note). Non-cut sheets print an
   explicit "do not cut" line.

6. WORKS 1 & 2 COLUMN ORDER -- PICTURE ON THE LEFT (2026-08-31, approved)
   Approved by Tredoux on 2026-08-31. pair_page() (works 1 & 2: Picture
   Match, Sentence & Picture Match) draws col_w = [PIC_W, SENT_W] -- picture
   in column 0, sentence in column 1 -- matching works 3 & 4 (sentence
   builder), which already led with the picture column. Do NOT revert to
   picture-on-the-right.

7. WORK 3 -- ONLY THE CHANGING WORD IS A PIECE (2026-09-02, approved)
   Approved by Tredoux on 2026-09-02. In Work 3 (Sentence Builder -- guided)
   a word column is a cut-out piece only if the word CHANGES between rows;
   columns whose word is identical in every row (case + punctuation
   normalised) are STATIC and print in ink straight onto the working sheet,
   along with the picture cue. The grey guide word stays under each
   changing-word cell, and the cut sheet holds the changing words only --
   e.g. "The ___ Sat!" prints "The" and "Sat!" and cuts out
   ant / snake / apple / sun / star / cat. See changing_cols() and
   sb_changing_cutsheet(). Work 4 (free) is unchanged: every word is a piece
   there. Works 1 & 2 unchanged.

8. CLEAN SENTENCES IN EVERY WORK -- NO ELLIPSIS (2026-09-02, approved)
   Approved by Tredoux on 2026-09-02: "we are teaching correct grammar."
   Every row of works 1-4 prints ONE clean sentence built from the spread by
   clean_sentence(nar, reveal) -- lead-in with its "…"/"..." stripped, the
   reveal lower-cased into it, exactly one terminal mark. "The ant…" + "Sat!"
   becomes "The ant sat!". Works 3 & 4 split that clean sentence on spaces
   for their word tabs, so the changing-column rule (7) reads clean words.

10. WORK 3 v2 -- BLANK SLOT + CONTROL ON THE BACK (2026-09-05, approved)
   Approved by Tredoux on 2026-09-05. The word cards are stuck on with velcro,
   so the grey guide word under each changing-word cell is useless there. v2
   (…-work3-sentence-builder-guided-v2.pdf) keeps the same grid and the same
   cut sheet but leaves the changing-word cell BLANK, and adds a control of
   error as page 2 -- the same grid with every word in ink, printed on the
   back like works 1, 2 and 4. v1 (grey guide word, no control) is KEPT as a
   separate file in case a magnetic-sheet version can use the guide.

9. WORK 0 -- CHARACTERS STRIP (2026-09-02, approved)
   The preliminary work for the book: a 65 mm strip of blank bordered boxes,
   one per character in first-appearance order, its duplex BACK printed as the
   control, plus a cut sheet of character picture tabs. See build_work0().
================================================================================
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FLASHCARDS = os.path.join(REPO, 'scripts', 'curriculum', 'flashcards')

# Fonts: same auto-detect pattern as flashcards/_build_one.py -- prefer the
# repo's own canvas-fonts copy when present (Mac), else fall back to the
# Cowork cloud container's canvas-design skill folder.
_FONTS_DIR = os.path.join(FLASHCARDS, 'canvas-fonts')
if os.path.exists(os.path.join(_FONTS_DIR, 'YoungSerif-Regular.ttf')):
    os.environ.setdefault('MONTREE_CANVAS_FONTS', _FONTS_DIR)

sys.path.insert(0, FLASHCARDS)

from reportlab.lib.pagesizes import A4, A5
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

F = os.environ.get('MONTREE_CANVAS_FONTS',
                    '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title', F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word', F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('WordRg', F + 'Outfit-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Nar', F + 'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Label', F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'\u2019-]*")

INK = (0, 0, 0)
RED = (0.776, 0.157, 0.157)
GREY = (0, 0, 0)
FAINT = (0, 0, 0)
LINE = (0, 0, 0)

MAX_ROWS = 7

# ============================================================== PAGE PRESET =
# 2026-09-10, approved by Tredoux -- A NATIVE A5 OUTPUT.
#
# Every sheet's geometry hangs off the module globals below. They are no
# longer literals: apply_page_preset() writes them from PAGE_PRESETS before
# any build runs, and 'a4' reproduces this file's historical output BYTE FOR
# BYTE (same numbers, same code path). `--page a5` (or DP_PAGE=a5) selects
# the A5 preset, which is a genuinely different sheet, not a scaled A4:
#
#   * the card standard does NOT change -- a picture cell is still 44 x 32 mm,
#     so an A5 work and an A4 work share their manipulatives;
#   * the CHROME goes instead. header() paints one 5.5 pt caption line up in
#     the top margin and nothing else (no masthead, no rule); instruction()
#     and footer() are no-ops; and no cut guides of ANY kind are printed --
#     no dashed guillotine lines and no 2 mm tab clearance, because Tredoux
#     measures the cut on the guillotine himself. A cut card is therefore the
#     full 44 x 32 slot;
#   * that buys the whole sheet for content: the grid starts at PH - M and
#     fills 136 x 192 mm (6 rows of 32 mm), and a cut sheet packs 3 across;
#   * a book with more rows than the sheet holds PAGINATES (page_chunks());
#     the card is never shrunk below the standard to make a book fit.
#
# Combines freely with --track second-language: the track picks the wording
# and the staging folder, the page preset picks the sheet.
PAGE_PRESETS = {
    'a4': {
        'size': A4,
        'M': 14 * mm,
        'content_bottom': lambda M: M + 12 * mm,
        'PIC_W': 44 * mm,
        'ROW_H': 32 * mm,
    },
    'a5': {
        'size': A5,
        'M': 6 * mm,
        'content_bottom': lambda M: M,
        'PIC_W': 44 * mm,
        'ROW_H': 32 * mm,
    },
}

PAGE = 'a4'
PW = PH = M = CW = CONTENT_BOTTOM = PIC_W = ROW_H = SENT_W = None


def apply_page_preset(key):
    """Set every geometry global from PAGE_PRESETS[key]. Called once, before
    any building; nothing below reads a page size any other way."""
    global PAGE, PW, PH, M, CW, CONTENT_BOTTOM, PIC_W, ROW_H, SENT_W
    try:
        p = PAGE_PRESETS[key]
    except KeyError:
        raise SystemExit('unknown page preset %r (use a4 | a5)' % key)
    PAGE = key
    PW, PH = p['size']
    M = p['M']
    CW = PW - 2 * M
    CONTENT_BOTTOM = p['content_bottom'](M)
    # 2026-08-29 per Tredoux: works 1 & 2 share works 3 & 4's card standard,
    # so PIC_W / ROW_H are the single canonical card constants for all four.
    PIC_W = p['PIC_W']
    ROW_H = p['ROW_H']
    SENT_W = CW - PIC_W


def is_a5():
    return PAGE == 'a5'


def page_key(argv=None):
    """'a5' when --page a5 / --a5 is on the command line or DP_PAGE says so."""
    argv = list(sys.argv if argv is None else argv)
    for i, a in enumerate(argv):
        if a == '--page' and i + 1 < len(argv):
            return _norm_page(argv[i + 1])
        if a.startswith('--page='):
            return _norm_page(a.split('=', 1)[1])
        if a == '--a5':
            return 'a5'
    return _norm_page(os.environ.get('DP_PAGE', 'a4'))


def _norm_page(v):
    v = (v or '').strip().lower()
    if v in ('', 'a4'):
        return 'a4'
    if v == 'a5':
        return 'a5'
    raise SystemExit('unknown page preset %r (use a4 | a5)' % v)


def strip_page_args(argv):
    """argv with the page flags removed, so the existing parser still works."""
    out, skip = [], False
    for a in argv:
        if skip:
            skip = False
            continue
        if a == '--page':
            skip = True
            continue
        if a.startswith('--page=') or a == '--a5':
            continue
        out.append(a)
    return out


apply_page_preset('a4')

OUT_ROOT = os.path.join(REPO, 'materials-out', 'book-works')

# --- TRACK ----------------------------------------------------------------
# Default (no flag) is FIRST LANGUAGE: materials-out/book-works/<slug>/, the
# same six PDFs this file has always written. --track second-language (or
# DP_TRACK=second-language) puts every row through four_word.transform_sentence
# and stages into materials-out/book-works-second-language/<slug>/ (from where
# they are copied to public/dark-phonics-books/second-language/works/<slug>/).
sys.path.insert(0, os.path.join(REPO, 'scripts', 'curriculum',
                                'dark-phonics-storybooks'))
import four_word as fw                                          # noqa: E402
TRACK = fw.track()
if fw.is_second(TRACK):
    OUT_ROOT = os.path.join(REPO, 'materials-out', 'book-works-second-language')


def out_root():
    """Staging folder for this (track, page) combination. A4 keeps the two
    folders it has always had; A5 stages beside them under an `-a5` suffix,
    from where the PDFs are copied to
    public/dark-phonics-books/a5[/second-language]/works/<slug>/."""
    return OUT_ROOT + '-a5' if is_a5() else OUT_ROOT
EASY_READERS_MANIFEST = os.path.join(
    REPO, 'lib', 'montree', 'english-curriculum', 'spec',
    'easy-readers-manifest-v2.json')
# Easy Reader spread art. The permanent home is inside the repo
# (phonics-images/easy-readers/<slug>/pN.jpg); the old Desktop scratch
# folder is kept only as a fallback for machines that still have it.
EASY_READERS_ART_ROOTS = [
    os.path.join(REPO, 'phonics-images', 'easy-readers'),
    os.path.expanduser(
        '~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers'),
]


# --------------------------------------------------------------- helpers ---
def fit(text, font, size, maxw, floor=10, step=0.5):
    while size > floor and stringWidth(text, font, size) > maxw:
        size -= step
    return size


def hairline(c, x1, y, x2, color=LINE, width=0.6):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.line(x1, y, x2, y)


# ------------------------------------------------------------- IMAGE PREP --
# 2026-09-08 (4th), approved by Tredoux. THE REAL DEFECT the-pit's works had:
# the drawing sits small in the middle of its 1024x1024 frame with wide dead
# margins, so once the frame is fitted to the box the character prints tiny;
# and a few frames carry a grey/tan paper tone right out to the edge, so those
# tiles read as dirty next to their white neighbours.
#
# Both are properties of the FRAME, not of the drawing, so they are fixed here
# -- per image, on the way into the PDF -- instead of by swapping in someone
# else's art. Every works picture goes through prep_art():
#
#   a) find the background: the near-uniform colour sampled from the four
#      corners (BG_TOL either side, 0-255);
#   b) whiten it: flood from the border through background-coloured pixels
#      only, and paint what that reaches pure white. Interior background-
#      coloured pixels are never reached, so the drawing is untouched;
#   c) crop to the content bounding box + PAD_FRAC padding, and centre that on
#      a WHITE SQUARE canvas, so the drawing fills its box the way a portrait
#      does;
#   d) never resample: the canvas is as big as the crop needs, so every source
#      pixel survives at full resolution.
#
# FALLBACK -- FULL-BLEED ART: some frames are not a drawing on paper at all,
# they are an illustration painted edge to edge (the-pit's star, pit-p5: cream
# sky over brown ground, no margin anywhere). There is no paper to whiten
# there, and flooding would eat the sky, so such a frame is detected -- its
# four corners disagree by more than CORNER_SPREAD -- and left exactly as it
# is. Only new art can make that tile match its neighbours; prep will not
# fake it.
#
# The flood itself cannot damage a drawing: it only ever crosses pixels
# already within BG_TOL of the paper colour, so ink and colour are unreachable
# by construction. The earlier geometric "bleed" test was wrong -- it measured
# paper enclosed by the content box (the space beside the snake's neck) and
# fell back on nine tiles out of ten.
#
# Prepped frames are cached in a `_prepped/` folder beside the source art,
# keyed by prep version + source mtime, so a rebuild stays fast.
PREP_VERSION = 4
BG_TOL = 15          # floor for the background tolerance, per channel
BG_TOL_MAX = 45      # ceiling, so the flood can never reach into pale art
RING_FRAC = 0.02     # outer ring sampled to size the tolerance
CORNER_FRAC = 0.02   # corner patch side, as a fraction of the image
CORNER_SPREAD = 24   # corners further apart than this = no uniform background
PAD_FRAC = 0.04      # padding around the content box, on its longer side
MAX_FLOOD = 0.995    # a frame flooded past this is effectively blank
BBOX_BLOCK = 8       # content mask is pooled into blocks this big ...
BBOX_BLOCK_FRAC = 0.15   # ... and a block counts as content past this fill

_PREP_NOTES = []     # [(path, note)] -- what fell back, for the build log

# --- MANUAL CROP TABLE (2026-09-08, per Tredoux) --------------------------
# The automatic content box is the box of the whole DRAWING, and on scene art
# the drawing is the pit -- so the ant keeps printing tiny inside a correctly
# cropped hole. Where a tile needs the CHARACTER to be the subject, the crop
# is chosen by eye and recorded here, in SOURCE PIXELS:
#
#     works-crops.json  ->  { "<book folder>": { "<file.png>": [x0,y0,x1,y1] } }
#
# The book key is the art file's own parent folder (phonics-images/satpin-v2/
# books/the-pit/pit-p2.png -> "the-pit"), so the table is book-scoped and any
# book can opt in one tile at a time. A listed tile skips the automatic
# content-box step entirely (that is the whole point -- the automatic box is
# what we are overriding) but still gets the paper whitened exactly as before
# and is still centred on a white square. Unlisted tiles are untouched.
CROPS_PATH = os.path.join(HERE, 'works-crops.json')
_CROPS = None


def _crops():
    global _CROPS
    if _CROPS is None:
        try:
            with open(CROPS_PATH) as f:
                _CROPS = json.load(f)
        except Exception:
            _CROPS = {}
    return _CROPS


def manual_crop(path):
    """This tile's hand-chosen [x0, y0, x1, y1] source-pixel box, or None."""
    book = os.path.basename(os.path.dirname(path))
    box = _crops().get(book, {}).get(os.path.basename(path))
    if isinstance(box, (list, tuple)) and len(box) == 4:
        return [int(v) for v in box]
    return None


def _border_flood(mask):
    """The part of `mask` reachable from the image border, 4-connected."""
    import numpy as np
    reach = np.zeros_like(mask)
    reach[0, :] = mask[0, :]
    reach[-1, :] = mask[-1, :]
    reach[:, 0] = mask[:, 0]
    reach[:, -1] = mask[:, -1]
    for _ in range(4000):
        grown = reach.copy()
        grown[1:, :] |= reach[:-1, :]
        grown[:-1, :] |= reach[1:, :]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= mask
        if grown.sum() == reach.sum():
            return grown
        reach = grown
    return reach


def _paper_flood(a):
    """The border-reachable paper of an already-cropped frame, or None when
    the frame is full-bleed art / has no paper at its border. Same numbers as
    the automatic path -- corner-sampled background, ring-sized tolerance."""
    import numpy as np
    h, w = a.shape[:2]
    k = max(6, int(min(h, w) * CORNER_FRAC))
    patches = [a[:k, :k], a[:k, -k:], a[-k:, :k], a[-k:, -k:]]
    meds = [np.median(p.reshape(-1, 3), axis=0) for p in patches]
    bg = np.median(np.stack(meds), axis=0)
    spread = max(float(np.abs(m - bg).max()) for m in meds)
    if spread > CORNER_SPREAD:
        return None
    r = max(4, int(min(h, w) * RING_FRAC))
    ring = np.concatenate([a[:r, :].reshape(-1, 3), a[-r:, :].reshape(-1, 3),
                           a[:, :r].reshape(-1, 3), a[:, -r:].reshape(-1, 3)])
    grain = float(np.percentile(np.abs(ring - bg).max(axis=1), 90))
    tol = int(min(BG_TOL_MAX, max(BG_TOL, grain * 2.5)))
    bgmask = (np.abs(a - bg).max(axis=2) <= tol)
    if not bgmask[0, :].any() and not bgmask[:, 0].any():
        return None
    flooded = _border_flood(bgmask)
    if flooded.mean() > MAX_FLOOD:
        return None
    return flooded


def _prep_manual(im, path, box, cache_dir, out):
    """A hand-cropped tile: take the box exactly as given, whiten whatever
    paper it still carries, centre it on a white square. No content-box step
    -- the box IS the framing decision."""
    import numpy as np
    from PIL import Image
    w, h = im.size
    x0 = max(0, min(w - 1, box[0]))
    y0 = max(0, min(h - 1, box[1]))
    x1 = max(x0 + 1, min(w, box[2]))
    y1 = max(y0 + 1, min(h, box[3]))
    crop = im.crop((x0, y0, x1, y1))
    a = np.asarray(crop).astype(np.int16)
    flooded = _paper_flood(a)
    if flooded is None:
        _PREP_NOTES.append((path, 'manual crop %s -- full-bleed, not whitened'
                            % ([x0, y0, x1, y1],)))
    else:
        crop = Image.fromarray(np.where(flooded[:, :, None], np.uint8(255),
                                        a.astype(np.uint8)))
        _PREP_NOTES.append((path, 'manual crop %s' % ([x0, y0, x1, y1],)))
    side = max(crop.size)
    sq = Image.new('RGB', (side, side), (255, 255, 255))
    sq.paste(crop, ((side - crop.size[0]) // 2, (side - crop.size[1]) // 2))
    os.makedirs(cache_dir, exist_ok=True)
    sq.save(out)
    return out


def prep_art(path):
    """A works picture, cropped to its drawing, on a clean white square.

    Returns the prepped file's path (or `path` itself if anything about the
    image makes prepping unsafe -- a picture always prints, prepped or not).
    """
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        return path
    src_mtime = int(os.path.getmtime(path))
    stem = os.path.basename(path).rsplit('.', 1)[0]
    cache_dir = os.path.join(os.path.dirname(path), '_prepped')
    box = manual_crop(path)
    key = ('m%d-%d-%d-%d' % tuple(box)) if box else 'auto'
    out = os.path.join(cache_dir, '%s__v%d_%s_%d.png' % (stem, PREP_VERSION,
                                                         key, src_mtime))
    if os.path.exists(out):
        return out
    try:
        im = Image.open(path).convert('RGB')
        if box:
            return _prep_manual(im, path, box, cache_dir, out)
        a = np.asarray(im).astype(np.int16)
        h, w = a.shape[:2]
        k = max(6, int(min(h, w) * CORNER_FRAC))
        patches = [a[:k, :k], a[:k, -k:], a[-k:, :k], a[-k:, -k:]]
        meds = [np.median(p.reshape(-1, 3), axis=0) for p in patches]
        bg = np.median(np.stack(meds), axis=0)
        spread = max(float(np.abs(m - bg).max()) for m in meds)
        # The paper is not one flat colour -- these frames carry a visible
        # grain, and a fixed tolerance simply stops at the first grain speck,
        # which is why the crop used to be the whole frame. Size the tolerance
        # from the frame's own border noise instead (p90 of the outer ring's
        # distance from the paper colour, with headroom), floored and capped
        # so it can never reach into pale parts of a drawing.
        r = max(4, int(min(h, w) * RING_FRAC))
        ring = np.concatenate([a[:r, :].reshape(-1, 3), a[-r:, :].reshape(-1, 3),
                               a[:, :r].reshape(-1, 3), a[:, -r:].reshape(-1, 3)])
        grain = float(np.percentile(np.abs(ring - bg).max(axis=1), 90))
        tol = int(min(BG_TOL_MAX, max(BG_TOL, grain * 2.5)))
        bgmask = (np.abs(a - bg).max(axis=2) <= tol)
        if spread > CORNER_SPREAD:
            _PREP_NOTES.append(
                (path, 'full-bleed art, no paper background (corners differ '
                       'by %d) -- LEFT AS IS' % int(spread)))
            return path
        if not bgmask[0, :].any() and not bgmask[:, 0].any():
            _PREP_NOTES.append((path, 'no background at the border -- left '
                                      'as is'))
            return path
        flooded = _border_flood(bgmask)
        if flooded.mean() > MAX_FLOOD:
            _PREP_NOTES.append((path, 'frame is all background -- left as is'))
            return path
        content = ~flooded
        if not content.any():
            _PREP_NOTES.append((path, 'no content found -- left as is'))
            return path
        # The bounding box must ignore SPECKLE. These frames carry a paper
        # grain whose darkest flecks sit outside the flood tolerance, and a
        # single such fleck near a corner would otherwise pin the box to the
        # whole frame -- which is exactly why the crop used to be a no-op.
        # Pool the mask into blocks and keep only blocks with real fill, so a
        # stray fleck is dropped but every stroke of the drawing is kept.
        b = BBOX_BLOCK
        ph, pw = -(-h // b) * b, -(-w // b) * b
        pad_mask = np.zeros((ph, pw), bool)
        pad_mask[:h, :w] = content
        blocks = pad_mask.reshape(ph // b, b, pw // b, b).mean(axis=(1, 3))
        keep = blocks >= BBOX_BLOCK_FRAC
        if not keep.any():
            keep = blocks > 0
        bys, bxs = np.where(keep)
        y0, y1 = bys.min() * b, min(h - 1, (bys.max() + 1) * b - 1)
        x0, x1 = bxs.min() * b, min(w - 1, (bxs.max() + 1) * b - 1)
        canvas_rgb = (255, 255, 255)
        work = Image.fromarray(np.where(flooded[:, :, None], np.uint8(255),
                                        a.astype(np.uint8)))
        pad = int(round(max(y1 - y0 + 1, x1 - x0 + 1) * PAD_FRAC))
        cy0, cy1 = max(0, y0 - pad), min(h, y1 + 1 + pad)
        cx0, cx1 = max(0, x0 - pad), min(w, x1 + 1 + pad)
        crop = work.crop((cx0, cy0, cx1, cy1))
        side = max(crop.size)
        sq = Image.new('RGB', (side, side), canvas_rgb)
        sq.paste(crop, ((side - crop.size[0]) // 2,
                        (side - crop.size[1]) // 2))
        os.makedirs(cache_dir, exist_ok=True)
        sq.save(out)
        return out
    except Exception as exc:                                # never break a build
        _PREP_NOTES.append((path, 'prep failed (%s) -- left as is' % exc))
        return path


def draw_image_contained(c, path, x, y, w, h):
    img = ImageReader(prep_art(path))
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')


def centered(c, xc, y, text, font, size, color):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawCentredString(xc, y, text)


# ---------------------------------------------------------------------- #
# WORK NUMBERING (2026-09-06, per Tredoux): the printed set is renumbered
# from 0-4 to 1-5 -- the preliminary Characters strip (build_work0(), file
# suffix "work0-characters") becomes Work 1, and every work after it shifts
# up by one. PDF FILENAMES ARE UNCHANGED (already published); only the
# in-PDF header/footer text below changes on the next regenerate. Mirrors
# lib/montree/dark-phonics/tracker-works.ts, the canonical 1-5 list.
WORK_DISPLAY_NUMBERS = {
    'work0': 1,   # Characters
    'work1': 2,   # Picture match
    'work2': 3,   # Sentence & picture match
    'work3': 4,   # Sentence builder (guided) -- v1 and v2 are both Work 4
    'work4': 5,   # Sentence builder (free)
}


# --- 2026-09-08 (5th), per Tredoux -- EVERY PDF CARRIES ITS OWN NAME ------
# A works PDF used to open as "untitled" in a viewer and in a print queue,
# which is useless when a teacher has thirty of them. Every canvas is now
# built through work_canvas(), which stamps the document info dictionary:
#   Title   "<Book title> · Work N · <work name>"
#   Author  "Montree Phonics"
#   Subject the track the file was built on
# Verify with `pdfinfo <file>`.
PDF_AUTHOR = 'Montree Phonics'


def track_label():
    return 'Second language' if fw.is_second(TRACK) else 'First language'


def work_canvas(path, book_title, work_label):
    """A reportlab canvas with the document metadata already set."""
    c = rl_canvas.Canvas(path, pagesize=(PW, PH))
    # 2026-09-10: the A5 build sits beside the A4 one in the same print queue,
    # so its Title has to say which sheet it is.
    c.setTitle('%s · %s%s' % (book_title, work_label,
                              ' · A5' if is_a5() else ''))
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(track_label())
    c.setCreator('Montree Phonics book-works generator')
    return c


def header(c, book_title, work_name):
    """Small subtle masthead: book title + red accent dot, work name label,
    a hairline. Returns content_top (y of first usable content row).

    On A5 there is no masthead at all -- an A5 sheet cannot spare 22 mm of its
    height on chrome. All that prints is ONE caption line up in the top margin
    (Helvetica 5.5 pt, grey), and the return value is set so that
    grid_top_of() puts the grid top exactly on PH - M: the content starts at
    the margin, the caption sits outside it."""
    if is_a5():
        # A white page rect first: a PDF page with no fill is transparent, and
        # a transparent page renders BLACK in `sips`, which makes every
        # preview unreadable. Paper is white anyway, so this costs nothing.
        c.setFillColorRGB(1, 1, 1)
        c.rect(0, 0, PW, PH, stroke=0, fill=1)
        c.setFont('Helvetica', 5.5)
        c.setFillColorRGB(0.45, 0.45, 0.45)
        c.drawString(M, PH - M + 1 * mm,
                     'MONTREE PHONICS  ·  %s  ·  %s' % (book_title, work_name))
        return PH - M + 7 * mm
    top = PH - M
    tsize = fit(book_title, 'Title', 14, CW - 20 * mm, floor=10)
    c.setFont('Title', tsize)
    c.setFillColorRGB(*INK)
    c.drawString(M, top - 6 * mm, book_title)
    tw = stringWidth(book_title, 'Title', tsize)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3 * mm, top - 6 * mm + 2 * mm, 0.9 * mm,
              stroke=0, fill=1)
    c.setFont('Label', 8)
    c.setFillColorRGB(*GREY)
    c.drawString(M, top - 12 * mm, work_name.upper())
    hairline(c, M, top - 15.5 * mm, PW - M)
    return top - 15.5 * mm - 7 * mm


def footer(c, book_title, work_name):
    if is_a5():
        return          # A5 says it in the top caption instead -- see header()
    txt = 'MONTREE PHONICS · %s · %s' % (book_title, work_name)
    c.setFont('Label', 6.5)
    c.setFillColorRGB(*FAINT)
    c.drawRightString(PW - M, 8 * mm, txt)


def row_positions(content_top, n):
    """Evenly divide the content zone into n row bands; return the pitch
    and each row's bottom y (band = [bottom, bottom+pitch])."""
    usable = content_top - CONTENT_BOTTOM
    pitch = usable / n
    bottoms = [content_top - (i + 1) * pitch for i in range(n)]
    return pitch, bottoms


# ------------------------------------------------------------- content ----
def resolve_art(raw_path):
    """Most book dicts carry a working absolute Mac path already. A few
    older entries (e.g. the-sat) carry stale relative Cowork-container
    paths like 'tiles/SAT-p1.png' -- fall back to the permanent
    phonics-images/satpin-v2/books/<name>/<name>-pN.ext location.

    2026-08-29: when this script runs inside the Cowork device-bridge VM
    (rather than a real Mac terminal), the repo is mounted at a different
    absolute path, so the literal Mac paths baked into books_def.py
    (SPAT2, PIT3, PAT4, ... -- all '/Users/.../ACTIVE/montree/phonics-images/...')
    don't resolve even though the same file exists at the same path
    RELATIVE to this repo. Re-root any such path onto REPO by keeping
    everything from its 'phonics-images' path segment onward, before
    falling back to the name-guessing regex below. No-op on a real Mac,
    where the first branch above already returns."""
    if os.path.isabs(raw_path) and os.path.exists(raw_path):
        return raw_path
    if os.path.exists(raw_path):
        return os.path.abspath(raw_path)
    parts = raw_path.replace(os.sep, '/').split('/')
    if 'phonics-images' in parts:
        i = parts.index('phonics-images')
        candidate = os.path.join(REPO, *parts[i:])
        if os.path.exists(candidate):
            return candidate
    base = os.path.basename(raw_path)
    m = re.match(r'([A-Za-z0-9]+)-p(\d+)\.(\w+)$', base)
    if m:
        name, num, ext = m.groups()
        candidate = os.path.join(REPO, 'phonics-images', 'satpin-v2', 'books',
                                  name.lower(), '%s-p%s.%s' % (name.lower(), num, ext))
        if os.path.exists(candidate):
            return candidate
    raise FileNotFoundError('cannot resolve art path: %r' % raw_path)


# --------------------------------------------------- CAST PORTRAITS (works) --
# 2026-09-08 fix (Tredoux): "the new the-pit works are seriously lower grade."
#
# THE CAUSE, one sentence: a work's picture is simply that spread's STORY ART,
# and the-sat-cast books were drawn in two different ways -- the-pat's spreads
# ARE isolated character portraits on white (p1-ant.png is just the ant,
# filling the frame), while the-pit's spreads are SCENE art (a tiny ant sitting
# in a big brown pit). Both embed identically (1024x1024 RGB, Flate, ~900-1100
# ppi in the PDF -- pdfimages agrees), so nothing is being downsampled or
# re-compressed; the-pit's boxes just spend most of their pixels on dirt.
#
# THE RULE: a manipulative's picture cue must be the CHARACTER, not the scene.
# So for the books listed in PORTRAIT_BOOKS every works picture whose row names
# a cast member is swapped for that cast member's portrait -- the very same
# full-resolution file the-pat's own works use. A row that names no cast member
# (the scene-setter "A pit.") keeps its scene art, exactly as the-pat's works
# would. Nothing else about the layout, the box or the embedding changes, so
# the-pit's pictures land at the same size and quality as the-pat's.
#
# the-pat itself is NOT in PORTRAIT_BOOKS: its spread art already IS the
# portrait, so it maps to itself and is left byte-identical.
CAST_PORTRAIT_DIR = os.path.join(REPO, 'phonics-images', 'dark-phonics-books',
                                 'the-pat')
CAST_PORTRAITS = {
    'ant':    'p1-ant.png',
    'apple':  'p2-apple.png',
    'sun':    'p3-sun.png',
    'star':   'p4-star.png',
    'snake':  'p5-snake.png',
    'cat':    'p6-cat.png',
}
# 2026-09-08 (3rd), per Tredoux: POTATO IS NOT IN THIS MAP, on purpose. The
# potato page is the gag, and its joke lives in the picture -- "The potato
# didn't sit in a cot!" needs the empty cot, "The potato has 5 dogs!" needs
# the five dogs. Swapping in a plain potato portrait would print a sentence
# its own picture contradicts. A gag row therefore names no mapped cast
# member, so portrait_for_text() returns the fallback and the row keeps the
# book's own art -- the same arm the scene-setter rows ("A pit.") use.
# Opt-in, one book at a time -- the-pit ships first (2026-09-08). Add a slug
# here only after its own works have been eyeballed against the-pat's.
# 2026-09-08 (4th), per Tredoux -- EMPTY, AND IT STAYS EMPTY. Borrowing another
# book's cast drawings was the wrong fix: "now we have the characters from pat
# in the pit book." the-pat's cast is a DIFFERENT RENDERING and must never
# appear in another book. Every book uses ITS OWN art. The machinery below is
# left in place (harmless, and documents the rejected approach); what actually
# fixes the low-grade tiles is prep_art() -- see IMAGE PREP below.
PORTRAIT_BOOKS = set()


def portrait_path(name):
    """The shared sat-cast portrait for a character name, or None."""
    fn = CAST_PORTRAITS.get((name or '').strip().lower())
    if not fn:
        return None
    cand = os.path.join(CAST_PORTRAIT_DIR, fn)
    return cand if os.path.exists(cand) else None


def portrait_for_text(slug, text, fallback=None):
    """The portrait for the cast member a works row names, else `fallback`.

    Word order decides, so "The ant sat in the pit!" is the ant. Second
    language keeps the same English cast nouns (four_word only shortens the
    sentence), so this matches on both tracks.
    """
    if slug not in PORTRAIT_BOOKS:
        return fallback
    for w in _WORD_RE.findall(text or ''):
        got = portrait_path(w)
        if got:
            return got
    return fallback


def reader_art(slug, n):
    """Locate spread N's art for an easy reader, extension-agnostic."""
    for root in EASY_READERS_ART_ROOTS:
        for ext in ('png', 'jpg', 'jpeg', 'PNG', 'JPG'):
            cand = os.path.join(root, slug, 'p%d.%s' % (n, ext))
            if os.path.exists(cand):
                return cand
    raise FileNotFoundError(
        'no art for %s p%d under %s' % (slug, n, EASY_READERS_ART_ROOTS))


def page_entry(sentence, art, chant=False):
    """A whole printed line -> the {lead, reveal} shape the character rule
    reads. Same split as splitBookLine() on the TS side: everything up to the
    last space is the small italic lead-in, the last word is the big shout."""
    txt = (sentence or '').strip()
    cut = txt.rfind(' ')
    lead, reveal = (txt[:cut], txt[cut + 1:]) if cut > 0 else ('', txt)
    return {'lead': lead, 'reveal': reveal, 'art': art, 'chant': chant}


def load_easy_reader(slug):
    with open(EASY_READERS_MANIFEST) as f:
        data = json.load(f)
    if fw.is_second(TRACK):
        data = {'readers': [fw.transform_reader_entry(r)
                            for r in data['readers']]}
    reader = next((r for r in data['readers'] if r['slug'] == slug), None)
    if reader is None:
        return None
    # An easy reader's page carries the whole printed line already (there is
    # no nar/reveal split), so it goes through clean_sentence() as a
    # reveal-only sentence: ellipses stripped, one terminal mark kept, case
    # untouched because the reveal starts the sentence.
    rows, flags, pages = [], [], []
    for p in reader['pages']:
        text = clean_sentence('', p['text'])
        if text != p['text']:
            flags.append('reader sentence cleaned: %r -> %r'
                          % (p['text'], text))
        art = reader_art(slug, p['n'])
        rows.append({'text': text, 'art': art})
        pages.append(page_entry(p['text'], art))
    # NOTE 2026-09-08 (6th): THE SETTING IS NOT A ROW is a letter-book rule and
    # stays one. An easy reader's opening line is not a setting -- big-splash
    # opens on the sound ("Splash!"), jump-in-the-sand on an imperative
    # ("Jump!"), this-and-that on a pointer ("This.") -- so nothing here is
    # dropped. Those three therefore open works 1-5 on a row that names no
    # cast member, by design, and the local verify reports them as such.
    return reader['title'], rows, flags, 'easy-reader', pages


# --------------------------------------------------------- clean sentence --
# 2026-09-02 (approved by Tredoux) -- CLEAN SENTENCE RULE, works 1-4.
# "We are teaching correct grammar." A works row never prints the book's
# page-turn ellipsis. Every row's sentence is ONE clean sentence built from
# the spread:
#     lead-in (nar) with its ellipses removed
#   + the reveal (text) with its first letter lower-cased -- unless the reveal
#     actually starts the sentence (no lead-in, or the lead-in already closed
#     with . ! ?), or it is "I", or it is a shouted ALL-CAPS word
#   + exactly one terminal mark: "!" if the reveal ended on one, "?" if it
#     ended on one, otherwise "."
#     "The ant…" + "Sat!"  ->  "The ant sat!"
# Works 1 & 2 print this sentence on their sentence cards; works 3 & 4 split
# it on spaces for their word tabs ("The", "ant", "sat!"), so the work 3
# changing-column rule operates on the clean words.
# Two shapes the raw spreads throw at the rule:
#  · a reveal that itself ENDS on an ellipsis is a sentence the page has not
#    finished ("An ant naps in a…", continued overleaf) -- there is no clean
#    sentence to print, so load_letterbook() drops that row with a flag;
#  · a reveal that closes on a quotation mark ("...it!”") already carries its
#    terminal mark inside the quote, so no second mark is added.
_ELLIPSIS_RE = re.compile(r'\s*(?:…|\.\.\.)\s*')
_ELLIPSIS_END_RE = re.compile(r'(?:…|\.\.\.)\s*$')
_TERMINAL_RE = re.compile(r'[.!?]+$')
_QUOTED_END_RE = re.compile(r'[.!?][”"’\']\s*$')


def _strip_ellipsis(text):
    """Remove every '…' / '...' and tidy the whitespace it leaves behind."""
    out = _ELLIPSIS_RE.sub(' ', text or '')
    out = re.sub(r'\s+', ' ', out).strip()
    return re.sub(r'\s+([,;:!?.])', r'\1', out)


def _terminal_mark(text):
    m = _TERMINAL_RE.search(text or '')
    run = m.group(0) if m else ''
    if '!' in run:
        return '!'
    if '?' in run:
        return '?'
    return '.'


def _lower_first(fragment):
    """Lower the reveal's opening letter so it reads as the continuation it
    is. Deliberately narrow: an ALL-CAPS opening word is a shouted target
    word (a house convention, e.g. 'SOCK!'), and "I" is a proper word -- both
    are left exactly as they are."""
    if not fragment:
        return fragment
    first = fragment.split(' ', 1)[0].strip('!?.,“”"’')
    if first == 'I' or (len(first) > 1 and first.isupper()):
        return fragment
    return fragment[0].lower() + fragment[1:]


def clean_sentence(nar, reveal):
    """The one place the clean-sentence rule lives (see the block above).
    Mirrored on the TS side by cleanSentence() in
    lib/montree/dark-phonics/v2-shelf/works.ts."""
    lead = _strip_ellipsis(nar)
    rev = _strip_ellipsis(reveal)
    if not rev:
        body, mark = _TERMINAL_RE.sub('', lead).strip(), _terminal_mark(lead)
    elif _QUOTED_END_RE.search(rev):
        # the reveal closes inside a quotation -- its mark is already there
        mark, body = '', rev
        if lead and not _TERMINAL_RE.search(lead):
            body = _lower_first(body)
        if lead:
            body = (lead + ' ' + body).strip()
    else:
        mark = _terminal_mark(rev)
        body = _TERMINAL_RE.sub('', rev).strip()
        if lead and not _TERMINAL_RE.search(lead):
            # the reveal continues the lead-in, so it is not a fresh sentence
            body = _lower_first(body)
        if lead:
            body = (lead + ' ' + body).strip()
    body = re.sub(r'\s+', ' ', body).strip()
    body = re.sub(r'\s+([,;:])', r'\1', body)
    return (body + mark) if body else ''


# Pre-decodable books (lessons 1-2). Their books_def spreads are phoneme play
# ('Sss- SUN!', 'Sss- SOAP!') and, for ant-on-my-apple, absent altogether, so
# neither yields the decodable sentence set the four works need. Their letter
# JSONs do carry it (pages[].sentence + pages[].art), so these two build from
# there instead. Everything else keeps its existing source untouched.
DP_JSON_SLUGS = {'snake-in-my-sock', 'ant-on-my-apple'}
DP_LETTERS_DIR = os.path.join(REPO, 'scripts', 'curriculum',
                              'satpin-paperwork', 'letters')


def load_dp_json(slug):
    path = os.path.join(DP_LETTERS_DIR, 'dp-%s.json' % slug)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        cfg = json.load(f)
    if fw.is_second(TRACK):
        cfg = fw.sync_dp_cfg(cfg)
    art_dir = os.path.join(REPO, cfg['artDir'])
    rows, pages = [], []
    for p in sorted(cfg['pages'], key=lambda q: q['order']):
        art = os.path.join(art_dir, p['art'])
        if not os.path.exists(art):
            raise FileNotFoundError('cannot resolve art path: %r' % art)
        rows.append({'text': clean_sentence('', p['sentence']), 'art': art})
        pages.append(page_entry(p['sentence'], art))
    return cfg['bookTitle'], rows, [], 'dp-letter-json', pages


# --- 2026-09-08 (5th), per Tredoux -- THE SETTING IS NOT A ROW ------------
# THE RULE: the book's OPENING page is dropped from works 1-5 when its printed
# line is headed by no cast member. That is the scene-setter -- "A pit." names
# the hole the story happens in, not somebody who takes a turn -- and it had
# no business standing in a picture-match or a sentence builder any more than
# it had standing in the characters strip, which already excludes it.
#
# Deliberately narrow on BOTH halves, so it cannot eat a real row:
#   * only spread index 0 is ever tested -- a later page that happens to name
#     no cast member (the potato gag, "And the…?!") is untouched;
#   * the cast test is characters_of()'s own test, so the strip and the works
#     agree by construction: a page is headed by a cast member when its
#     subject noun is not the book's own target word, not a gag figure and not
#     a function word.
# A book whose first page already stars somebody (the-pat: "The ant can… /
# pat!") is unaffected -- verified: the-pat still builds the same six rows.
# 2026-09-08 (6th), per Tredoux -- the test is now literally the STRIP's own
# test: the opening line is kept only when its subject is a name the
# characters strip actually places. The earlier version approximated that with
# "not the book's own target word", which let three shapes through:
#   * a setting the reveals never name  (the-spat, "A basin.")
#   * a sound or a pointer with no subject at all
#     (big-splash "Splash!", jump-in-the-sand "Jump!", this-and-that "This.")
# Asking characters_of() directly closes all of them at once and keeps the
# promise the comment above already made -- the strip and the works agree by
# construction. the-pat ("The ant can… / pat!") still opens on ant, a cast
# member, and is unaffected.
def _has_cast_subject(pg, pages, slug=None, source='letter-book'):
    """Is this page's printed line headed by a real cast member?"""
    art_words = {w.lower() for w in
                 _words(os.path.basename(pg['art'] or '').rsplit('.', 1)[0]
                        .replace('-', ' ').replace('_', ' '))}
    if 'recap' in art_words:
        return False
    if ({w.lower() for w in _words(pg['lead'])} | art_words) & GAG_FIGURES:
        return False
    name, _from_lead = _subject(pg['lead'], pg['reveal'])
    if not name or name in NOT_A_NAME or name in GAG_FIGURES:
        return False
    if slug is None:
        return True
    try:
        cast = {c['name'].lower() for c in characters_of(slug, pages, source)}
    except SystemExit:
        return True
    return name.lower() in cast


def load_letterbook(slug):
    from books_def import BOOKS  # noqa: E402  (sys.path set up above)
    if fw.is_second(TRACK):
        BOOKS = [fw.transform_book(b) for b in BOOKS]
    book = next((b for b in BOOKS if b['slug'] == slug), None)
    if book is None:
        return None
    title = ' '.join(book['title_lines']).replace('  ', ' ')
    rows = []
    flags = []
    # The CHARACTERS strip walks the WHOLE book, not the works' capped rows
    # (works.ts: "IT WALKS THE WHOLE BOOK, NOT THE WORKS' FOUR ROWS"), so the
    # untouched spread list is captured here before any works filtering.
    pages = []
    for sp in book['spreads']:
        art_raw = sp.get('art')
        if art_raw:
            raw_text = sp.get('text')
            raw_text = (' '.join(raw_text) if isinstance(raw_text, list)
                        else (raw_text or ''))
            pages.append({'lead': sp.get('nar') or '', 'reveal': raw_text,
                          'art': resolve_art(art_raw),
                          'chant': sp.get('style') in ('drop', 'whisper')})
    for idx, sp in enumerate(book['spreads']):
        if sp.get('style') == 'drop':
            continue
        art = sp.get('art')
        nar = sp.get('nar')
        text = sp.get('text')
        if not art or not (nar or text):
            continue
        if isinstance(text, list):
            text_joined = ' '.join(text)
        else:
            text_joined = text or ''
        if '?!' in (nar or '') + text_joined:
            flags.append('excluded nar-only cliffhanger fragment '
                          '(contains "?!"): %r' % ((nar or '') + text_joined))
            continue
        if _ELLIPSIS_END_RE.search(text_joined):
            flags.append('excluded unfinished sentence (its reveal runs on '
                          'over the page turn): %r'
                          % ((nar + ' ' if nar else '') + text_joined))
            continue
        sentence = clean_sentence(nar, text_joined)
        if idx == 0 and not _has_cast_subject(
                {'lead': nar or '', 'reveal': text_joined,
                 'art': resolve_art(art),
                 'chant': sp.get('style') in ('drop', 'whisper')}, pages,
                slug, 'letter-book'):
            flags.append('dropped the opening scene-setter row from works 1-5 '
                          '(its line names no cast member): %r' % sentence)
            continue
        if not text_joined:
            flags.append('sentence built from nar only (no printed text on '
                          'that page) -- likely a narrative cue, not a true '
                          'decodable sentence: %r' % sentence)
        rows.append({'text': sentence,
                     'art': portrait_for_text(slug, sentence,
                                              resolve_art(art))})
    if len(rows) > MAX_ROWS:
        dropped = rows.pop()
        flags.append('book yielded %d rows (> cap %d) -- dropped the '
                      'finale row: %r' % (len(rows) + 1, MAX_ROWS, dropped['text']))
    return title, rows, flags, 'letter-book', pages


def load_book(slug):
    if slug in DP_JSON_SLUGS:
        result = load_dp_json(slug)
        if result is not None:
            return result
    result = load_easy_reader(slug)
    if result is not None:
        return result
    result = load_letterbook(slug)
    if result is not None:
        return result
    return None


# ------------------------------------------------------- guillotine grid ---
# 2026-08-27 format change per Tredoux: every work sheet is now a plain
# table grid -- square corners, thin solid rules, zero gap between cells,
# column boundaries shared by every row -- exactly like build_tracing.py's
# word-card page. A sheet therefore comes apart with (nrows+1)+(ncols+1)
# full-width straight guillotine cuts instead of a hand-trim around each
# dashed, round-cornered card. Slot pages and cut sheets are built from the
# SAME grid call, so a cut card is always exactly slot-sized.
GUIDE = (0.55, 0.55, 0.55)
CELL_PAD = 5 * mm
MIN_CELL = 24 * mm


def grid_lines(c, x0, y_top, col_w, row_h, n_rows, width=0.6, dashed=False):
    """One continuous stroke per cut line -- never one rect per cell.

    On cut sheets the same lines are drawn DASHED so it is obvious at a
    glance which sheet gets chopped; they are still single full-width /
    full-height strokes, so each one remains one straight guillotine cut.
    """
    gw, gh = sum(col_w), row_h * n_rows
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(width)
    # A5 (2026-09-10, per Tredoux): NO cut guides. Every sheet, cut sheets
    # included, draws the same plain solid table grid -- the guillotine cut is
    # measured on the machine, not marked on the paper. The grid itself stays
    # (it is the sheet's structure, and it is what makes a cut card slot-sized).
    if dashed and is_a5():
        dashed = False
    if dashed:
        c.setDash(3, 2.4)
    else:
        c.setDash()
    for i in range(n_rows + 1):
        y = y_top - i * row_h
        c.line(x0, y, x0 + gw, y)
    x = x0
    c.line(x, y_top, x, y_top - gh)
    for w in col_w:
        x += w
        c.line(x, y_top, x, y_top - gh)
    c.setDash()


def cell(x0, y_top, col_w, row_h, i, j):
    return (x0 + sum(col_w[:j]), y_top - (i + 1) * row_h, col_w[j], row_h)


def cell_text(c, box, text, size, color=INK, font='WordRg'):
    x, y, w, h = box
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawCentredString(x + w / 2, y + h / 2 - size * 0.32, text)


def cell_image(c, box, path, inset=2 * mm):
    x, y, w, h = box
    draw_image_contained(c, path, x + inset, y + inset,
                         w - 2 * inset, h - 2 * inset)


# 2026-08-27 (2) per Tredoux: a cut tab must DROP INTO its slot, so the tab
# is smaller than the slot -- 2 mm of clearance on every side. The tab itself
# carries no printed border: the only lines on a cut sheet are the dashed
# guillotine lines, one single stroke per boundary, cut directly on. So the
# cut grid keeps the base grid's row/column COUNT but shrinks each cell by
# 2 * TAB_GAP in both axes, and is centred on the sheet. Base / working /
# control sheets are untouched -- solid rules, full-size slots.
TAB_GAP = 2 * mm


def tab_grid(col_w, row_h):
    """Base slot geometry -> cut-tab geometry (4 mm narrower and shorter).

    A5 (2026-09-10, per Tredoux) prints NO cut guides, so there is no dashed
    line to sit inside and no clearance to leave: a cut card there is the full
    44 x 32 slot, and this is the identity."""
    if is_a5():
        return list(col_w), row_h
    return [w - 2 * TAB_GAP for w in col_w], row_h - 2 * TAB_GAP


def instruction(c, y, text):
    if is_a5():
        return          # no instruction band on A5 -- the sheet is the work
    c.setFont('Label', fit(text, 'Label', 8, CW, floor=5.5, step=0.25))
    c.setFillColorRGB(*GREY)
    c.drawString(M, y, text)


def cut_note(n_rows, n_cols):
    return ('Cut on the dashed lines — %d straight cuts. Tabs sit 2 mm '
            'inside their slots.' % ((n_rows + 1) + (n_cols + 1)))


NO_CUT = 'Working sheet — do not cut. Cards laid here match the printed cells exactly.'
CONTROL = 'Control of error — do not cut. Same grid as the working sheet, filled in.'


def grid_top_of(ct):
    return ct - 7 * mm


def header_top():
    """The y header() returns, computed WITHOUT drawing -- it never depends on
    the title, only on the page preset, so a sheet's geometry can be probed
    before its page is started."""
    if is_a5():
        return PH - M + 7 * mm
    return PH - M - 15.5 * mm - 7 * mm


def fit_row_h(y_top, n, cap):
    return min(cap, (y_top - CONTENT_BOTTOM) / n)


def rows_per_page():
    """How many full-standard rows a sheet holds. A4 has always fitted every
    book it builds, so it keeps its single-page behaviour untouched; A5 holds
    six 32 mm rows in its 198 mm of content height."""
    if not is_a5():
        return MAX_ROWS
    return max(1, int((grid_top_of(header_top()) - CONTENT_BOTTOM) / ROW_H))


def page_chunks(rows):
    """`rows` split across as many sheets as the standard card needs.

    2026-09-10 per Tredoux: a card is NEVER shrunk below 44 x 32 to make a
    book fit -- a book with more rows than the sheet holds paginates instead.
    On A4 this is always a single chunk, so nothing about the A4 output moves.
    """
    cap = rows_per_page()
    if cap >= len(rows):
        return [rows]
    return [rows[i:i + cap] for i in range(0, len(rows), cap)]


# ---------------------------------------------------- work 1 & 2 geometry --
# 2026-08-29 per Tredoux: work 1 & 2 (picture match / sentence & picture
# match) now share the SAME card-sizing standard as work 3 & 4 (sentence
# builder) -- one picture-column width and one row-height cap for all four
# works, so no work's cards read as bigger or wastes more of the sheet than
# the others. PIC_W / ROW_H are the single canonical constants (see also
# their use in sb_metrics / sb_page below).
# 2026-09-10: PIC_W / ROW_H / SENT_W are now set by apply_page_preset() at the
# top of this file (the A5 preset keeps the very same 44 x 32 card), so they
# are NOT re-assigned here -- that would clobber the preset. Their values are
# unchanged on A4.


def sent_size(rows, w):
    return min(fit(r['text'], 'WordRg', 26, w - 2 * CELL_PAD, floor=11)
               for r in rows)


def pair_page(c, title, work_name, rows, instr, show_text, show_pic,
              cut=False, metrics_rows=None):
    """One row per sentence, two shared columns: [picture | sentence].
    (2026-08-31 per Tredoux: picture column moved to the LEFT for works 1 & 2,
    matching works 3 & 4 where the picture already leads the row. Nothing else
    about the layout changed.)
    Used for the working sheet, the control and the cut sheet alike.

    2026-09-10: this now draws exactly ONE sheet, for the rows it is given --
    a book too tall for the page is split into sheets by page_chunks() at the
    BUILDER level, so a working sheet and its own control stay adjacent and
    the duplex "control on the back" convention survives pagination.
    `metrics_rows` is the whole book, so the sentence size is measured once
    across every row and sheet 2's cards match sheet 1's. On A4 there is only
    ever one sheet and every number is the one this function always computed.
    """
    mrows = metrics_rows or rows
    ct = header(c, title, work_name)
    instruction(c, ct, instr)
    y_top = grid_top_of(ct)
    n = len(rows)
    row_h = fit_row_h(y_top, n, ROW_H)
    col_w = [PIC_W, SENT_W]
    if cut:
        col_w, row_h = tab_grid(col_w, row_h)
    x0 = M + (CW - sum(col_w)) / 2
    grid_lines(c, x0, y_top, col_w, row_h, n, dashed=cut)
    size = sent_size(mrows, col_w[1])
    for i, r in enumerate(rows):
        box_p = cell(x0, y_top, col_w, row_h, i, 0)
        box_t = cell(x0, y_top, col_w, row_h, i, 1)
        if show_text:
            cell_text(c, box_t, r['text'], size)
        if show_pic:
            cell_image(c, box_p, r['art'])
    footer(c, title, work_name)
    c.showPage()
    return row_h


# --------------------------------------------------------------- work 1 ---
def work1_cutsheet(c, title, work_name, rows, card_h):
    """Picture cards only, packed into as many shared columns as the sheet
    width allows -- cards stay exactly the size of the working-sheet slot."""
    ct = header(c, title, work_name + ' — cut sheet')
    y_top = grid_top_of(ct)
    ncols = max(1, min(len(rows), int(CW // PIC_W)))
    nrows = -(-len(rows) // ncols)
    col_w, tab_h = tab_grid([PIC_W] * ncols, card_h)
    x0 = M + (CW - sum(col_w)) / 2
    instruction(c, ct, cut_note(nrows, ncols))
    grid_lines(c, x0, y_top, col_w, tab_h, nrows, dashed=True)
    for i, r in enumerate(rows):
        cell_image(c, cell(x0, y_top, col_w, tab_h, i // ncols, i % ncols),
                   r['art'])
    footer(c, title, work_name)
    c.showPage()


def build_work1(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work1-picture-match.pdf' % slug)
    name = 'Work %d · Picture match' % WORK_DISPLAY_NUMBERS['work1']
    c = work_canvas(path, title, name)
    # Working sheet then ITS control, sheet by sheet, so the control still
    # prints on the back of the sheet it belongs to when a book paginates.
    row_h = None
    for chunk in page_chunks(rows):
        rh = pair_page(c, title, name, chunk, NO_CUT, True, False,
                       metrics_rows=rows)
        pair_page(c, title, name + ' — control of error', chunk, CONTROL,
                  True, True, metrics_rows=rows)
        row_h = row_h if row_h is not None else rh
    work1_cutsheet(c, title, name, rows, row_h)
    c.save()
    return path


# --------------------------------------------------------------- work 2 ---
def build_work2(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work2-sentence-picture-match.pdf' % slug)
    name = 'Work %d · Sentence & picture match' % WORK_DISPLAY_NUMBERS['work2']
    c = work_canvas(path, title, name)
    for chunk in page_chunks(rows):
        pair_page(c, title, name, chunk, NO_CUT, False, False,
                  metrics_rows=rows)
        pair_page(c, title, name + ' — control of error', chunk, CONTROL,
                  True, True, metrics_rows=rows)
    # cut sheet: identical grid, filled -- n+1 across, 3 down.
    for chunk in page_chunks(rows):
        pair_page(c, title, name + ' — cut sheet', chunk,
                  cut_note(len(rows), 2), True, True, cut=True,
                  metrics_rows=rows)
    c.save()
    return path


# ---------------------------------------------------- work 3 & 4 geometry --
def sb_metrics(rows):
    """One shared column per word position (plus the picture column), sized
    to the widest word in that position -- so every row's cells line up and
    a word card cut from the cut sheet drops exactly into its slot."""
    toks = [r['text'].split(' ') for r in rows]
    ncol = max(len(t) for t in toks)
    size = 22.0
    while True:
        word_w = []
        for j in range(ncol):
            w = max([stringWidth(t[j], 'WordRg', size)
                     for t in toks if j < len(t)] or [0])
            word_w.append(max(MIN_CELL, w + 2 * CELL_PAD))
        col_w = [PIC_W] + word_w
        if sum(col_w) <= CW or size <= 9:
            if is_a5():
                # 2026-09-10 per Tredoux: on A5 the PICTURE COLUMN IS FIXED at
                # the 44 mm standard -- only the word columns are refitted, to
                # whatever the remaining width allows. Scaling the whole grid
                # (the A4 arm below) would shrink the picture card too, and an
                # A5 work must share its picture cards with the A4 one.
                k = (CW - PIC_W) / sum(word_w)
                return size, [PIC_W] + [w * k for w in word_w]
            # stretch the grid to the full content width so the cut lines
            # run edge to edge and the cards are as large as the sheet allows
            k = CW / sum(col_w)
            return size, [w * k for w in col_w]
        size -= 0.5


def _norm_word(word):
    """Case- and punctuation-insensitive form used to compare word columns."""
    return re.sub(r'[^a-z0-9]', '', word.lower())


def changing_cols(rows):
    """WORK 3 RULE (2026-09-02, approved by Tredoux) -- in the guided
    sentence builder ONLY the word that CHANGES between rows is a cut-out
    piece. A word column is STATIC when every row has a word in that position
    and all of them are the same once case and punctuation are normalised
    (e.g. 'The' ... 'Sat!' in "The ___ Sat!"); every other column is a
    CHANGING column. Static words are printed black straight onto the working
    sheet in their own cells; the grey guide word stays under each changing
    cell, and the cut sheet carries the changing words only.
    Work 4 (free) is deliberately untouched -- every word stays a piece there.

    Returns the list of changing column indices (0-based word position). If a
    book has no changing column at all (e.g. a single row), every column is
    treated as changing so the work still has pieces to place."""
    toks = [r['text'].split(' ') for r in rows]
    ncol = max(len(t) for t in toks)
    out = []
    for j in range(ncol):
        vals = [_norm_word(t[j]) if j < len(t) else None for t in toks]
        if any(v is None for v in vals) or len(set(vals)) > 1:
            out.append(j)
    return out or list(range(ncol))


def word_pad(cell_w):
    """Sizing padding for a word tab: CELL_PAD where the cell can afford it,
    15% of the cell (never under 3 mm) on narrow, word-dense grids."""
    return max(3 * mm, min(CELL_PAD, 0.15 * cell_w))


def sb_word_size(toks, col_w, row_h):
    """The stretched columns are wider than the tightest fit, so grow the word
    back up until the widest word in each column nearly fills its cell.

    Clearance from the dashed cut line is what matters here, so the sizing
    padding is proportional on narrow cells: a word-dense sentence can end up
    with a 12 mm column, where demanding a flat CELL_PAD (5 mm) on both sides
    is impossible and the fit bottoms out on its floor -- leaving the widest
    word crowding, or crossing, the cut line. word_pad() asks for CELL_PAD
    where there is room and 15% of the cell (min 3 mm) where there is not, and
    the floor is low enough that the fit is actually reachable."""
    return min([fit(t[j], 'WordRg', 34,
                    col_w[j + 1] - 2 * word_pad(col_w[j + 1]),
                    floor=7, step=0.25)
                for t in toks for j in range(len(t))] + [row_h * 0.42])


def sb_page(c, title, work_name, rows, instr, show_words, show_pics,
            word_color=INK, cut=False, changing=None, blank_changing=False,
            metrics_rows=None):
    # 2026-09-10: ONE sheet, for the rows given -- pagination is done by the
    # builder (see pair_page's note). The column widths and the word size come
    # from `metrics_rows`, the whole book, so a word card cut for sheet 2 still
    # drops into its slot on sheet 1.
    mrows = metrics_rows or rows
    toks_all = [r['text'].split(' ') for r in mrows]
    ct = header(c, title, work_name)
    instruction(c, ct, instr)
    y_top = grid_top_of(ct)
    n = len(rows)
    size, col_w = sb_metrics(mrows)
    row_h = fit_row_h(y_top, n, ROW_H)
    if cut:
        col_w, row_h = tab_grid(col_w, row_h)
    size = sb_word_size(toks_all, col_w, row_h)
    x0 = M + (CW - sum(col_w)) / 2
    grid_lines(c, x0, y_top, col_w, row_h, n, dashed=cut)
    for i, r in enumerate(rows):
        if show_pics:
            cell_image(c, cell(x0, y_top, col_w, row_h, i, 0), r['art'])
        if show_words:
            for j, tok in enumerate(r['text'].split(' ')):
                # 2026-09-02: on a work 3 sheet `changing` marks the columns
                # whose word is a cut-out piece -- those keep the grey guide
                # colour, the static words print in normal ink.
                if blank_changing and changing is not None and j in changing:
                    continue          # v2: the slot stays empty (velcro)
                col = (word_color if changing is None or j in changing
                       else INK)
                cell_text(c, cell(x0, y_top, col_w, row_h, i, j + 1), tok,
                          size, col)
    footer(c, title, work_name)
    c.showPage()
    return len(col_w)


def sb_changing_cutsheet(c, title, work_name, rows, changing):
    """Work 3 cut sheet (2026-09-02): the pieces are the CHANGING words only.

    Tab widths and word size are taken from the same sb_metrics()/tab_grid()
    numbers the working sheet uses, so each tab still drops exactly into its
    slot with the standard 2 mm clearance. When there is a single changing
    column the tabs are packed across the sheet (same trick as
    work1_cutsheet) instead of leaving one narrow strip of paper."""
    n = len(rows)
    toks = [r['text'].split(' ') for r in rows]
    _size, base_col_w = sb_metrics(rows)
    # The card must match the WORKING SHEET's slot, so the row height is
    # measured against a full sheet's worth of rows -- not against `n`, which
    # on A5 may be more rows than one sheet holds (the working sheet
    # paginates; see page_chunks()).
    _probe_top = grid_top_of(header_top())
    base_row_h = fit_row_h(_probe_top, min(n, rows_per_page()), ROW_H)
    tab_col_w, tab_h = tab_grid(base_col_w, base_row_h)
    size = sb_word_size(toks, tab_col_w, tab_h)
    widths = [tab_col_w[j + 1] for j in changing]
    if len(changing) == 1:
        j = changing[0]
        words = [t[j] for t in toks if j < len(t)]
        w = widths[0]
        ncols = max(1, min(len(words), int(CW // w)))
        # prefer a column count that fills its last row exactly (6 words in a
        # 4-wide sheet reads better as 3 x 2 than as 4 + 2 with two blanks)
        ncols = next((k for k in range(ncols, 1, -1)
                      if len(words) % k == 0), ncols)
        nrows = -(-len(words) // ncols)
        col_w = [w] * ncols
        placed = [(p // ncols, p % ncols, t) for p, t in enumerate(words)]
    else:
        col_w = widths
        nrows = n
        placed = [(i, k, toks[i][j])
                  for i in range(n) for k, j in enumerate(changing)
                  if j < len(toks[i])]
    x0 = M + (CW - sum(col_w)) / 2
    # 2026-09-10: the tab block itself paginates when the sheet cannot hold
    # every tab row at the standard card height. On A4 `per` is always >= nrows
    # so this is the single page it has always been.
    per = max(1, int((grid_top_of(header_top()) - CONTENT_BOTTOM) / tab_h))
    for start in range(0, nrows, per):
        band = min(per, nrows - start)
        ct = header(c, title, work_name)
        y_top = grid_top_of(ct)
        instruction(c, ct, cut_note(nrows, len(col_w)))
        grid_lines(c, x0, y_top, col_w, tab_h, band, dashed=True)
        for i, k, tok in placed:
            if start <= i < start + band:
                cell_text(c, cell(x0, y_top, col_w, tab_h, i - start, k),
                          tok, size)
        footer(c, title, work_name)
        c.showPage()


def build_work3(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work3-sentence-builder-guided.pdf' % slug)
    name = 'Work %d · Sentence builder (guided)' % WORK_DISPLAY_NUMBERS['work3']
    c = work_canvas(path, title, name)
    # 2026-09-02 (approved by Tredoux) -- WORK 3 RULE (renumbered to Work 4, 2026-09-06): only the word that
    # CHANGES between rows is a cut-out piece (see changing_cols()). The
    # static words ("The", "Sat!") are printed in ink on the working sheet in
    # their own cells, the picture is printed as the cue, and the grey guide
    # word stays under each changing-word cell -- the word card, being exactly
    # slot-sized, covers that guide once placed correctly. The cut sheet
    # therefore carries the changing words only. Work 4 (free) is unchanged:
    # every word there is still a piece.
    changing = changing_cols(rows)
    for chunk in page_chunks(rows):
        sb_page(c, title, name,
                chunk, 'Working sheet — do not cut. Lay each word card on its '
                'grey guide word; a correct card covers it exactly.',
                True, True, GUIDE, changing=changing, metrics_rows=rows)
    sb_changing_cutsheet(c, title, name + ' — cut sheet', rows, changing)
    c.save()
    return path


def build_work3_v2(slug, title, rows, out_dir):
    path = os.path.join(out_dir,
                        '%s-work3-sentence-builder-guided-v2.pdf' % slug)
    name = 'Work %d v2 · Sentence builder (guided, control on back)' % WORK_DISPLAY_NUMBERS['work3']
    c = work_canvas(path, title, name)
    # 2026-09-05 (approved by Tredoux) -- v2 (renumbered to Work 4 v2, 2026-09-06): same working sheet as v1 but the
    # changing-word slot is left BLANK (the cards go on with velcro, so a
    # guide word underneath is never seen), and page 2 is the control of
    # error printed on the back, exactly like works 1, 2 and 4. The cut sheet
    # is identical to v1's.
    changing = changing_cols(rows)
    for chunk in page_chunks(rows):
        sb_page(c, title, name,
                chunk, 'Working sheet — do not cut. Read the picture, then '
                'place the word card in the empty slot. Turn over to check.',
                True, True, changing=changing, blank_changing=True,
                metrics_rows=rows)
        sb_page(c, title, name + ' — control of error', chunk, CONTROL,
                True, True, metrics_rows=rows)
    sb_changing_cutsheet(c, title, name + ' — cut sheet', rows, changing)
    c.save()
    return path


def build_work4(slug, title, rows, out_dir):
    path = os.path.join(out_dir, '%s-work4-sentence-builder-free.pdf' % slug)
    name = 'Work %d · Sentence builder (free)' % WORK_DISPLAY_NUMBERS['work4']
    c = work_canvas(path, title, name)
    ncol = 0
    for chunk in page_chunks(rows):
        ncol = sb_page(c, title, name, chunk, NO_CUT, False, False,
                       metrics_rows=rows)
        sb_page(c, title, name + ' — control of error', chunk, CONTROL,
                True, True, metrics_rows=rows)
    for chunk in page_chunks(rows):
        sb_page(c, title, name + ' — cut sheet', chunk,
                cut_note(len(rows), ncol), True, True, cut=True,
                metrics_rows=rows)
    c.save()
    return path


# --------------------------------------------------------------- work 0 ---
# 2026-09-02 (approved by Tredoux) -- CHARACTERS STRIP, the preliminary work
# for the book. Physical picture: the book sits on a tray; to its left lies a
# narrow vertical strip of card printed with blank bordered boxes, one per
# character, top to bottom in first-appearance order. On the BACK of the same
# strip is the control -- the same boxes with the characters printed in them.
# The child reads a page with the teacher and drops that character (a
# 3D-printed figure, or a picture tab cut from page 3) into the next box.
#
# Geometry: the strip is CHAR_STRIP_W = 65 mm wide so it sits beside an A5
# book on a tray, and its boxes are sized so every character fits on ONE A4
# page -- box height is capped at CHAR_BOX_MAX_H and shrunk to fit otherwise.
# More than CHAR_MAX_ROWS characters and the strip runs in two 65 mm columns
# side by side (130 mm, still tray-width).
#
# Page 1 = strip FRONT (blank boxes, tiny title label, dashed cut outline).
# Page 2 = strip BACK, column order MIRRORED so a duplex print lands the
#          control boxes exactly behind their blanks (the strip block is
#          centred on the page, so the vertical axis needs no other shift).
# Page 3 = cut sheet of the character picture tabs, one per box, TAB_GAP
#          (2 mm) smaller on every side so a tab drops into its box.
CHAR_STRIP_W = 65 * mm
CHAR_BOX_MAX_H = 45 * mm
CHAR_BOX_MIN_H = 18 * mm
CHAR_LABEL_BAND = 8 * mm
CHAR_CUT_PAD = 3 * mm

# ------------------------------------------------------- who is a character
# 2026-09-08 fix (Tredoux): the strip was taking EVERY spread's art, so the
# setting picture ("A pit.") stood in the cast and the-pit printed 7 boxes in
# a 2-column block. A character is a CAST MEMBER WHO TAKES A TURN ON A STORY
# PAGE -- never the target/setting word, never the recap chant, never the gag
# figure. The canonical spec is charactersForBook() in
# lib/montree/dark-phonics/v2-shelf/works.ts:
#   * order = first appearance; a character who appears twice gets ONE box;
#   * the chant page is excluded ("no lead-in, and its art is a cast member
#     already counted");
#   * the potato page is excluded -- "the figure on it is the joke, not a
#     character to place". POTATO (and the crew page that follows it in
#     the-kit / the-sad) is therefore NOT a character, in every book.
#
# THE RULE, one sentence: a page carries a character when it has BOTH a
# lead-in and a reveal, and the SUBJECT of its printed line -- the first word
# of the lead-in that is not an article, a connective or a size adjective,
# falling back to the reveal when the lead-in has no such word ("A tall… /
# turtle!") -- is a real cast noun, i.e. not the book's own target word and
# not a gag figure.
#
# EASY READERS are not pattern storybooks: their five pages are one continuous
# scene, so "every page is a turn" does not hold. The RECURRENCE rule covers
# them without a special case -- when any subject heads two or more pages the
# book has a protagonist rather than a cast taking turns, so only the
# recurring subjects are kept and the one-off verb or prop ("Tip-top cats!",
# "Fix the box, fox!") drops out. In a pattern book every subject appears
# once, so nothing is dropped.
ARTICLES = {'a', 'an', 'the'}
LEAD_CONNECTIVES = {'and', 'now', 'but', 'so', 'then', 'oh', 'off', 'all'}
LEAD_ADJECTIVES = {'big', 'little', 'small', 'tall', 'red', 'whole', 'old',
                   'new', 'bad', 'six', 'five', 'my'}
# The gag figure(s): the joke at the end of a pattern book, never a character.
GAG_FIGURES = {'potato', 'crew'}
NOT_A_NAME = {'is', 'are', 'was', 'it', 'in', 'on', 'at', 'of', 'to', 'up',
              'not', 'can', 'has', 'had', 'have', 'did', 'do', 'does', 'no',
              'me', 'i', 'if', 'be',
              # the negation that opens a second-language gag page
              # ("Didn't chase the… rat!") -- a verb, never a character
              "didn't", "don't", "doesn't", "isn't", "won't", "can't",
              "wasn't", "hasn't", "aren't"}
# Books the derived rule reads wrongly, named by hand (2026-09-08 audit,
# approved by Tredoux). All five are EASY READERS, where the printed line
# names the action or the setting and the CHARACTER is only in the picture --
# the manifest's own art prompts are the evidence:
#   big-splash        every page draws "the plump grey-and-white cat"; the
#                     subject word is the splash it makes
#   jump-in-the-sand  every page draws "the small golden-brown floppy-eared
#                     puppy"; the subject word is its jump
#   this-and-that     every page draws the SAME "fuzzy grey-brown moth"; this
#                     and that are pointing words, not characters
#   mud-pup           the pup is the character; mud is a substance
# slug -> the cast, in first-appearance order. Each name is matched to the
# first page that prints it (or whose art file names it), so a character the
# words only reach on the last page still gets that page's picture.
CHARACTER_OVERRIDES = {
    'big-splash': ['cat'],
    'jump-in-the-sand': ['pup'],
    'this-and-that': ['moth'],
    'mud-pup': ['pup'],
}

# 2026-09-08: fox-in-a-box is TWO books under one slug. The reader the child
# actually holds beside the strip is the pattern reader
# (scripts/curriculum/satpin-paperwork/letters/dp-fox-in-a-box.json, shipped
# as public/dark-phonics-books/print/fox-in-a-box-A5-reading.pdf: "A fox in a
# box. / An ox in a box. / A xylophone in a box."), NOT the five-page easy
# reader in easy-readers-manifest-v2.json that load_book() finds first. The
# strip must match the printed reader, so work0 -- and only work0 -- reads its
# pages from the dp file. Works 1-5 still build from the manifest: that source
# mismatch is PRE-EXISTING and is flagged, not fixed here.
CHARACTER_PAGE_SOURCE = {'fox-in-a-box': 'dp-fox-in-a-box'}

def _words(text):
    return _WORD_RE.findall(_strip_ellipsis(text or ''))


def _norm(word):
    w = (word or '').lower().replace(u'\u2019', "'")
    return w[:-1] if len(w) > 3 and w.endswith('s') else w


def _subject(lead, reveal):
    """(name, came_from_lead) -- the subject noun of one printed line."""
    for source, from_lead in ((lead, True), (reveal, False)):
        for w in _words(source):
            lw = w.lower()
            if lw in ARTICLES or lw in LEAD_CONNECTIVES or lw in LEAD_ADJECTIVES:
                continue
            return lw, from_lead
    return None, False


def character_pages(slug, pages):
    """The pages the STRIP walks -- normally the book's own, but see
    CHARACTER_PAGE_SOURCE for the one slug that carries two books."""
    stem = CHARACTER_PAGE_SOURCE.get(slug)
    if not stem:
        return pages
    path = os.path.join(DP_LETTERS_DIR, '%s.json' % stem)
    with open(path) as f:
        cfg = json.load(f)
    if fw.is_second(TRACK):
        cfg = fw.sync_dp_cfg(cfg)
    art_dir = os.path.join(REPO, cfg['artDir'])
    out = []
    for q in sorted(cfg['pages'], key=lambda x: x['order']):
        art = os.path.join(art_dir, q['art'])
        if not os.path.exists(art):
            raise FileNotFoundError('cannot resolve art path: %r' % art)
        out.append(page_entry(q['sentence'], art))
    return out


def _override_art(name, pages):
    """The page that introduces an overridden character: the first page whose
    printed line names it, else the first whose art file names it."""
    for pg in pages:
        if pg['chant']:
            continue
        if name in {w.lower() for w in _words(pg['lead'] + ' ' + pg['reveal'])}:
            return pg['art']
    for pg in pages:
        base = os.path.basename(pg['art'] or '').rsplit('.', 1)[0]
        if name in {w.lower() for w in _words(base.replace('-', ' '))}:
            return pg['art']
    return None


def characters_of(slug, pages, source='letter-book'):
    """The book's cast, in first-appearance order: [{'name', 'art'}]."""
    pages = character_pages(slug, pages)
    if slug in CHARACTER_OVERRIDES:
        want = list(CHARACTER_OVERRIDES[slug])
        out = []
        for name in want:
            art = _override_art(name, pages)
            if art is None:
                raise SystemExit('%s: override character %r appears on no '
                                  'page' % (slug, name))
            out.append({'name': name, 'art': art})
        return out
    else:
        want = None
    reader = (source == 'easy-reader')
    targets = set()
    if not reader:
        for pg in pages:
            if not pg['chant']:
                targets.update(_norm(w) for w in _words(pg['reveal']))
    ordered, counts = [], {}
    for pg in pages:
        if pg['chant']:
            continue
        # the potato / crew gag page -- the joke, not a character to place.
        # Checked on BOTH the printed lead-in and the art file's own name,
        # because the second-language rewording drops the word itself
        # ("Didn't chase the… rat!" on p8-potato.png).
        art_words = {w.lower() for w in
                     _words(os.path.basename(pg['art'] or '').rsplit('.', 1)[0]
                            .replace('-', ' ').replace('_', ' '))}
        if 'recap' in art_words:
            continue
        if ({w.lower() for w in _words(pg['lead'])} | art_words) & GAG_FIGURES:
            continue
        if not reader and not (pg['lead'].strip() and pg['reveal'].strip()):
            # scene-setter ("A pit.", "A basin.") or cliffhanger ("And the…?!")
            continue
        name, from_lead = _subject(pg['lead'], pg['reveal'])
        if not name or name in NOT_A_NAME or name in GAG_FIGURES:
            continue
        if from_lead and not reader and _norm(name) in targets:
            # the line names the book's own target/setting word, not a cast
            # member ("A pit." -> pit, "The bug saw a… potato!" -> bug)
            continue
        ordered.append((name, pg['art']))
        counts[name] = counts.get(name, 0) + 1
    if want is not None:
        keep = set(want)
    elif any(k >= 2 for k in counts.values()):
        keep = {n for n, k in counts.items() if k >= 2}
    else:
        keep = set(counts)
    out, seen = [], set()
    for name, art in ordered:
        if name in keep and name not in seen:
            seen.add(name)
            out.append({'name': name, 'art': art})
    if want is not None:
        rank = {n: i for i, n in enumerate(want)}
        out.sort(key=lambda ch: rank.get(ch['name'], 99))
    if slug in PORTRAIT_BOOKS:
        for ch in out:
            ch['art'] = portrait_path(ch['name']) or ch['art']
    return out


def char_grid(n, y_top):
    """Strip geometry: ONE column, always -- the material is a single thin
    strip of boxes that stands beside the open book (never a block of
    columns). (n_cols, n_rows, col_w, box_h, x0)."""
    nrows = max(1, n)
    usable = (y_top - CONTENT_BOTTOM) - CHAR_LABEL_BAND - CHAR_CUT_PAD
    box_h = max(CHAR_BOX_MIN_H, min(CHAR_BOX_MAX_H, usable / nrows))
    col_w = [CHAR_STRIP_W]
    x0 = M + (CW - CHAR_STRIP_W) / 2
    return 1, nrows, col_w, box_h, x0


def char_strip_page(c, title, work_name, cast, instr, filled, mirror=False):
    ct = header(c, title, work_name)
    instruction(c, ct, instr)
    # The strip's cut outline stands CHAR_CUT_PAD proud of the label band, so
    # on A5 -- where the grid top IS the margin -- the whole block drops by
    # that pad, otherwise the outline would run through the caption line.
    gtop = grid_top_of(ct) - (CHAR_CUT_PAD if is_a5() else 0)
    y_top = gtop - CHAR_LABEL_BAND
    ncols, nrows, col_w, box_h, x0 = char_grid(len(cast), gtop)
    # the strip's own printed label, inside the cut outline, so the cut strip
    # still says which book it belongs to
    lab = fit(title, 'Label', 7.5, sum(col_w) - 4 * mm, floor=5)
    c.setFont('Label', lab)
    c.setFillColorRGB(*GREY)
    c.drawCentredString(x0 + sum(col_w) / 2, y_top + 2.6 * mm, title.upper())
    # dashed cut outline around the whole strip (label band included)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.6)
    if not is_a5():
        c.setDash(3, 2.4)   # A5 prints no cut guides -- see grid_lines()
    c.rect(x0 - CHAR_CUT_PAD, y_top - nrows * box_h - CHAR_CUT_PAD,
           sum(col_w) + 2 * CHAR_CUT_PAD,
           nrows * box_h + CHAR_LABEL_BAND + 2 * CHAR_CUT_PAD,
           stroke=1, fill=0)
    c.setDash()
    grid_lines(c, x0, y_top, col_w, box_h, nrows)
    # ONE column, so `mirror` (the duplex flip) is a no-op on the horizontal
    # axis: the strip is centred on the sheet, so the back lands exactly
    # behind the front. The flag is kept so the intent stays readable.
    for i, ch in enumerate(cast):
        if not filled:
            continue
        box = cell(x0, y_top, col_w, box_h, i, 0)
        cell_image(c, (box[0], box[1] + 4.5 * mm, box[2], box[3] - 4.5 * mm),
                   ch['art'], inset=3 * mm)
        # the control prints the character's NAME under its picture -- what
        # the teacher reads back, and what makes the back a control of error
        c.setFont('Label', 7.5)
        c.setFillColorRGB(*GREY)
        c.drawCentredString(box[0] + box[2] / 2, box[1] + 2.2 * mm,
                            ch['name'].upper())
    footer(c, title, work_name)
    c.showPage()
    return ncols, nrows, col_w, box_h


def char_cutsheet(c, title, work_name, cast, col_w, box_h):
    ct = header(c, title, work_name)
    y_top = grid_top_of(ct)
    ncols = max(1, min(len(cast), int(CW // col_w[0])))
    nrows = -(-len(cast) // ncols)
    tab_w, tab_h = tab_grid([col_w[0]] * ncols, box_h)
    x0 = M + (CW - sum(tab_w)) / 2
    instruction(c, ct, cut_note(nrows, ncols))
    grid_lines(c, x0, y_top, tab_w, tab_h, nrows, dashed=True)
    for p, ch in enumerate(cast):
        cell_image(c, cell(x0, y_top, tab_w, tab_h, p // ncols, p % ncols),
                   ch['art'], inset=1.5 * mm)
    footer(c, title, work_name)
    c.showPage()


def build_work0(slug, title, pages, source, out_dir):
    path = os.path.join(out_dir, '%s-work0-characters.pdf' % slug)
    cast = characters_of(slug, pages, source)
    if not cast:
        raise SystemExit('%s: no characters derived -- refusing to write an '
                          'empty strip' % slug)
    name = 'Work %d · Characters' % WORK_DISPLAY_NUMBERS['work0']
    c = work_canvas(path, title, name)
    _n, _r, col_w, box_h = char_strip_page(
        c, title, name, cast,
        'Strip — front. Cut on the dashed outline. Read a page together, '
        'then place that character in the next box, top to bottom.',
        filled=False)
    char_strip_page(
        c, title, name + ' — control of error', cast,
        'Strip — back. Print on the back of the front strip (duplex): the '
        'same boxes, filled in book order.',
        filled=True, mirror=True)
    char_cutsheet(c, title, name + ' — cut sheet', cast, col_w, box_h)
    c.save()
    print('    CAST[%d]: %s' % (len(cast),
                                ', '.join(ch['name'] for ch in cast)))
    return path


# --------------------------------------------------------------- driver ---
def build_slug(slug):
    result = load_book(slug)
    if result is None:
        print('[SKIP] %s -- no book found (checked easy-readers manifest '
              'and books_def.BOOKS)' % slug)
        return
    title, rows, flags, source, pages = result
    if not rows:
        print('[SKIP] %s -- source=%s found but yielded 0 rows' % (slug, source))
        return
    out_dir = os.path.join(out_root(), slug)
    os.makedirs(out_dir, exist_ok=True)
    if ONLY_WORK0:
        print('[OK] %s (%s) -- title=%r  [work0 only]' % (slug, source, title))
        print('    -> %s' % build_work0(slug, title, pages, source, out_dir))
        return
    paths = [build_work0(slug, title, pages, source, out_dir),
             build_work1(slug, title, rows, out_dir),
             build_work2(slug, title, rows, out_dir),
             build_work3(slug, title, rows, out_dir),
             build_work3_v2(slug, title, rows, out_dir),
             build_work4(slug, title, rows, out_dir)]
    print('[OK] %s (%s) -- title=%r rows=%d' % (slug, source, title, len(rows)))
    for r in rows:
        print('    - %s' % r['text'])
    for fl in flags:
        print('    FLAG: %s' % fl)
    for pth, note in sorted(set(_PREP_NOTES)):
        print('    PREP: %s -- %s' % (os.path.basename(pth), note))
    del _PREP_NOTES[:]
    for p in paths:
        print('    -> %s' % p)


ONLY_WORK0 = False


def main():
    global ONLY_WORK0
    # The page preset is applied BEFORE anything is built, so every geometry
    # global is already the right one by the time a canvas is opened.
    apply_page_preset(page_key())
    argv = strip_page_args(fw.strip_track_args(sys.argv[1:]))
    ONLY_WORK0 = any(a in ('--work0', '--only-work0', '--characters')
                     for a in argv)
    slugs = [s for s in argv if not s.startswith('-')]
    if not slugs:
        raise SystemExit('usage: python3 build_book_works.py [--page a5] '
                         '[--track second-language] <slug> [<slug> ...]')
    print('=== book works: page=%s track=%s -> %s'
          % (PAGE, TRACK, out_root()))
    for slug in slugs:
        build_slug(slug)


if __name__ == '__main__':
    main()
