#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 16, the Tray 5 SENTENCE WORK MATS

Four A1 felt mats, iron-on screen printed, one plate a mat.  Three are guided —
pink, blue, green, each printed entirely in its own tier colour — and the fourth
is the same artwork in charcoal with NO letters, which is the mat the child moves
to once he no longer needs to be told where the words go.

SIX PLACES, NOT SIX LINES.  The first cut of this sheet was A3 with one card
landing and six lines, which gave five of the six picture cards nowhere to go: he
could build one sentence and the other five cards sat on the rug.  The mat is now
A1, two columns by three rows, and EVERY sentence has its own place — its own
104 x 144 mm card landing with its own start tick and its own rule beside it.  He
lays all six cards out at once and works the mat like a page.

THE WORDS ARE THE CARDS.  Sheet 12 measures every word card on the real glyph
outlines: card width = the word's INK width + G, rounded to the nearest 0.1 mm,
the word centred in it, so butted cards leave a constant G of ink-to-ink space.
This mat prints each word at the exact x the card's ink would sit at when the
tier's cards are butted from the rule's start — card_w(), ink_left() and
glyph_box() are IMPORTED from build_12 and the run is simulated card by card.  A
card laid at x = 122 covers its printed word to the tenth of a millimetre, at
every one of the eighteen sentences.

G IS READ, NEVER TYPED.  G is build_12.word_space() and the mat asks for it at
import time; it reads 7.0 mm today and read 5.909 the week before, and nothing
here had to change for that.  The ideal even line — first ink at 122 + G/2, then
a constant G — is NOT what is printed: the cards are cut on a 0.1 mm grid and
each card's roundoff is carried by every card after it, which drifts the even
line off the cards by up to a tenth of a millimetre over the long green sentence.
The printed word sits where the CARD's ink sits.  check() reports both figures.

THE RULE IS KNOCKED OUT UNDER THE DESCENDERS.  A 2 mm rule at a 6.6 mm x-height
eats a descender whole: on the A3 proof the g of `penguin`, the p of `spat` and
the j of `jump` were swallowed by their own baseline.  So the rule is drawn as
SEGMENTS with a gap wherever a glyph descends through it, and the gap is measured
off the glyph's own outline — the outline is flattened, intersected with the 2 mm
band the rule occupies, and the x-extent it really covers there is cleared by
0.4 mm each side.  The gap is a genuine hole in the vector and therefore a
genuine hole in the transparent PNG: there is no white plate, no felt-coloured
patch and no second screen, which a knockout drawn as an overprint would need.
A gap that would leave a stub of rule shorter than the 2.0 mm screen floor
swallows the stub instead of printing a crumb the screen cannot hold.

THE KNOCKOUT BELONGS TO THE TEXT LAYER, which is why the BLANK mat's rules run
unbroken: there is no descender on it to clear.  "The blank is the green with the
text off" is checked literally — the green mat is re-rendered with with_words
False and its alpha compared pixel for pixel with the blank's.

ONE COLOUR A MAT.  Frame, ticks, rules and words are all the one ink: sheet 14's
TIER_C, imported, for the three guided mats, and build_12's CHARCOAL_C for the
blank.  A screen is one colour and one plate; there is no second colour on any of
the four, and no adult text, no caption, no trim mark.  The felt is the ground.

2.0 mm IS THE FLOOR and check() MEASURES it on the raster rather than trusting
the constants.  The LETTERS are the one thing that cannot meet it: the word size
is fixed by the writing rule (x-height 6.6 mm, solved from the font's own
OS/2.sxHeight by build_12.word_size()) and Comic Neue's stems at that size are
about 0.85 mm.  That is reported as its own figure so the factory is told what
the finest stroke on the plate really is.  It is not a fault to fix by fattening
the type: the words must be the size of the cards, and the cards are the size of
his handwriting.

RASTER.  Drawn as vector with ReportLab; the PDF is the file the screen printer
wants and the PNG is the fallback.  300 dpi, not 600: A1 at 600 dpi is 278
megapixels and no printer wants that file.  Ghostscript's pngalpha device with
-dFIXEDMEDIA pins the raster to the exact pixel box asked for, which is why the
PNG is 9933 x 7016 and not the 9934 a ceiling would give.

Run:   python3 scripts/curriculum/writing-shelf/build_16_sentence_mats.py
Needs: reportlab, fontTools, numpy, Pillow; Ghostscript (gs) for the raster —
       the build STOPS rather than writing artwork it has not measured.
