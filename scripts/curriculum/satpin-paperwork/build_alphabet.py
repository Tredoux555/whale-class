# -*- coding: utf-8 -*-
"""Montree Phonics — the Alphabet Series (A4 portrait, one page per sentence).

Five short decodable sentences that between them use every letter a-z, each
with its own real-photo scene. Unlike everything else in this pipeline the
Alphabet Series is not a SATPIN week and not a letter: it is one standalone
material, so it builds into ONE combined 5-page PDF filed in its own folder
(`public/satpin-materials/alphabet-series/alphabet-series.pdf`) rather than
into a per-letter slug folder.

Per Tredoux's spec each sentence gets exactly one page, three zones:

    BUILD IT     the sentence builder — one empty box per word, in reading
                 order, wrapped over as many rows as it takes. The child
                 rebuilds the sentence here from the cut-out tiles. Boxes are
                 deliberately a little larger than the tiles (38 x 20 mm vs
                 34 x 16 mm) so pasting is forgiving for small hands, and all
                 boxes are the same size so any tile fits any box — the child
                 has to *read*, not match an outline.

    TRACE IT     the same sentence, dotted skeleton + numbered red/blue
                 stroke-order arrows (sf.draw_traced) on the locked 3-line
                 guide (dotted headline / dashed midline / solid baseline,
                 12.5 mm x-height) — byte-identical conventions to
                 build_tracing.py and build_cvc.py, so the shapes a child
                 builds and the shapes a child writes are the same shapes.

    CUT IT OUT   below a dashed cut line with a scissor mark: the scene photo
                 as its own cut-out tab (60 x 40 mm, the visual anchor) on the
                 left, and to its right the word tiles printed solid in a
                 FIXED scrambled order read from `alphabet_series.json` — no
                 randomness at runtime, a reprint always cuts out identically.

Design note (deliberate, on the record): the build strip has no paste target
for the photo. The three things that are non-negotiable on this page — the
locked 12.5 mm tracing x-height (2 writing lines = 80 mm), word boxes big
enough for small hands, and a photo tab big enough to matter — already spend
~196 mm of the 223 mm of usable page. A photo paste box would cost another
~49 mm and force either a shrunken tracing line or dolls-house tiles. So the
photo tab is the anchor card: cut the tabs, look at the picture, build the
sentence in the boxes, trace the sentence. That is exactly the walkthrough
Tredoux described, and it keeps the page calm.

    python3 build_alphabet.py --all
    python3 build_alphabet.py --page 5
    python3 build_alphabet.py --all --art-dir /tmp/placeholder-art --out-dir /tmp/out

Fonts resolve from MONTREE_CANVAS_FONTS (default: the canvas-design skill
folder, same as every other builder in this pipeline). Letterforms, stroke
order and arrows all come from `stroke_font.py`.
"""
import argparse
import json
import math
import os
import string
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stroke_font as sf                                          # noqa: E402

# ---------------------------------------------------------------- fonts ----
F = os.environ.get('MONTREE_CANVAS_FONTS',
                   '/root/.claude/skills/canvas-design/canvas-fonts/')
if not F.endswith('/'):
    F += '/'
pdfmetrics.registerFont(TTFont('Title',  F + 'YoungSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Word',   F + 'Outfit-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Nar',    F + 'Lora-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Label',  F + 'WorkSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LabelB', F + 'WorkSans-Bold.ttf'))

# ----------------------------------------------------------------- inks ----
INK   = (0, 0, 0)
RED   = (0.776, 0.157, 0.157)
GREY  = (0, 0, 0)
FAINT = (0, 0, 0)
HAIR  = (0, 0, 0)
SLOT  = (0, 0, 0)
BOXED = (0, 0, 0)          # the empty build boxes: quieter than tiles

# ------------------------------------------------------------- geometry ---
PW, PH = A4                          # 210 x 297 mm — same page as every other
M = 14 * mm                          # SATPIN paperwork sheet
CW = PW - 2 * M                      # 182 mm of content width