"""

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from fontTools.pens.basePen import BasePen
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:            # build_12/14 import each other by name
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  the card measure
import build_14_sentence_builder_cards as SB  # noqa: E402  the sentences, TIER_C

REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2" / "mats"
BUILD_DIR = HERE / ".build" / "mats"
PDF_TITLE = "Dark Phonics · Writing Shelf · sentence work mats"
PDF_AUTHOR = "Montree Phonics"
PRINT_NOTE = ("screen print 1 colour, iron-on transfer onto A1 felt, 100% — "
              "841 x 594 mm, no bleed")

# ------------------------------------------------------------------- the mat ----
MAT_W, MAT_H = 841.0, 594.0             # mm, A1 landscape
MARGIN = 30.0
COLS, ROWS = 2, 3
COL_GUTTER, ROW_GUTTER = 40.0, 34.0
CELL_W = (MAT_W - 2 * MARGIN - COL_GUTTER) / COLS        # 370.5
CELL_H = (MAT_H - 2 * MARGIN - 2 * ROW_GUTTER) / ROWS    # 155.333...

BLOCK_H = 144.0                         # mm — the landing height, the content
LAND_W, LAND_H = 104.0, 144.0           # mm — the picture-card landing
LAND_STROKE = 2.0                       # mm, centred on the 104 x 144 path
LAND_R = 4.0                            # mm corner radius

TICK_X = 118.0                          # mm from the cell's left edge
TICK_W, TICK_H = 2.0, 28.0              # mm — the band is the tick's 28 mm
ZONE_X = 122.0                          # mm from the cell's left edge
RULE_L = CELL_W - ZONE_X                # 248.5
RULE_H = 2.0                            # mm thick
BASELINE = 9.0                          # mm up from the band's bottom edge

KNOCK_CLEAR = 0.9                       # mm of felt each side of a descender
# 0.9 and not the 0.4 this was first cut at.  A 0.4 mm sliver of bare felt
# beside a descender stem is the width a heat press BRIDGES: the gap closes,
# the rule joins back up under the tail, and the defect this whole knockout
# exists to fix is back.  0.9 mm survives the press and still reads as a
# notch in the rule rather than a hole in it.
# A glyph knocks the rule out only if it reaches into the rule's LOWER HALF.
# Every letter touches the baseline and the round ones overshoot below it, so a
# glyph merely REACHING the rule's top edge cannot be the test — with that test
# the `n` of `penguin` cut a 5.9 mm hole and the rule came out in crumbs.  In
# this face at this size the split is clean and nowhere near the threshold: the
# deepest non-descender is `a` at -0.19 mm, and g, j and p reach -2.55, -2.49
# and -2.68 mm, straight through all 2.0 mm of rule.
KNOCK_MIN = RULE_H / 2.0                # mm below the baseline before a cut
INK_FLOOR = 2.0                         # mm — the screen-print floor on felt

# ---------------------------------------------------------------- the raster ----
PRINT_DPI = 300
PRINT_PX = (9933, 7016)                 # 841 x 594 mm at 300 dpi, rounded
PREVIEW_DPI = 120
PREVIEW_PX = (3973, 2806)
FELT = (0xEF, 0xEA, 0xE0)               # the light felt the preview sits on

MATS = [(1, "pink"), (2, "blue"), (3, "green"), (None, "blank")]
N_CELLS = COLS * ROWS
RUN_TOL = 0.05                          # mm — how close the print is to the card
DESCENDERS = ("penguin", "spat", "jump")        # the three the A3 proof ate


def ink_colour(tier):
    """One colour a mat: sheet 14's TIER_C, or build_12's charcoal for the blank."""
    return SB.TIER_C[tier] if tier else W12.CHARCOAL_C


def sentences(tier):
    """The six sentences of one tier, in tray order, from sheet 14's table.

    Grouped by GROUP tier — the tray the card sits in, which is the tin the child
    reaches for — so the carried fox-box card (pink words, pink frame, blue tray)
    is on the BLUE mat, beside the blue tin that holds its words.
    """
    # THE PRINTED FORM — capital on the first word, full stop riding on the
    # last, from build_14.display(), which is the one place either mark is
    # added.  The mat has to agree with the TIN to the tenth of a millimetre
    # and the tin now holds `The` and `sat.`, so a lowercase mat would be a mat
    # the child's cards no longer cover.
    return [SB.display(sentence)
            for _slug, group, sentence, _art, _frame in SB.CARDS
            if group == tier]


# ------------------------------------------------------------- the geometry ----
def cell(i):
    """(left, top) of cell i in TOP-DOWN mm.  Reading order: 1,2 / 3,4 / 5,6."""
    r, c = divmod(i, COLS)
    return (MARGIN + c * (CELL_W + COL_GUTTER),
            MARGIN + r * (CELL_H + ROW_GUTTER))


def cell_block(i):
    """The 144 mm content block of cell i, centred in the cell.

    Returns (left, block_top_pdf, block_bottom_pdf, band_bottom_pdf, baseline).
    """
    left, top = cell(i)
    block_top = top + (CELL_H - BLOCK_H) / 2.0          # top-down
    b_top = MAT_H - block_top                            # PDF y of the top
    b_bot = b_top - BLOCK_H
    band_bot = b_top - (LAND_H - TICK_H) / 2.0 - TICK_H  # tick centred on landing
    return left, b_top, b_bot, band_bot, band_bot + BASELINE


def card_run(sentence, x0):
    """Lay this sentence's WORD CARDS butted from x0.  Sheet 12's measure, only.

    [(word, card_x0, card_x1, ink_x0, ink_x1)] in mm — where the child's cards
    put their ink when he butts them up from the start of the rule.
    """
    out, x = [], float(x0)
    for word in sentence.split():
        cw = W12.card_w(word)
        il = x + W12.ink_left(word, cw)
        out.append((word, x, x + cw, il, il + W12.ink_w(word)))
        x += cw
    return out


def printed_run(sentence, x0):
    """Where this mat PRINTS each word: at the x its card's ink occupies."""
    return [(w, i0, i1) for w, _c0, _c1, i0, i1 in card_run(sentence, x0)]


def even_run(sentence, x0):
    """The IDEAL run: first ink at x0 + G/2, then a constant G ink to ink.

    Not printed; check() measures how far it drifts from the cards so the
    decision to follow the cards instead stays on the record.
    """
    G = W12.word_space()
    out, x = [], x0 + G / 2.0
    for word in sentence.split():
        w = W12.ink_w(word)
        out.append((word, x, x + w))
        x += w + G
    return out


# ------------------------------------------------------- the descender knockout ----
class _Flatten(BasePen):
    """Every contour of a glyph as a polyline, in font units.  BasePen does the
    TrueType implied-on-curve arithmetic; the curves are chopped into segments
    fine enough that the error is far under the 0.4 mm clearance."""

    STEPS = 16

    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.polys, self._cur = [], None

    def _moveTo(self, pt):
        self._cur = [pt]
        self.polys.append(self._cur)

    def _lineTo(self, pt):
        self._cur.append(pt)

    def _qCurveToOne(self, b, pt):
        x0, y0 = self._cur[-1]
        for i in range(1, self.STEPS + 1):
            t = i / self.STEPS
            u = 1.0 - t
            self._cur.append((u * u * x0 + 2 * u * t * b[0] + t * t * pt[0],
                              u * u * y0 + 2 * u * t * b[1] + t * t * pt[1]))

    def _curveToOne(self, b1, b2, pt):
        x0, y0 = self._cur[-1]
        for i in range(1, self.STEPS + 1):
            t = i / self.STEPS
            u = 1.0 - t
            self._cur.append(
                (u ** 3 * x0 + 3 * u * u * t * b1[0] + 3 * u * t * t * b2[0]
                 + t ** 3 * pt[0],
                 u ** 3 * y0 + 3 * u * u * t * b1[1] + 3 * u * t * t * b2[1]
                 + t ** 3 * pt[1]))

    def _closePath(self):
        self._cur = None


def _glyph_polys(ch):
    f = W12._ttf()
    gs = f.getGlyphSet()
    pen = _Flatten(gs)
    gs[W12.gname(ch)].draw(pen)
    return pen.polys


def _band_x(polys, ylo, yhi):
    """(min x, max x) of an outline inside a horizontal band, in font units."""
    xs = []
    for poly in polys:
        n = len(poly)
        for i in range(n):
            x0, y0 = poly[i]
            x1, y1 = poly[(i + 1) % n]
            if ylo <= y0 <= yhi:
                xs.append(x0)
            if y0 != y1:
                for yy in (ylo, yhi):
                    t = (yy - y0) / float(y1 - y0)
                    if 0.0 <= t <= 1.0:
                        xs.append(x0 + t * (x1 - x0))
    return (min(xs), max(xs)) if xs else None


def descender_gaps(sentence, x0):
    """Every gap the rule must leave, in absolute mm: [(gx0, gx1, word, ch)].

    The rule occupies the 2.0 mm under the baseline.  A glyph that reaches into
    that band is measured THERE — not at its bounding box, which for a `g` is far
    wider than the tail that actually crosses the rule — and cleared both sides.
    """
    f = W12._ttf()
    upm = float(f["head"].unitsPerEm)
    hmtx = f["hmtx"]
    k = W12.SIZE / upm / 72.0 * 25.4         # font units -> mm
    ylo, yhi = -RULE_H / k, 0.0              # the rule band, in font units
    out = []
    glyf = f["glyf"]
    for word, _c0, _c1, ink_x0, _i1 in card_run(sentence, x0):
        origin = ink_x0 - W12.glyph_box(word)[0]        # the drawString pen x
        pen = 0.0
        for ch in word:
            g = glyf[W12.gname(ch)]
            if not g.numberOfContours or g.yMin * k > -KNOCK_MIN:
                # sits on the line; the rule stays whole
                pen += hmtx[W12.gname(ch)][0]
                continue
            span = _band_x(_glyph_polys(ch), ylo, yhi)
            if span is not None:
                out.append((origin + (pen + span[0]) * k - KNOCK_CLEAR,
                            origin + (pen + span[1]) * k + KNOCK_CLEAR,
                            word, ch))
            pen += hmtx[W12.gname(ch)][0]
    return out