HEAD_RULE_Y = PH - M - 33 * mm       # hairline that closes the header chrome
FOOT_RULE_Y = M + 8 * mm             # hairline that opens the footer
TOP_CONTENT = HEAD_RULE_Y - 4.5 * mm  # first section label sits BELOW the rule
BOT_CONTENT = FOOT_RULE_Y + 2 * mm
USABLE = TOP_CONTENT - BOT_CONTENT   # 221.5 mm

LABEL_GAP  = 7.0 * mm                # section label baseline -> zone content

# ---- build strip -----------------------------------------------------------
BOX_W, BOX_H = 38 * mm, 19 * mm      # empty word boxes: > tile, forgiving
BOX_GAP      = 5 * mm
BOX_ROW_GAP  = 4 * mm

# ---- trace zone ------------------------------------------------------------
TRACE_U     = 12.5 * mm              # locked trace-it x-height (build_tracing)
TRACE_GAP   = 5 * mm                 # air between two writing lines
TRACE_TRACK = 0.12
TRACE_INSET = 4 * mm                 # left inset of the dotted sentence inside
                                     # the guide rules: the stroke-order arrow
                                     # on a first stroke that starts at the top
                                     # left (w, v, y...) reaches up to 3 mm back
                                     # from the ink, and must not fall off the
                                     # 14 mm page margin
TRACE_DESC  = 0.8                    # descender band reserved below the LAST
                                     # baseline, in x-heights. A full 1.0u is
                                     # reserved *between* writing lines, but
                                     # below the final one only g/j/q/y reach
                                     # down and the zone gap that follows is
                                     # never less than ZONE_GAP_MIN, so the
                                     # last 0.2u of descender is allowed to
                                     # borrow from that gap instead of being
                                     # paid for twice.

# ---- cut strip -------------------------------------------------------------
CUT_RULE_GAP  = 5.0 * mm             # section label -> the dashed cut line
CUT_BAND_GAP  = 7.0 * mm             # the cut line -> the tabs
PIC_W, PIC_H  = 60 * mm, 40 * mm     # the photo tab (3:2, big enough to matter)
PIC_GAP       = 10 * mm              # photo tab -> word tile block
TILE_H        = 15 * mm              # word tile: >= 14 mm tall for small hands
TILE_GAP      = 5 * mm
TILE_ROW_GAP  = 4 * mm
TILE_PAD      = 3.6 * mm             # ink padding inside a tile, each side
TILE_U_MAX    = 5.4 * mm             # tile x-height ceiling
TAB_CAPTION   = 4.5 * mm             # the tiny grey caption under the photo tab

ZONE_GAP_MIN, ZONE_GAP_MAX = 7 * mm, 16 * mm


# --------------------------------------------------------- repo plumbing ---
def default_repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', '..'))


def load_series():
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'alphabet_series.json')) as fh:
        return json.load(fh)


def validate(cfg):
    """Every guarantee this material makes, checked before a single page is
    drawn: alphabet coverage, and a scramble per page that is a real, honest
    shuffle."""
    seen = set()
    for p in cfg['pages']:
        words = p['sentence'].split(' ')
        n = len(words)
        order = p['scramble']
        if sorted(order) != list(range(n)):
            raise SystemExit('page %d: scramble %r is not a permutation of the '
                             '%d words' % (p['seq'], order, n))
        tiles = [words[i] for i in order]
        if sorted(tiles) != sorted(words):
            raise SystemExit('page %d: tile set != sentence word multiset'
                             % p['seq'])
        if tiles == words:
            raise SystemExit('page %d: scramble is the sentence order' % p['seq'])
        if tiles == words[::-1]:
            raise SystemExit('page %d: scramble is the plain reverse — pick a '
                             'genuine shuffle' % p['seq'])
        same = [i for i in range(n) if tiles[i] == words[i]]
        if same:
            raise SystemExit('page %d: tile %s shows the same word the sentence '
                             'has in that slot — the child could build it '
                             'without reading' % (p['seq'], same))
        seen |= set(ch for ch in p['sentence'] if ch in string.ascii_lowercase)
    missing = sorted(set(string.ascii_lowercase) - seen)
    if missing:
        raise SystemExit('the five sentences do not cover the alphabet — '
                         'missing: %s' % ''.join(missing))


def resolve_art(cfg, repo_root, art_dir_override):
    base = (os.path.abspath(art_dir_override) if art_dir_override
            else os.path.join(repo_root, *cfg['art_dir'].split('/')))
    for p in cfg['pages']:
        p['art_path'] = os.path.join(base, p['art'])
    return base


# --------------------------------------------------------------- helpers ---
# (copy-adapted from build_cvc.py / build_tracing.py — the builders in this
# pipeline each carry their own copy of the chrome helpers on purpose, so one
# sheet's tweak can never silently redraw another sheet.)
def tracked(c, x, y, text, font, size, tracking, color, align='left'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    total = c.stringWidth(text, font, size) + tracking * size * (len(text) - 1)
    cx = {'left': x, 'center': x - total / 2, 'right': x - total}[align]
    for ch in text:
        c.drawString(cx, y, ch)
        cx += c.stringWidth(ch, font, size) + tracking * size


def hairline(c, x1, y, x2, color=HAIR, width=0.5):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setDash()
    c.line(x1, y, x2, y)


def draw_image_contained(c, path, x, y, w, h, frame=False):
    img = ImageReader(path)
    iw, ih = img.getSize()
    ar = ih / iw
    dw, dh = w, w * ar
    if dh > h:
        dh, dw = h, h / ar
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(img, dx, dy, dw, dh, mask='auto')
    if frame:
        c.setStrokeColorRGB(*HAIR)
        c.setLineWidth(0.5)
        c.setDash()
        c.rect(dx, dy, dw, dh, stroke=1, fill=0)
    return dx, dy, dw, dh


def guidelines(c, x0, x1, base, u):
    """Three-line school paper: dotted headline, dashed midline, solid
    baseline — identical to build_tracing.py's trace-it guide."""
    c.setLineWidth(0.6)
    c.setStrokeColorRGB(0, 0, 0)
    c.setDash(0.9, 2.6)
    c.line(x0, base + 2 * u, x1, base + 2 * u)
    c.setStrokeColorRGB(0, 0, 0)
    c.setDash(3.2, 3.2)
    c.line(x0, base + u, x1, base + u)
    c.setDash()
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.9)
    c.line(x0, base, x1, base)


def section_label(c, x, y, text):
    tracked(c, x, y, ' '.join(text.upper()), 'LabelB', 6.6, 0.10, FAINT)


def dashed_box(c, x, y, w, h, color=SLOT, corner=2.0 * mm, width=0.9):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(width)
    c.setDash(2.4, 2.4)
    c.roundRect(x, y, w, h, corner, stroke=1, fill=0)
    c.setDash()


def scissors_mark(c, cx, cy, s, color=GREY):
    """A small pair of open scissor blades: two crossed strokes from a shared
    pivot with a ring 'handle' on each — the same abstract cut-here glyph
    build_cvc.py uses, so no font has to ship a scissors character."""
    c.setStrokeColorRGB(*color)
    c.setLineWidth(0.9)
    c.setLineCap(1)
    c.line(cx, cy, cx - s * 0.55, cy + s * 0.75)
    c.line(cx, cy, cx - s * 0.55, cy - s * 0.75)
    c.setFillColorRGB(1, 1, 1)
    for dy in (0.75, -0.75):
        c.circle(cx - s * 0.55, cy + s * dy, s * 0.16, stroke=1, fill=1)


def chunk_balanced(items, cap):
    """Split `items` into the fewest rows of at most `cap`, as evenly as the
    count allows — 7 tiles at 3 a row read 3/2/2, never 3/3/1."""
    n = len(items)
    rows = max(1, int(math.ceil(n / float(cap))))
    base, extra = divmod(n, rows)
    out, i = [], 0
    for r in range(rows):
        k = base + (1 if r < extra else 0)
        out.append(items[i:i + k])
        i += k
    return out