def rule_segments(x0, gaps, length=None):
    """The rule as drawn: [(seg_x0, seg_x1)], the gaps cut out and merged.

    A stub of rule shorter than the screen floor is swallowed by the gap beside
    it rather than printed: a 1 mm crumb of rule between two descenders is a
    thing the screen cannot hold and the eye reads as dirt.
    """
    x1 = x0 + (RULE_L if length is None else length)
    cuts = sorted((max(g0, x0), min(g1, x1)) for g0, g1, _w, _c in gaps
                  if g1 > x0 and g0 < x1)
    merged = []
    for a, b in cuts:
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    segs, x = [], x0
    for a, b in merged:
        if a - x >= INK_FLOOR:
            segs.append((x, a))
        x = max(x, b)
    if x1 - x >= INK_FLOOR:
        segs.append((x, x1))
    return segs, merged


# --------------------------------------------------------------- the drawing ----
def draw_mat(c, tier, with_words):
    """One mat, one colour.  with_words False draws the blank's geometry."""
    col = ink_colour(tier)
    c.setStrokeColor(col)
    c.setFillColor(col)
    c.setLineJoin(1)
    sents = sentences(tier) if with_words else [None] * N_CELLS
    drawn = []
    for i in range(N_CELLS):
        left, b_top, _b_bot, band_bot, base = cell_block(i)
        c.setLineWidth(LAND_STROKE * mm)
        c.roundRect(left * mm, (b_top - LAND_H) * mm, LAND_W * mm, LAND_H * mm,
                    LAND_R * mm, stroke=1, fill=0)
        c.rect((left + TICK_X) * mm, band_bot * mm, TICK_W * mm, TICK_H * mm,
               stroke=0, fill=1)
        x0 = left + ZONE_X
        gaps = descender_gaps(sents[i], x0) if sents[i] else []
        segs, merged = rule_segments(x0, gaps)
        for a, b in segs:
            c.rect(a * mm, (base - RULE_H) * mm, (b - a) * mm, RULE_H * mm,
                   stroke=0, fill=1)
        drawn.append((i, x0, base, segs, merged, gaps))
        if sents[i] is None:
            continue
        c.setFont(W12.WORD_FONT, W12.SIZE)
        for word, ink_x0, _ink_x1 in printed_run(sents[i], x0):
            # drawString takes the PEN origin; the ink starts one left side
            # bearing further right, so the bearing comes off the position.
            c.drawString((ink_x0 - W12.glyph_box(word)[0]) * mm, base * mm, word)
    return drawn


def write_pdf(path, tier, with_words):
    c = canvas.Canvas(str(path), pagesize=(MAT_W * mm, MAT_H * mm))
    c.setTitle("%s · %s" % (PDF_TITLE,
                            "blank" if tier is None else SB.TIER_NAME[tier]))
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    drawn = draw_mat(c, tier, with_words)
    c.showPage()
    c.save()
    return path, drawn


# --------------------------------------------------------------- the raster ----
GS = "gs"


def rasterise(pdf, png, px, dpi):
    """PDF -> RGBA PNG, ink only, transparent ground, at EXACTLY px.

    Ghostscript's pngalpha device with -dFIXEDMEDIA pins the raster to the
    requested pixel box at the requested resolution, so 841 mm at 300 dpi comes
    out 9933 px and not the 9934 a ceiling would give.  The 0.07 px it clips off
    the right edge is blank felt: the artwork ends at the 30 mm margin.
    """
    subprocess.run([GS, "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER",
                    "-sDEVICE=pngalpha", "-r%d" % dpi,
                    "-g%dx%d" % px, "-dFIXEDMEDIA",
                    "-dTextAlphaBits=4", "-dGraphicsAlphaBits=4",
                    "-sOutputFile=%s" % png, str(pdf)],
                   check=True, capture_output=True)
    return png


def preview(src_png, out_png):
    """The print ink composited on felt, so he can see it as it will look."""
    ink = Image.open(src_png).convert("RGBA")
    felt = Image.new("RGBA", ink.size, FELT + (255,))
    Image.alpha_composite(felt, ink).convert("RGB").save(out_png)
    return out_png


# ---------------------------------------------------------------- measuring ----
def _min_run(line):
    d = np.diff(np.concatenate(([0], line.view(np.int8), [0])))
    starts = np.flatnonzero(d == 1)
    if not starts.size:
        return None, None
    lens = np.flatnonzero(d == -1) - starts
    k = int(np.argmin(lens))
    return int(lens[k]), int(starts[k])