# ------------------------------------------------------------------ page ---
def page_chrome(c, page, total):
    tracked(c, M, PH - M - 5 * mm, 'M O N T R E E   P H O N I C S',
            'Label', 8.5, 0.28, GREY, align='left')

    bx, by, br = PW - M - 8 * mm, PH - M - 10 * mm, 8 * mm
    c.setStrokeColorRGB(*RED)
    c.setLineWidth(0.9)
    c.circle(bx, by, br, stroke=1, fill=0)
    c.setFont('Word', 14)
    c.setFillColorRGB(*RED)
    c.drawCentredString(bx, by - 4.4, 'abc')
    tracked(c, bx, by - br - 5 * mm, '%d OF %d' % (page['seq'], total),
            'Label', 6.5, 0.24, FAINT, align='center')

    c.setFont('Title', 19)
    c.setFillColorRGB(*INK)
    c.drawString(M, PH - M - 19 * mm, 'Alphabet series')
    tw = c.stringWidth('Alphabet series', 'Title', 19)
    c.setFillColorRGB(*RED)
    c.circle(M + tw + 3.4 * mm, PH - M - 19 * mm + 2.2 * mm, 1.15 * mm,
             stroke=0, fill=1)

    c.setFont('Nar', 10.5)
    c.setFillColorRGB(*GREY)
    c.drawString(M, PH - M - 27.5 * mm + 1.2 * mm,
                 'Cut out the tabs. Look at the picture. Build the sentence. '
                 'Then trace it.')

    hairline(c, M, HEAD_RULE_Y, PW - M)
    hairline(c, M, FOOT_RULE_Y, PW - M)
    c.setFont('Label', 7)
    c.setFillColorRGB(*FAINT)
    c.drawString(M, M + 3.4 * mm, 'Montree Phonics  ·  Alphabet series  ·  '
                 '"%s"' % page['sentence'])
    c.drawRightString(PW - M, M + 3.4 * mm, 'page %d of %d'
                      % (page['seq'], total))