def thinnest(mask, px_per_mm):
    """The thinnest element in a mask, in mm, and where it is (px).

    For every ink pixel the thickness is min(its horizontal run, its vertical
    run), and the minimum of a min over all pixels is just the smaller of the two
    minima, so the scan is one pass of rows and one of columns.  On artwork built
    of axis-aligned bars this reads the true bar thickness: a rule's rows are
    thousands of px long and its columns 24, and on the landing's corner arcs
    BOTH runs are longer than the stroke, so a corner cannot fake a thin spot.
    """
    best = (None, None)
    for axis, name in ((1, "horizontal"), (0, "vertical")):
        lines = mask if axis == 1 else mask.T
        for i in range(lines.shape[0]):
            row = lines[i]
            if not row.any():
                continue
            n, at = _min_run(row)
            if best[0] is None or n < best[0][0]:
                best = ((n, name), (i, at))
    (n, name), (i, at) = best
    return n / px_per_mm, "%s run of %d px at %s" % (name, n, (i, at))


def run_lengths(mask):
    out = []
    for i in range(mask.shape[0]):
        row = mask[i]
        if not row.any():
            continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        out.append(np.flatnonzero(d == -1) - np.flatnonzero(d == 1))
    return np.concatenate(out) if out else np.array([], dtype=int)


# ------------------------------------------------------------------ the checks ----
def check_geometry():
    bad, notes = [], {}
    if abs(CELL_W - 370.5) > 1e-9 or abs(CELL_H - 466.0 / 3.0) > 1e-9:
        bad.append("the cell is %.4f x %.4f mm, not 370.5 x 155.333"
                   % (CELL_W, CELL_H))
    for i in range(N_CELLS):
        left, top = cell(i)
        if left < MARGIN - 1e-9 or left + CELL_W > MAT_W - MARGIN + 1e-9:
            bad.append("cell %d breaks the %.0f mm margin" % (i, MARGIN))
        if top < MARGIN - 1e-9 or top + CELL_H > MAT_H - MARGIN + 1e-9:
            bad.append("cell %d breaks the %.0f mm margin" % (i, MARGIN))
        _l, b_top, b_bot, band_bot, base = cell_block(i)
        if abs((b_top - band_bot - TICK_H) - 58.0) > 1e-9:
            bad.append("the tick's top is %.3f mm below the landing's, not 58"
                       % (b_top - band_bot - TICK_H))
        if band_bot < b_bot - 1e-9 or band_bot + TICK_H > b_top + 1e-9:
            bad.append("the band leaves the content block")
        if base - RULE_H < band_bot - 1e-9:
            bad.append("the rule drops out of the band")
    notes["last_cell_right"] = cell(N_CELLS - 1)[0] + CELL_W
    if abs(ZONE_X + RULE_L - CELL_W) > 1e-9:
        bad.append("the rule ends %.3f mm short of the cell" % (CELL_W - ZONE_X
                                                               - RULE_L))
    if abs(RULE_L - 248.5) > 1e-9:
        bad.append("the rule is %.3f mm, not 248.5" % RULE_L)
    if TICK_X + TICK_W >= ZONE_X + 1e-9:
        bad.append("the start tick touches the line zone")
    for el, w in (("landing stroke", LAND_STROKE), ("start tick", TICK_W),
                  ("baseline rule", RULE_H)):
        if w < INK_FLOOR - 1e-9:
            bad.append("the %s is %.2f mm, under the %.1f mm floor"
                       % (el, w, INK_FLOOR))
    ap = (LAND_W - LAND_STROKE, LAND_H - LAND_STROKE)
    notes["aperture"] = ap
    if ap[0] < 100.0 or ap[1] < 140.0:
        bad.append("the %.0f x %.0f mm aperture will not take a mounted "
                   "100 x 140 mm card" % ap)
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return notes


def check_words(drawn):
    bad, notes = [], {}
    worst_card, worst_even, worst_sent = 0.0, 0.0, None
    gaps, runs, n_words, n_knock = [], [], 0, 0
    short_seg, knock_w = None, []
    for tier, name in MATS:
        if tier is None:
            continue
        sents = sentences(tier)
        if len(sents) != N_CELLS:
            bad.append("the %s mat has %d sentences for %d cells"
                       % (name, len(sents), N_CELLS))
        for i, sentence in enumerate(sents):
            x0 = cell(i)[0] + ZONE_X
            cards = card_run(sentence, x0)
            n_words += len(cards)
            for (cw, _c0, _c1, ci0, ci1), (pw, pi0, pi1), (_ew, ei0, ei1) in zip(
                    cards, printed_run(sentence, x0), even_run(sentence, x0)):
                if cw != pw:
                    bad.append("%r: the print and the cards disagree" % sentence)
                off = max(abs(ci0 - pi0), abs(ci1 - pi1))
                if worst_sent is None or off > worst_card:
                    worst_card, worst_sent = off, sentence
                if off > RUN_TOL:
                    bad.append("%r: %r prints %.4f mm off its card's ink"
                               % (sentence, pw, off))
                worst_even = max(worst_even, abs(ci0 - ei0), abs(ci1 - ei1))
            for (_w, _i0, i1), (_w2, j0, _j1) in zip(printed_run(sentence, x0),
                                                     printed_run(sentence, x0)[1:]):
                gaps.append(j0 - i1)
            if cards[-1][2] > x0 + RULE_L + 1e-9:
                bad.append("%r runs %.1f mm past its rule"
                           % (sentence, cards[-1][2] - x0 - RULE_L))
            runs.append((cards[-1][4] - cards[0][3], sentence))
            for word, _c0, _c1, _i0, _i1 in cards:
                _l, _r, top, bot = W12.glyph_box(word)
                if BASELINE + bot < 0.0 - 1e-9:
                    bad.append("%r descends below its band" % word)
                if BASELINE + top > TICK_H + 1e-9:
                    bad.append("%r rises above its band" % word)
            # ---- the knockout
            kg = descender_gaps(sentence, x0)
            n_knock += len(kg)
            knock_w.extend(g1 - g0 for g0, g1, _w, _c in kg)
            segs, merged = rule_segments(x0, kg)
            for a, b in segs:
                if short_seg is None or b - a < short_seg[0]:
                    short_seg = (b - a, sentence)
                if b - a < INK_FLOOR - 1e-9:
                    bad.append("%r leaves a %.2f mm stub of rule" % (sentence,
                                                                     b - a))
            for g0, g1, word, ch in kg:
                if not any(a - 1e-9 <= g0 and g1 <= b + 1e-9
                           for a, b in merged):
                    bad.append("%r: the %r of %r is not cleared by the rule"
                               % (sentence, ch, word))
            notes.setdefault("knock", {})[sentence] = (kg, merged)
    # ...named by their LEDGER word: `spat` is printed `spat.` when it closes a
    # sentence, and it is the same descender either way.
    for w in DESCENDERS:
        hit = [s for s in notes["knock"]
               if w in [SB.plain(x) for x in s.split()]]
        if not hit or not any(SB.plain(word) == w for s in hit
                              for _a, _b, word, _c in notes["knock"][s][0]):
            bad.append("no knockout was cut for %r — the rule would eat it" % w)
    G = W12.word_space()
    notes.update(G=G, worst_card=worst_card, worst_sent=worst_sent,
                 worst_even=worst_even, n_words=n_words, n_knock=n_knock,
                 knock_w=(min(knock_w), max(knock_w)), short_seg=short_seg,
                 gap=(min(gaps), max(gaps)), n_gaps=len(gaps),
                 longest=max(runs), shortest=min(runs))
    if abs(min(gaps) - G) > 0.05 or abs(max(gaps) - G) > 0.05:
        bad.append("printed ink sits %.3f-%.3f mm apart; G is %.3f"
                   % (min(gaps), max(gaps), G))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return notes