# ------------------------------------------------------------ zone: build --
def build_rows(words):
    cap = max(1, int((CW + BOX_GAP) // (BOX_W + BOX_GAP)))
    return chunk_balanced(list(words), cap)


def build_zone_h(words):
    rows = build_rows(words)
    return LABEL_GAP + len(rows) * BOX_H + (len(rows) - 1) * BOX_ROW_GAP


def draw_build_it(c, zone_top, words):
    section_label(c, M, zone_top, 'build it')
    rows = build_rows(words)
    y = zone_top - LABEL_GAP - BOX_H
    for row in rows:
        total_w = len(row) * BOX_W + (len(row) - 1) * BOX_GAP
        x = PW / 2 - total_w / 2
        for _ in row:
            dashed_box(c, x, y, BOX_W, BOX_H, color=BOXED, width=0.8)
            x += BOX_W + BOX_GAP
        y -= BOX_H + BOX_ROW_GAP


# ------------------------------------------------------------ zone: trace --
TRACE_W = CW - 2 * TRACE_INSET       # widest a dotted writing line may be


def series_trace_u(cfg):
    """ONE tracing x-height for the whole material: the sentence that needs the
    most room sets it, so a child meets the same size letterforms on every page
    (12.5 mm is the pipeline's ceiling, never a floor — fit_wrap only ever
    comes down from it, and only ever by a hair here)."""
    return min(sf.fit_wrap(p['sentence'], TRACE_W, TRACE_U, maxlines=2,
                           tracking=TRACE_TRACK)[0] for p in cfg['pages'])


def trace_rows(sentence, u):
    return sf.wrap(sentence, u, TRACE_W, TRACE_TRACK, 2) or [sentence]


def trace_zone_h(sentence, u):
    n = len(trace_rows(sentence, u))
    return (LABEL_GAP + (n - 1) * (3 * u + TRACE_GAP)
            + (2 + TRACE_DESC) * u)


def draw_trace_it(c, zone_top, sentence, u):
    section_label(c, M, zone_top, 'trace it')
    rows = trace_rows(sentence, u)
    base = zone_top - LABEL_GAP - 2 * u
    for i, row in enumerate(rows):
        b = base - i * (3 * u + TRACE_GAP)
        guidelines(c, M, PW - M, b, u)
        sf.draw_traced(c, row, M + TRACE_INSET, b, u, tracking=TRACE_TRACK)


# -------------------------------------------------------------- zone: cut --
TILE_AVAIL = CW - PIC_W - PIC_GAP                # width left for the tiles


def tile_grid(words):
    """(rows_of_words, tile_width) for the cut strip's word tiles — tiles fill
    the band beside the photo tab exactly, so the strip reads as a clean grid
    and every tile is the same size (any tile fits any build box)."""
    cap = max(1, int((TILE_AVAIL + TILE_GAP) // (30 * mm + TILE_GAP)))
    rows = chunk_balanced(list(words), cap)
    widest = max(len(r) for r in rows)
    tw = (TILE_AVAIL - (widest - 1) * TILE_GAP) / widest
    return rows, tw


def tile_u(all_words, tw):
    """One x-height for every tile on every page: the longest word in the whole
    series sets it, so the tiles are interchangeable across the material."""
    longest = max(all_words, key=lambda w: sf.text_width(w, 1.0, 0.08))
    fit = (tw - 2 * TILE_PAD) / sf.text_width(longest, 1.0, 0.08)
    return min(TILE_U_MAX, fit)


CUT_LABEL_GAP = LABEL_GAP - 2 * mm   # the cut label sits closer to its rule
                                     # than the other zone labels do to their
                                     # content — the rule *is* the label's line


def cut_zone_h(words):
    rows, _ = tile_grid(words)
    tiles_h = len(rows) * TILE_H + (len(rows) - 1) * TILE_ROW_GAP
    return (CUT_LABEL_GAP + CUT_RULE_GAP + CUT_BAND_GAP
            + max(PIC_H + TAB_CAPTION, tiles_h))


def draw_cut_out(c, zone_top, page, words, u, tw):
    section_label(c, M, zone_top, 'cut it out')
    c.setFont('Nar', 9.0)
    c.setFillColorRGB(*GREY)
    c.drawRightString(PW - M, zone_top,
                      'the words are mixed up — read them')

    rule_y = zone_top - CUT_LABEL_GAP - CUT_RULE_GAP
    c.setStrokeColorRGB(*SLOT)
    c.setLineWidth(0.8)
    c.setDash(1.4, 2.4)
    c.line(M + 11 * mm, rule_y, PW - M, rule_y)
    c.setDash()
    scissors_mark(c, M + 7.5 * mm, rule_y, 3.4 * mm)

    band_top = rule_y - CUT_BAND_GAP

    # ---- the photo, as its own cut-out tab (the visual anchor) -------------
    dashed_box(c, M, band_top - PIC_H, PIC_W, PIC_H, color=SLOT)
    draw_image_contained(c, page['art_path'], M + 1.6 * mm,
                         band_top - PIC_H + 1.6 * mm,
                         PIC_W - 3.2 * mm, PIC_H - 3.2 * mm)
    tracked(c, M + PIC_W / 2, band_top - PIC_H - TAB_CAPTION + 0.6 * mm,
            'PICTURE', 'Label', 6.2, 0.20, FAINT, align='center')

    # ---- the word tiles, in the stored scrambled order ---------------------
    rows, _ = tile_grid(words)
    col_x = M + PIC_W + PIC_GAP
    y = band_top - TILE_H
    for row in rows:
        # short rows (7 tiles cut 3/2/2) are centred in the tile column, so a
        # ragged last row reads as deliberate rather than as a mistake
        row_w = len(row) * tw + (len(row) - 1) * TILE_GAP
        x = col_x + (TILE_AVAIL - row_w) / 2
        for w in row:
            dashed_box(c, x, y, tw, TILE_H, color=SLOT)
            sf.draw_solid(c, w, x + (tw - sf.text_width(w, u, 0.08)) / 2,
                          y + TILE_H / 2 - u * 0.42, u, tracking=0.08,
                          weight=0.12, color=INK)
            x += tw + TILE_GAP
        y -= TILE_H + TILE_ROW_GAP


# ----------------------------------------------------------------- build ---
def draw_page(c, page, total, u, tw, tu):
    words = page['sentence'].split(' ')
    tiles = [words[i] for i in page['scramble']]

    zb = build_zone_h(words)
    zt = trace_zone_h(page['sentence'], tu)
    zc = cut_zone_h(words)

    air = USABLE - (zb + zt + zc)
    gap = max(ZONE_GAP_MIN, min(ZONE_GAP_MAX, air / 2.0)) if air > 0 else 0.0
    top = TOP_CONTENT - max(0.0, air - 2 * gap) / 2.0

    page_chrome(c, page, total)
    draw_build_it(c, top, words)
    draw_trace_it(c, top - zb - gap, page['sentence'], tu)
    draw_cut_out(c, top - zb - gap - zt - gap, page, tiles, u, tw)

    overflow = (zb + zt + zc + 2 * gap) - USABLE
    print('  page %d  "%s"' % (page['seq'], page['sentence']))
    print('     build %.1fmm / trace %.1fmm / cut %.1fmm + 2x%.1fmm air '
          '= %.1fmm of %.1fmm%s'
          % (zb / mm, zt / mm, zc / mm, gap / mm,
             (zb + zt + zc + 2 * gap) / mm, USABLE / mm,
             '   OVERFLOW %.1fmm' % (overflow / mm) if overflow > 0.05 else ''))
    print('     tiles: %s' % ' | '.join(tiles))


def build(cfg, out_dir, only_seq=None):
    pages = [p for p in cfg['pages']
             if only_seq is None or p['seq'] == only_seq]
    if not pages:
        raise SystemExit('no alphabet_series.json row with seq %d' % only_seq)
    for p in pages:
        if not os.path.exists(p['art_path']):
            raise SystemExit('missing art: ' + p['art_path'])

    # one tile size and one tracing size for the whole material, always derived
    # from ALL five sentences (never just the ones being built) so a --page N
    # proof is dimensionally identical to the page in the shipped --all PDF
    all_words = [w for p in cfg['pages'] for w in p['sentence'].split(' ')]
    tw = min(tile_grid(p['sentence'].split(' '))[1] for p in cfg['pages'])
    u = tile_u(all_words, tw)
    tu = series_trace_u(cfg)

    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, cfg.get('out_name', 'alphabet-series.pdf'))
    c = rl_canvas.Canvas(out, pagesize=A4)
    c.setTitle('Montree Phonics — Alphabet series')
    c.setAuthor('Montree')
    total = len(cfg['pages'])
    print('alphabet-series -> %s' % out)
    for p in pages:
        draw_page(c, p, total, u, tw, tu)
        c.showPage()
    c.save()

    if sf.MISSING:
        print('WARNING unmapped characters:', sorted(sf.MISSING))
    if only_seq is not None:
        print('NOTE  --page %d built a ONE-page proof at the combined output '
              'path; rerun with --all before shipping.' % only_seq)
    print('  trace x-height %.2fmm (ceiling %.1fmm) · tile x-height %.2fmm · '
          'tile %.1f x %.1fmm · box %.1f x %.1fmm'
          % (tu / mm, TRACE_U / mm, u / mm, tw / mm, TILE_H / mm,
             BOX_W / mm, BOX_H / mm))
    return out


def main():
    ap = argparse.ArgumentParser(description='Build the Alphabet Series '
                                             'worksheet PDF.')
    ap.add_argument('--page', type=int, default=None,
                    help='build a single sentence (1-5) as a one-page proof')
    ap.add_argument('--all', action='store_true',
                    help='build all five pages into one PDF (default)')
    ap.add_argument('--repo-root', default=None)
    ap.add_argument('--art-dir', default=None,
                    help='override the photo folder wholesale (placeholder QA)')
    ap.add_argument('--out-dir', default=None,
                    help='override the output folder (default: '
                         '<repo>/public/satpin-materials/alphabet-series)')
    a = ap.parse_args()

    cfg = load_series()
    validate(cfg)
    root = os.path.abspath(a.repo_root) if a.repo_root else default_repo_root()
    resolve_art(cfg, root, a.art_dir)
    out_dir = (os.path.abspath(a.out_dir) if a.out_dir
               else os.path.join(root, *cfg['out_dir'].split('/')))
    build(cfg, out_dir, only_seq=a.page)


if __name__ == '__main__':
    main()