def check_raster(pngs, notext_png, words):
    bad, notes = [], {}
    px_per_mm = PRINT_PX[0] / MAT_W
    masks = {}
    for tier, name in MATS:
        im = Image.open(pngs[name])
        if im.size != PRINT_PX:
            bad.append("%s is %dx%d px, not %dx%d"
                       % (name, im.size[0], im.size[1], *PRINT_PX))
        if im.mode != "RGBA":
            bad.append("%s is %s, not RGBA — no alpha channel" % (name, im.mode))
        a = np.array(im.convert("RGBA"))
        alpha = a[:, :, 3]
        for corner in ((0, 0), (0, -1), (-1, 0), (-1, -1)):
            if alpha[corner] != 0:
                bad.append("%s: corner %s is not transparent (alpha %d)"
                           % (name, corner, alpha[corner]))
        # ONE COLOUR.  Every fully opaque pixel says the same RGB and it is the
        # tier's.  The antialiased edge may sit one 255th off — pngalpha writes
        # unassociated alpha and its round trip rounds — and nothing further.
        want = tuple(round(v * 255) for v in ink_colour(tier).rgb())
        solid = np.unique(a[:, :, :3][alpha == 255].reshape(-1, 3), axis=0)
        part = (alpha > 0) & (alpha < 255)
        edge = a[:, :, :3][part].astype(int).reshape(-1, 3)
        # Judge the antialiased edge by what it COMPOSITES to, not by the RGB
        # pngalpha stores: the file carries UNASSOCIATED alpha, so a partly
        # covered pixel's colour is divided back out by its own coverage and the
        # rounding is amplified in the same proportion.  A stored value 2/255 off
        # the ink at alpha 92 lands 0.7/255 off once composited, which is under
        # one step of the 8-bit ground it will print on: a rounding artefact on a
        # blend, not a second colour.
        if edge.size:
            e = np.abs(edge - np.array(want)).max(axis=1)
            drift = int(e.max())
            drift_c = float((e * alpha[part] / 255.0).max())
        else:
            drift, drift_c = 0, 0.0
        notes.setdefault("colours", {})[name] = (
            len(solid), tuple(int(v) for v in solid[0]), drift, drift_c)
        if len(solid) != 1:
            bad.append("%s carries %d colour values in its solid ink: %s"
                       % (name, len(solid), solid[:6].tolist()))
        elif tuple(int(v) for v in solid[0]) != want:
            bad.append("%s is ink %s, not %s"
                       % (name, tuple(int(v) for v in solid[0]), want))
        if drift_c > 1.0:
            bad.append("%s: an antialiased pixel composites %.2f/255 off the "
                       "ink — that is a second colour, not a blend"
                       % (name, drift_c))
        notes.setdefault("ink_px", {})[name] = int((alpha > 0).sum())
        masks[name] = alpha >= 128
        notes.setdefault("alpha", {})[name] = alpha
    # ---- the thinnest NON-TEXT element, on the BLANK: it is pure geometry
    geo = masks["blank"]
    half_mm, where = thinnest(geo, px_per_mm)
    any_mm, _w2 = thinnest(notes["alpha"]["blank"] > 0, px_per_mm)
    notes["thin_geo"] = (half_mm, any_mm, where)
    if not (half_mm <= INK_FLOOR <= any_mm):
        bad.append("the thinnest drawn element rasterises %.3f-%.3f mm (%s), "
                   "which does not bracket the %.1f mm it is drawn at"
                   % (half_mm, any_mm, where, INK_FLOOR))
    if half_mm < INK_FLOOR - 2.0 / px_per_mm:
        bad.append("the thinnest drawn element measures %.3f mm (%s), under the "
                   "%.1f mm screen floor" % (half_mm, where, INK_FLOOR))
    # ---- the letters, on what the green mat adds to the blank
    text = masks["green"] & ~geo
    lens = run_lengths(text)
    notes["thin_text"] = (float(np.median(lens)) / px_per_mm,
                          float(np.percentile(lens, 10)) / px_per_mm,
                          int(lens.min()) / px_per_mm)
    # ---- THE KNOCKOUT IS A HOLE.  For every descender of penguin/spat/jump,
    # the clearance beside the glyph must be TRANSPARENT in the shipped PNG.
    shots = []
    for tier, name in ((1, "pink"), (2, "blue"), (3, "green")):
        alpha = notes["alpha"][name]
        for i, sentence in enumerate(sentences(tier)):
            kg, _merged = words["knock"][sentence]
            _l, _bt, _bb, _band, base = cell_block(i)
            row = int(round((MAT_H - (base - RULE_H / 2.0)) * px_per_mm))
            for g0, g1, word, ch in kg:
                if word not in DESCENDERS:
                    continue
                lo = int(round(g0 * px_per_mm))
                hi = int(round(g1 * px_per_mm))
                strip = alpha[row, lo:hi]
                clear = int((strip == 0).sum())
                shots.append((name, word, ch, clear / px_per_mm))
                if clear == 0:
                    bad.append("%s: the rule under the %r of %r is FILLED — the "
                               "knockout did not cut" % (name, ch, word))
    notes["knock_shots"] = shots
    # ---- THE BLANK IS THE GREEN WITH THE TEXT LAYER OFF.  The knockout belongs
    # to the text layer, so the control is the green mat drawn with_words False.
    nt = np.array(Image.open(notext_png).convert("RGBA"))[:, :, 3]
    diff = int((nt != notes["alpha"]["blank"]).sum())
    notes["blank_identical"] = (diff == 0, diff)
    if diff:
        bad.append("the blank mat's geometry differs from the green mat's with "
                   "the text off: %d px of alpha disagree" % diff)
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    notes.pop("alpha")
    return notes


# -------------------------------------------------------------------- build ----
def build():
    if not shutil.which(GS):
        raise SystemExit("SPEC FAILURE: no Ghostscript (gs) on this machine — "
                         "the print PNGs cannot be rasterised with an alpha "
                         "channel and the artwork would ship unmeasured.")
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()
    n_src = W12.check_source()
    geo = check_geometry()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    pdfs, pngs, previews, drawn = {}, {}, {}, {}
    for tier, name in MATS:
        pdf, dr = write_pdf(OUT_DIR / ("mat-%s.pdf" % name), tier,
                            tier is not None)
        drawn[name] = dr
        pngs[name] = rasterise(pdf, OUT_DIR / ("mat-%s.png" % name),
                               PRINT_PX, PRINT_DPI)
        low = rasterise(pdf, BUILD_DIR / ("flat-%s.png" % name),
                        PREVIEW_PX, PREVIEW_DPI)
        previews[name] = preview(low, OUT_DIR / ("preview-%s.png" % name))
        pdfs[name] = pdf
    words = check_words(drawn)
    nt_pdf, _d = write_pdf(BUILD_DIR / "green-no-text.pdf", 3, False)
    nt_png = rasterise(nt_pdf, BUILD_DIR / "green-no-text.png",
                       PRINT_PX, PRINT_DPI)
    raster = check_raster(pngs, nt_png, words)

    # ------------------------------------------------------------- report ----
    def kb(p):
        return p.stat().st_size / 1024.0

    print("sentence work mats -> %s" % OUT_DIR.relative_to(REPO))
    print("  %.0f x %.0f mm A1 landscape · %d x %d cells of %.1f x %.3f mm · %s"
          % (MAT_W, MAT_H, COLS, ROWS, CELL_W, CELL_H, PRINT_NOTE))
    print("  source of truth %s: %d sentence cards, matched"
          % (SB.SOURCE_TS.name, n_src))
    for _tier, name in MATS:
        n, rgb, drift, drift_c = raster["colours"][name]
        print("  %-6s %-14s %5.0f KB · %-14s %6.0f KB · preview %5.0f KB · ink "
              "#%02X%02X%02X, %d value in the solid ink (antialiased edge "
              "composites <=%.2f/255 off) · %.2f%% coverage"
              % (name, pdfs[name].name, kb(pdfs[name]), pngs[name].name,
                 kb(pngs[name]), kb(previews[name]), *rgb, n, drift_c,
                 100.0 * raster["ink_px"][name] / (PRINT_PX[0] * PRINT_PX[1])))
    print("  print PNG %dx%d px = %d dpi 1:1, RGBA, all four corners alpha 0 · "
          "PDF vector %.0f x %.0f mm · preview %dx%d at %d dpi on felt "
          "#%02X%02X%02X" % (*PRINT_PX, PRINT_DPI, MAT_W, MAT_H, *PREVIEW_PX,
                             PREVIEW_DPI, *FELT))
    print("  word %.4f pt %s from %s · x-height %.2f mm · G %.3f mm read live "
          "from build_12.word_space()"
          % (W12.SIZE, W12.WORD_FONT, W12.SIZE_FROM["how"], W12.X_HEIGHT,
             words["G"]))
    print("  PRINT vs CARD: %d words over 18 sentences agree to %.4f mm (worst, "
          "%r) — tolerance %.2f · printed ink-to-ink %.3f-%.3f mm over %d pairs "
          "(G +/- the cards' own 0.1 mm grid)"
          % (words["n_words"], words["worst_card"], words["worst_sent"],
             RUN_TOL, words["gap"][0], words["gap"][1], words["n_gaps"]))
    print("  an EVEN constant-G line would sit %.4f mm off the cards and is not "
          "what is printed" % words["worst_even"])
    half_mm, any_mm, where = raster["thin_geo"]
    print("  thinnest NON-TEXT element %.3f mm at half coverage, %.3f mm of ink "
          "end to end (%s) — drawn at %.1f mm, the floor; landing stroke, ticks "
          "and rules are all %.1f mm" % (half_mm, any_mm, where, INK_FLOOR,
                                         RULE_H))
    tmed, tp10, tmin = raster["thin_text"]
    print("  LETTER stems measure %.2f mm typical, %.2f mm at the 10th "
          "percentile (%.2f mm minimum is a one-pixel curve tip) — BELOW the "
          "%.1f mm floor and fixed by the %.1f mm x-height the cards set.  TELL "
          "THE FACTORY." % (tmed, tp10, tmin, INK_FLOOR, W12.X_HEIGHT))
    print("  descender knockout: %d gaps cut, %.2f-%.2f mm wide, %.1f mm of felt "
          "each side of the glyph · shortest rule segment %.1f mm (%r) against "
          "the %.1f mm floor"
          % (words["n_knock"], words["knock_w"][0], words["knock_w"][1],
             KNOCK_CLEAR, words["short_seg"][0], words["short_seg"][1],
             INK_FLOOR))
    for name, word, ch, clear in raster["knock_shots"]:
        print("    %-6s %-8s %r: %.2f mm of the rule row is TRANSPARENT in the "
              "shipped PNG" % (name, word, ch, clear))
    same, diff = raster["blank_identical"]
    print("  blank mat == green mat with the text layer off (the knockout is "
          "part of the text): alpha channels %s (%d px differ of %d)"
          % ("PIXEL-IDENTICAL" if same else "DIFFER", diff,
             PRINT_PX[0] * PRINT_PX[1]))
    print("  landing %.0f x %.0f mm r%.0f (%.0f x %.0f aperture, 2 mm round a "
          "mounted 100 x 140 card) · tick %.0f x %.0f at x %.0f · rule %.1f mm "
          "from x %.0f, baseline %.0f mm up"
          % (LAND_W, LAND_H, LAND_R, *geo["aperture"], TICK_W, TICK_H, TICK_X,
             RULE_L, ZONE_X, BASELINE))
    print("  longest line %r %.1f mm of %.1f · shortest %r %.1f mm"
          % (words["longest"][1], words["longest"][0], RULE_L,
             words["shortest"][1], words["shortest"][0]))
    print("  rasterised by Ghostscript pngalpha, -g%dx%d -dFIXEDMEDIA -r%d "
          "(exact pixel box; pdftocairo -transp ceils to %d px wide)"
          % (*PRINT_PX, PRINT_DPI, PRINT_PX[0] + 1))
    return pdfs, pngs, previews


if __name__ == "__main__":
    build()
