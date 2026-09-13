#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 18, the A4 MAGNETIC SENTENCE MATS
                             · sheet 19, the SAME MAT TURNED PORTRAIT (pink)

Sheet 18 is A4 LANDSCAPE, three tiers — pink, blue, green.  Sheet 19 is A4
PORTRAIT, pink only, and it is the same object in a different shape: same art,
same tin-measured line, same rules about what may be printed.  One builder makes
both, because the moment the two are separate files the tick drifts on one of
them and nobody notices until it is printed.

EVERY MAT EXISTS TWICE: GUIDED, THEN BLANK.  The guided page prints the sentence
on the line and the blank page does not, and that pair IS the control of error —
he lays his magnets onto the printed words and sees for himself whether they
match, then does the same sentence again on the blank page with nothing to lean
on.  Guided comes first in the file because it comes first in the work.  Sheet
16's felt mats make the same pair at A1; this is the magnetic, A4 version of it.

THE PRINTED WORDS ARE GREY, AND THE LINE KEEPS THE TIER COLOUR.  His cards are
near-black on white.  A black guide under a black card is a second card, so the
guide must be lighter — but it must not be PINK: the rule, the tick and the
card frames are already pink, and a pink word makes the colour mean two things
at once and stops reading as something to be covered.  So the words are
build_12's free-composition charcoal, WORD_C = CHARCOAL_C #4F4A44, the neutral
that belongs to no tier and the grey sheet 17 sets its sentences in.  The
lighter #8C857B was considered and refused: magnetic stock prints duller than
card and a light grey would go weak on it.  #4F4A44 is still plainly lighter
than a card's #1A1614, so the laid card reads as ink and the guide under it as
a shadow.  ONE colour moves between guided and blank; nothing else does.

THE WORD LANDS WHERE THE CARD LANDS.  The printed word is not set on an ideal
line of constant word space: it is set at the x where the CARD's ink falls when
the cards are butted from the start of the rule, which is what build_16's
card_run/printed_run work out and what is IMPORTED from it here — placement,
descender knockouts and the rule-stub floor all come from that file, so the
felt mat and the magnetic mat cannot disagree about where a word sits.  The
knockout leaves KNOCK_CLEAR of paper each side of every tail that crosses the
rule; on the pink page only `pig` and `wig` have one — `ant-sad` has no
descender at all, whatever the eye expects of a `sad`.

THE SHEET MAY BE CUT INTO SIX.  This is a change of premise: it used to be a
never-cut sheet and the build asserted there was no cut line on it.  It now
carries a cut line at EVERY ROW BOUNDARY, in cutmarks.py's house standard —
0.25 mm light-grey hairline, edge to edge, a black triangle at each end sitting
on the printer-safe margin — so one straight pass of the blade separates two
rows at once and six rows become six small magnetic sentence mats.  HORIZONTALS
ONLY: a row is one piece, picture and line together, and a vertical cut would
saw it in half.  IT IS STILL NEVER LAMINATED — a laminated magnet will not take
a magnetic card, which is the whole of what this sheet is for.

NOTHING SITS ACROSS A CUT.  The artwork is inset ART_CLEAR from the row's top
and bottom, which is the 2.0 mm the landscape row already gives its 28 mm card
band inside 32 mm — the tightest clearance the mat HAS, and now the clearance
everything on it is held to.  clearance() proves it on a raster of the real
pages rather than on this paragraph.

THE MAT IS A4 BECAUSE THE MAGNET IS.  Sheet 16's mats are A1 felt with a whole
104 x 144 mm card landing a sentence; a magnetic sheet comes A4 and no bigger, so
this one drops the landing and gives the row exactly what a row needs — a picture
box, a start tick, a line.  Six rows of 32.0 mm fill the 192 mm between the
margins with nothing left over, and that is why the row is 32.0 and not a
rounder number.

THE PICTURE BOX IS 62 mm WIDE AND IT IS SET BY ONE DRAWING.  star-sat is the
widest art in the set — 709 x 374 — and at the row's picture height it is the
one that decides the box.  A square-ish drawing fits its height long before it
reaches 62 mm and sits with the rest of the box empty: that is CORRECT.  The box
is a bound, not a shape to fill, and the art is LEFT-ALIGNED in it so every row's
picture starts on the same vertical however wide it comes out.  Stretching the
small ones to 62 would distort them; centring them would make the left edge of
the column wander.

TURNED PORTRAIT, THE ROW GETS TALLER AND THE LINE GETS SHORTER, and that trade
is the whole of sheet 19.  210 x 297 at an 8 mm margin gives 194 x 281; six rows
share the 281 at 46.833 mm each, which is 14.8 mm more picture a row than the
landscape mat has, and leaves the line 105.8 mm instead of 208.8.  The taller row
makes the art WIDER as well as taller — contain, not crop — so the box goes to
80 mm.  105.8 mm of line is what decides WHICH TIERS EXIST IN PORTRAIT, and the
answer is read off the tin, not chosen: see PORTRAIT_TIERS.

NOTHING PRINTS UNDER 200 dpi.  The art is the full-resolution prepared JPEG in
.build/sentence-builder/ — the one build_14 white-points, ink-trims and resamples
— never the downsampled copy in .build/canvas-jpg/, which exists for a design
canvas and is a quarter of the detail.  blob-sat is only 399 x 277, so the fit is
CAPPED at MIN_DPI and a small drawing prints SMALL rather than soft.  The build
prints the whole table every time.

THE LINE IS ONE LENGTH.  208.8 mm landscape, 105.8 mm portrait, on every row of
every page — NOT sized to the sentence.  A line cut to its sentence tells the
child how many words to expect before he has read the picture, which is a second
answer given away for free.  The one length has to hold the longest run of real
cards, so the build IMPORTS card_w from build_12 and measures every sentence
through the tin's own geometry: landscape's longest, "the sad dad sat in the
sand", is 174.6 mm and leaves 34.2 mm spare; portrait's longest, "the ant is
sad", is 89.9 mm and leaves 15.9.  G is READ from build_12.word_space() and
never typed here; if the tin's word space moves, these assertions move with it.

THE TIER COLOURS ARE IMPORTED.  SB.TIER_C, sheet 14's, and the hexes are not
re-declared anywhere in this file.  verify() reads the colours back out of the
finished PDF's content streams and compares them to SB.TIER_C, so a drift
between the deck and the mat cannot survive a build.

WHAT verify() STILL REFUSES.  The never-cut assertions are not deleted, they are
SCOPED: the only stroked paths on a page must be the row cut lines, at the row
boundaries, full width, at the house hairline weight — anything else stroked is
a guide that has no business here; and a BLANK page must carry no word of any
sentence, which is the whole point of the blank and is checked by striking the
caption out of the extracted text and finding no letter left.  A guided page is
checked the other way: what is left after the caption must be exactly its six
sentences, word for word.

Run:   python3 scripts/curriculum/writing-shelf/build_18_sentence_mats.py
           [--landscape | --portrait]      default: both
Needs: reportlab, Pillow, pikepdf, fontTools, numpy; pdftoppm (poppler) and
       pdftotext for the proofs, the raster clearance and the text checks.
       build_14 must have run at least once — this sheet reads its prepared art
       and does not re-prepare it.
"""

import base64
import hashlib
import re
import shutil
import zlib
import subprocess
import sys
from pathlib import Path

import numpy as np
import pikepdf
from PIL import Image
from fontTools import ttLib
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:            # build_12/14 import each other by name
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  the card measure
import build_14_sentence_builder_cards as SB  # noqa: E402  the sentences, TIER_C
import build_16_sentence_mats as M16          # noqa: E402  the word placement
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
ART_DIR = HERE / ".build" / "sentence-builder"
PROOF_DIR = HERE / ".build" / "proof"
SCRATCH = HERE / ".build" / "scratch"

PDF_TITLE = "Dark Phonics · Writing Shelf · sentence mats"
PDF_AUTHOR = W12.PDF_AUTHOR             # the set's, never re-typed
PRINT_NOTE = (
    "Dark Phonics · The Writing Shelf · Tray 5, sentence work — print 1-up onto "
    "A4 magnetic sheet, %s, 100%%, single-sided. Each tier comes twice: the "
    "guided page first, the blank page after it. Cut along the grey lines, "
    "across only, for six row mats — or leave the page whole. Never laminate: "
    "a laminated magnet will not hold a magnetic card."
)

# ------------------------------------------------- what both sheets share ----
ROWS = 6
VARIANTS = ("guided", "blank")           # and IN THAT ORDER, through the file
TICK_W = 1.2                            # mm — the start tick's width
LINE_T = 1.2                            # mm — the line's thickness

# THE CARD BAND is build_12's card, 28.0 mm tall, centred in the row: the tick
# is drawn to it, so a card laid against the tick sits square in the row.
# BASELINE is build_12's too — the card's coloured rule has its TOP on the
# baseline, so the mat's line has its top there as well and a laid card covers
# it exactly.  Both are IMPORTED; neither is a number chosen here.
BAND_H = W12.CARD_H                     # 28.0
BASELINE = W12.BASELINE                 # 9.0 mm — up from the band's bottom edge

# ART_CLEAR is the paper between a picture and the cut line above or below it.
# It is 2.0 because that is what the landscape row ALREADY leaves round its card
# band — 28 mm of band in a 32 mm row — and the band is not negotiable.  So 2.0
# is the whole clearance this mat has anywhere, and holding the art to the same
# figure means no mark on the page is nearer a blade than the tick already was.
# cutmarks.CONTENT_CLEAR is 4.0 and is the right figure for a sheet of small
# laminated cards; it cannot be had here without shrinking the card band, which
# would stop a real card sitting square in the row.
ART_CLEAR = 2.0

# ------------------------------------------------------------- adult text ----
# The ONLY adult type on either page, in sheet 12's voice, at sheet 12's size
# and in its grey.  It sits in the bottom margin, BELOW the last cut line, so
# the six row mats carry no adult writing at all and the caption goes with the
# trim.  Its baseline is not typed: caption_y() centres the caption's real ink
# between the printer-safe margin under it and that cut line over it.
# The guide words' grey: build_12's, never re-typed here.  See the docstring for
# why it is not the tier colour and not the lighter #8C857B.
WORD_C = W12.CHARCOAL_C                 # #4F4A44

ADULT_FONT = W12.ADULT_FONT
FOOT_SIZE = W12.FOOT_SIZE               # 5.5
FOOT_C = W12.LABEL_C                    # #5F594F, the set's adult grey
SAFE = CM.SAFE                          # 5.5 mm — the printer-safe margin

CAPTION = {
    "guided": ("sentence mat · %s · guided — the word cards lie on the printed "
               "words, left to right from the tick · cut along the grey lines "
               "for six row mats · never laminate"),
    "blank": ("sentence mat · %s · blank — the word cards go on the rule, left "
              "to right from the tick · cut along the grey lines for six row "
              "mats · never laminate"),
}

# reportlab writes a coordinate rounded to 0.01 pt, so a mark laid EXACTLY on the
# margin reads back out of the PDF up to 0.0036 mm the wrong side of it.  The
# margin assertion is held to the file's own precision rather than to a finer
# one it cannot carry: at 1e-6 mm the cut lines, which run edge to edge by
# construction, fail on the rounding alone.
PDF_ROUND = 0.01 / 72.0 * 25.4          # 0.00353 mm — one unit of what is written

# ---------------------------------------------------------------- the art ----
MIN_DPI = 200.0                         # nothing prints softer than this, ever

INK_TOL = 0.1                           # mm — printed word vs where its card lands
CLEAR_DPI = 300                         # the raster the clearance is measured on
CLEAR_MIN = 0.1                         # mm — the least ink-to-cut gap allowed

TIERS = (1, 2, 3)

# WHICH TIERS GET A PORTRAIT MAT.  One line, and it is the ONLY line to touch to
# add one — everything downstream is measured, not typed.  BLUE IS IN: its
# longest run, "a fox in a box", is 91.6 mm on the 105.8 mm line with 14.2 mm
# spare, and its widest drawing, cat-naps, comes to 58.1 mm inside the 80 mm
# box — the box is set by pink's sun-sat at 77.8 and blue does not reach it.
# GREEN
# CANNOT BE BUILT IN THIS FORMAT AT ALL: "the sad dad sat in the sand" is
# 174.6 mm of word cards against a 105.8 mm line, and it is not alone — "the cat
# can jump" is 111.8 and "the penguin spat" 106.9, so three of green's six
# overrun.  No geometry here shortens a sentence; the sentences themselves have
# to change in writing-shelf-language.ts first, and check_runs() will refuse the
# build, by name and by millimetre, until they do.
PORTRAIT_TIERS = (1, 2)


# ----------------------------------------------------------------- sheets ----
class Mat:
    """One mat's whole geometry, derived from the page and four numbers.

    Everything a row needs is computed from (page, margin, box width, tick x,
    line x) so the two orientations cannot disagree about what a row IS: the
    band, the baseline, the row height, the picture height and the line length
    all fall out of the page, and the only figures typed per sheet are the ones
    a ruler would read.
    """

    def __init__(self, key, name, page_w, page_h, margin, box_w, tick_x,
                 line_x, line_nominal, tiers, orient, proof_suffix):
        self.key, self.name, self.orient = key, name, orient
        self.page_w, self.page_h, self.margin = page_w, page_h, margin
        self.use_w = page_w - 2 * margin
        self.use_h = page_h - 2 * margin
        self.rows = ROWS
        self.row_h = self.use_h / ROWS   # the rows FILL the page; nothing over
        self.box_w = box_w
        self.box_h = self.row_h - 2 * ART_CLEAR      # clear of the cut lines
        self.tick_x, self.tick_w = tick_x, TICK_W
        self.line_x = line_x
        self.line_w = self.use_w - line_x     # ends ON the right margin
        self.line_nominal = line_nominal      # what check() holds it to
        self.line_t = LINE_T
        self.band_h, self.baseline = BAND_H, BASELINE
        self.band_y = (self.row_h - self.band_h) / 2.0
        self.foot_x, self.foot_y = margin, None     # filled by caption_y()
        self.tiers = tiers
        self.proof_suffix = proof_suffix

    @property
    def print_note(self):
        return PRINT_NOTE % self.orient

    def caption(self, tier, variant):
        return CAPTION[variant] % SB.TIER_NAME[tier]

    def captions(self):
        return [self.caption(t, v) for t in self.tiers for v in VARIANTS]

    def cut_ys(self):
        """Every row boundary, bottom to top: the 7 lines the blade follows."""
        return [self.margin + i * self.row_h for i in range(self.rows + 1)]

    def pages(self):
        """(tier, variant) a page, in file order: guided then blank, a tier."""
        return [(t, v) for t in self.tiers for v in VARIANTS]

    def run_x0(self):
        """Where the child's first card starts: the left end of the rule.

        Sheet 16's cards butt from the rule's left end, not from the tick — the
        tick is the mark he lines the first card up WITH, and the 1.0 mm of
        paper between them is what keeps the tick visible once it is laid.
        """
        return self.margin + self.line_x


# The landscape mat, sheet 18: 297 x 210 at a 9 mm margin, 6 rows of 32.0, the
# picture box set by star-sat, the line 208.8 mm from x 70.2 to the right margin.
LAND = Mat("landscape", "18-sentence-mats.pdf", 297.0, 210.0, 9.0,
           62.0, 68.0, 70.2, 208.8, TIERS, "landscape", "")

# The portrait mat, sheet 19: 210 x 297 at an 8 mm margin, 6 rows of 46.833, the
# picture box set by sun-sat, the line 105.8 mm from x 88.2 to the right margin.
# The 6 mm of paper between box and tick and the 1.0 mm between tick and line are
# the landscape mat's own gaps, carried over so a child who has worked one mat
# reads the other without being told anything.
PORT = Mat("portrait", "19-sentence-mats-portrait.pdf", 210.0, 297.0, 8.0,
           80.0, 86.0, 88.2, 105.8, PORTRAIT_TIERS, "portrait", "-portrait")

SHEETS = {"landscape": LAND, "portrait": PORT}


# ---------------------------------------------------------------- layout ----
def rows_of(tier):
    """The tier's six sentences, in SENTENCE_BUILDER_CARDS order.

    Grouped by the GROUP tier — the tray the card sits in — which is what puts
    the carried fox-box card on the BLUE mat beside the blue words it is worked
    with, even though sheet 14 gives it a pink frame.
    """
    # THE PRINTED FORM — build_14.display() is the one place the capital and
    # the full stop are added, and the guided page, the card run it is measured
    # against and the tin's own cards all come through it.
    return [(slug, SB.display(sentence))
            for slug, group, sentence, _art, _frame in SB.CARDS
            if group == tier]


def row_y(s, i):
    """(bottom, top) of row i, 0 being the top row.  Stacked from the top margin."""
    top = s.page_h - s.margin - i * s.row_h
    return top - s.row_h, top


def art_path(slug):
    p = ART_DIR / ("%s.jpg" % slug)
    if not p.exists():
        raise SystemExit(
            "missing prepared art: %s\n  run build_14_sentence_builder_cards.py "
            "first — this sheet reads its .build art and never re-prepares it."
            % p)
    return p


def fit(s, px):
    """CONTAIN the art in the picture box, then cap it at MIN_DPI.

    Returns (w_mm, h_mm, dpi, capped).  One scale for both axes, so the aspect
    is never touched; the cap only ever makes the drawing SMALLER.
    """
    w, h = px
    k = min(s.box_w / float(w), s.box_h / float(h))     # mm per pixel, contain
    cap = 25.4 / MIN_DPI                                # mm per pixel at MIN_DPI
    capped = k > cap
    k = min(k, cap)
    return w * k, h * k, 25.4 / k, capped


def art_table(s):
    """Every row of every page of THIS sheet: slug, tier, sentence, px, mm, dpi."""
    out = []
    for tier in s.tiers:
        for slug, sentence in rows_of(tier):
            p = art_path(slug)
            with Image.open(p) as im:
                px = im.size
            dw, dh, dpi, capped = fit(s, px)
            out.append((slug, tier, sentence, p, px, dw, dh, dpi, capped))
    return out


# ---------------------------------------------------------------- measure ----
def run_mm(sentence):
    """The sentence as REAL CARDS: build_12's measured widths, butted."""
    return sum(W12.card_w(word) for word in sentence.split())


def check_runs(s):
    """Every sentence's card run must fit the one line.  Returns the tightest."""
    bad, margins = [], []
    for slug, _tier, sentence, _p, _px, _w, _h, _d, _c in art_table(s):
        run = run_mm(sentence)
        margins.append((s.line_w - run, slug, sentence, run))
        if run > s.line_w + 1e-9:
            bad.append("%s: %r is %.1f mm of card and the line is %.1f mm"
                       % (slug, sentence, run, s.line_w))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return sorted(margins)


def caption_ink(text):
    """The caption's REAL ink above and below its baseline, in mm.

    getAscentDescent hands back the FACE's ascent and descent, which on Andika
    are 1.22 and 0.39 em — the room a line of type is given, not the room these
    glyphs use.  The bottom margin is 8 mm on the portrait sheet and the window
    between the printer-safe 5.5 and the last cut line is 2.50 mm, which the
    face's 3.13 mm of nominal line does not fit and this caption's 2.00 mm of
    actual ink does.  So the caption is measured on the OUTLINES OF THE
    CHARACTERS IT ACTUALLY SETS, from the same TTF reportlab embeds — a real
    bound, tighter than the nominal one, and it moves if the caption's wording
    ever grows a taller letter.
    """
    f = ttLib.TTFont(str(W12.ADULT_TTF))
    upm = float(f["head"].unitsPerEm)
    cmap, glyf = f.getBestCmap(), f["glyf"]
    top, bot = -1e9, 1e9
    for ch in set(text):
        g = cmap.get(ord(ch))
        if g is None:
            raise SystemExit("SPEC FAILURE: the caption sets %r and %s has no "
                             "glyph for it" % (ch, W12.ADULT_TTF.name))
        gl = glyf[g]
        if gl.numberOfContours:
            top, bot = max(top, gl.yMax), min(bot, gl.yMin)
    k = FOOT_SIZE / upm / 72.0 * 25.4
    return bot * k, top * k


def caption_y(s):
    """The caption's baseline: its ink CENTRED in the margin it has to live in.

    Below it the printer-safe margin, above it the last cut line at the foot of
    row 6.  Centring is not a nicety — on the portrait sheet the window is
    2.50 mm and the ink is 2.00, so a quarter of a millimetre each side is the
    whole of the room there is, and putting the baseline anywhere by hand spends
    it on one side.  Returns (baseline, ink floor, ink head, slack a side).
    """
    inks = [caption_ink(t) for t in s.captions()]
    down, up = min(d for d, _u in inks), max(u for _d, u in inks)
    lo, hi = SAFE, s.margin                      # the window, bottom and top
    slack = ((hi - lo) - (up - down)) / 2.0
    y = lo - down + slack
    return y, y + down, y + up, slack


def printed_words(s, sentence):
    """Where this mat prints each word: build_16's ink-aligned run, imported.

    [(word, pen_x, ink_x0, ink_x1)] in absolute mm.  drawString takes the PEN
    origin and the ink starts one left side bearing further right, so the
    bearing comes off the position — which is build_16's arithmetic, not a
    second one invented here.
    """
    return [(w, i0 - W12.glyph_box(w)[0], i0, i1)
            for w, i0, i1 in M16.printed_run(sentence, s.run_x0())]


def line_segments(s, sentence):
    """The line as drawn, with the descender gaps cut out.  Sheet 16's, imported.

    descender_gaps measures the tail across build_16's 2.0 mm rule band, which is
    DEEPER than this sheet's 1.2 mm line, so the notch it returns is a superset
    of the one this line strictly needs: the same notch the felt mat cuts, and
    conservative here.  check() asserts separately that no glyph crosses this
    thinner line without qualifying for a knockout at all.
    """
    gaps = M16.descender_gaps(sentence, s.run_x0()) if sentence else []
    segs, merged = M16.rule_segments(s.run_x0(), gaps, s.line_w)
    return segs, gaps, merged


# ------------------------------------------------------------------ check ----
def check(s):
    """The geometry, before a single mark is made."""
    bad = []
    if abs(s.rows * s.row_h - s.use_h) > 1e-9:
        bad.append("%d rows of %.3f mm do not fill the %.1f mm of usable height"
                   % (s.rows, s.row_h, s.use_h))
    if abs(s.line_x + s.line_w - s.use_w) > 1e-9:
        bad.append("the line does not end on the right margin")
    if abs(s.line_w - s.line_nominal) > 1e-9:
        bad.append("the line is %.3f mm, not %.1f" % (s.line_w, s.line_nominal))
    if s.box_w > s.tick_x - 1e-9:
        bad.append("the picture box runs into the start tick")
    if s.tick_x + s.tick_w > s.line_x + 1e-9:
        bad.append("the start tick runs into the line")
    if s.band_y < ART_CLEAR - 1e-9:
        bad.append("the %.1f mm card band leaves only %.2f mm to the cut line, "
                   "under the %.1f mm everything else keeps"
                   % (s.band_h, s.band_y, ART_CLEAR))
    if s.baseline - s.line_t < 0 or s.baseline > s.band_h:
        bad.append("the line does not sit inside the card band")
    # THE ART MUST CLEAR THE WIDEST DRAWING.  This is the number the box was set
    # by — star-sat landscape, sun-sat portrait — and it is asserted rather than
    # trusted because the art can be re-prepared.
    widest = max((fit(s, px)[0], slug) for slug, _t, _s, _p, px, *_r in art_table(s))
    if widest[0] > s.box_w + 1e-9:
        bad.append("%s is drawn %.2f mm wide, over the %.1f mm box"
                   % (widest[1], widest[0], s.box_w))
    # THE CAPTION: its ink centred in the margin under the last cut line.
    y, floor, head, slack = caption_y(s)
    if slack < 0:
        bad.append("the caption's %.2f mm of ink does not fit the %.2f mm "
                   "between the safe margin and the cut line"
                   % (head - floor, s.margin - SAFE))
    for cap in s.captions():
        w = pdfmetrics.stringWidth(cap, ADULT_FONT, FOOT_SIZE) / 72.0 * 25.4
        if w > s.use_w + 1e-9:
            bad.append("the caption is %.1f mm wide, over the %.1f mm of page"
                       % (w, s.use_w))
    # EVERY TAIL THAT CROSSES THIS LINE MUST BE KNOCKED OUT OF IT.  build_16
    # knocks a glyph out when it reaches KNOCK_MIN (1.0 mm) below the baseline,
    # which is the lower half of ITS 2.0 mm rule; this line is 1.2 mm and its
    # lower half starts at 0.6.  A glyph landing between the two would notch
    # this rule and not be cleared for it.  In this face at this size nothing
    # does — the deepest non-descender is `a` at -0.19 mm — and this is where
    # that is asserted rather than remembered.
    f = W12._ttf()
    k = W12.SIZE / float(f["head"].unitsPerEm) / 72.0 * 25.4
    glyf = f["glyf"]
    for ch in sorted({c for _s, _t, sen, *_r in art_table(s)
                      for w in sen.split() for c in w}):
        depth = glyf[W12.gname(ch)].yMin * k
        if -M16.KNOCK_MIN < depth <= -s.line_t / 2.0:
            bad.append("%r reaches %.2f mm below the baseline: into the %.1f mm "
                       "line and not deep enough for build_16's %.1f mm knockout"
                       % (ch, depth, s.line_t, M16.KNOCK_MIN))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return y, floor, head


# ------------------------------------------------------------------ draw ----
def draw_row(c, s, i, jpg, dw, dh, colour, sentence):
    bot, _top = row_y(s, i)
    left = s.margin
    # the picture: left-aligned in the box, centred in the row, ART_CLEAR of
    # paper between it and the cut line above and below
    c.drawImage(str(jpg), left * mm, (bot + (s.row_h - dh) / 2.0) * mm,
                width=dw * mm, height=dh * mm, mask=None)
    band_bot = bot + s.band_y
    base = band_bot + s.baseline
    c.saveState()
    c.setFillColor(colour)
    # the start tick
    c.rect((left + s.tick_x) * mm, band_bot * mm, s.tick_w * mm, s.band_h * mm,
           stroke=0, fill=1)
    # the line — its TOP on the baseline, where a laid card's own rule sits,
    # with a notch left round every descender that would cross it
    segs, gaps, _merged = line_segments(s, sentence)
    for a, b in segs:
        c.rect(a * mm, (base - s.line_t) * mm, (b - a) * mm, s.line_t * mm,
               stroke=0, fill=1)
    # the words, if this is the guided page: each at the x its CARD's ink lands
    if sentence:
        c.setFillColor(WORD_C)          # the guide is grey; the rule stays pink
        c.setFont(W12.WORD_FONT, W12.SIZE)
        for word, pen_x, _i0, _i1 in printed_words(s, sentence):
            c.drawString(pen_x * mm, base * mm, word)
    c.restoreState()
    return segs, gaps


def draw_cuts(c, s):
    """The row cut lines, in cutmarks.py's standard: full width, triangled."""
    return CM.cut_lines(c, [], [(y, 0.0, s.page_w) for y in s.cut_ys()],
                        s.page_w, s.page_h)


def draw_page(c, s, tier, variant, table, cuts=True):
    colour = SB.TIER_C[tier]
    rows = [r for r in table if r[1] == tier]
    drawn = []
    for i, (slug, _t, sen, jpg, _px, dw, dh, _d, _c) in enumerate(rows):
        drawn.append((slug, sen) + draw_row(c, s, i, jpg, dw, dh, colour,
                                            sen if variant == "guided" else None))
    if cuts:
        draw_cuts(c, s)
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(s.foot_x * mm, s.foot_y * mm, s.caption(tier, variant))
    c.restoreState()
    return drawn


def write_pdf(s, path, table, cuts=True):
    c = canvas.Canvas(str(path), pagesize=(s.page_w * mm, s.page_h * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(s.print_note)
    drawn = []
    for tier, variant in s.pages():
        drawn.append(draw_page(c, s, tier, variant, table, cuts=cuts))
        c.showPage()
    c.save()
    return drawn


# ----------------------------------------------------------------- verify ----
def embedded_jpeg(obj):
    """The JPEG bytes AS THEY WERE WRITTEN, out of an image XObject.

    reportlab ASCII85-wraps the DCTDecode stream, so the raw buffer is not the
    file's bytes and a naive hash of it matches nothing.  Every filter BEFORE
    the DCTDecode is undone here and the DCT stream itself is handed back
    untouched — which is the original JPEG, byte for byte, so the row can be
    hashed against the source file rather than trusted by its name.
    """
    data = bytes(obj.get_raw_stream_buffer())
    filters = obj.get("/Filter")
    names = ([str(filters)] if isinstance(filters, pikepdf.Name)
             else [str(f) for f in (filters or [])])
    for name in names:
        if name == "/ASCII85Decode":
            data = base64.a85decode(data, adobe=True)
        elif name == "/FlateDecode":
            data = zlib.decompress(data)
        elif name == "/DCTDecode":
            return data                  # the JPEG itself; stop here
        else:
            raise SystemExit("VERIFY FAILURE: unexpected image filter %s" % name)
    raise SystemExit("VERIFY FAILURE: an embedded image is not a JPEG")


def _ops(page):
    """(operator, operands) of a page's content stream, flattened."""
    return [(str(op), list(operands))
            for operands, op in pikepdf.parse_content_stream(page)]


def _font_kinds(page):
    """Resource name -> 'word' | 'adult', read off the embedded BaseFonts."""
    out = {}
    for name, obj in dict(page.Resources.get("/Font", {})).items():
        base = str(obj.get("/BaseFont", ""))
        out[str(name)] = "word" if W12.WORD_FONT in base else "adult"
    return out


def page_marks(page):
    """Everything one page draws, sorted by what kind of mark it is.

    rects, images, fills, strokes (each stroked path as its points and width),
    and text placements (font kind, x, y, byte length of the string).
    """
    cm, path, width, fill = None, [], None, None
    rects, images, fills, strokes, text = [], [], [], [], []
    kinds, font, tm = _font_kinds(page), None, None
    for op, a in _ops(page):
        if op == "cm":
            cm = [float(x) for x in a]
        elif op == "re":
            rects.append([float(x) for x in a])
        elif op == "Do":
            images.append((str(a[0]), cm))
        elif op == "rg":
            fill = tuple(round(float(x), 6) for x in a)
            fills.append(fill)
        elif op == "RG":
            strokes.append(tuple(round(float(x), 6) for x in a))
        elif op == "w":
            width = float(a[0])
        elif op in ("m", "l"):
            path.append((float(a[0]), float(a[1])))
        elif op == "Tf":
            font = kinds.get(str(a[0]), "?")
        elif op == "Tm":
            tm = [float(x) for x in a]
        elif op == "Tj" and tm is not None:
            text.append((font, tm[4], tm[5], len(bytes(a[0])), fill))
        elif op in ("S", "s"):
            yield_path, path = list(path), []
            strokes.append(("path", yield_path, width))
        elif op in ("f", "F", "f*", "B", "B*", "b", "b*", "n"):
            path = []
    return dict(rects=rects, images=images, fills=fills, strokes=strokes,
                text=text)


def verify(s, pdf, table):
    """Read the FINISHED PDF back and prove every claim this file makes."""
    bad = []
    want_pt = (s.page_w / 25.4 * 72.0, s.page_h / 25.4 * 72.0)
    pages = s.pages()
    src_hash = {}
    for slug, _t, _sen, p, *_r in table:
        src_hash.setdefault(hashlib.sha256(p.read_bytes()).hexdigest(), set()).add(slug)
    worst_ink = (0.0, None)

    with pikepdf.open(pdf) as doc:
        if len(doc.pages) != len(pages):
            bad.append("%d pages, not %d" % (len(doc.pages), len(pages)))
        seen_hashes, drawn = set(), []
        for pno, page in enumerate(doc.pages):
            tier, variant = pages[pno]
            mb = [float(v) for v in page.MediaBox]
            w, h = mb[2] - mb[0], mb[3] - mb[1]
            if abs(w - want_pt[0]) > 0.01 or abs(h - want_pt[1]) > 0.01:
                bad.append("page %d is %.2f x %.2f mm, not %.0f x %.0f"
                           % (pno + 1, w / 72 * 25.4, h / 72 * 25.4,
                              s.page_w, s.page_h))
            xobj = page.Resources.get("/XObject", {})
            M = page_marks(page)
            # --- STROKES: the cut lines, and NOTHING ELSE.  This is the old
            # never-cut assertion turned the right way round: a stroked path
            # that is not a row boundary at hairline weight is a guide line
            # sneaking on, and it still fails the build.
            paths = [p for p in M["strokes"] if isinstance(p, tuple) and p[0] == "path"]
            colours = [p for p in M["strokes"] if not (isinstance(p, tuple) and p and p[0] == "path")]
            want_ys = sorted(s.cut_ys())
            got_ys = []
            for _tag, pts, width in paths:
                if len(pts) != 2 or abs(pts[0][1] - pts[1][1]) > 0.01:
                    bad.append("page %d strokes a path that is not a horizontal "
                               "cut line: %s" % (pno + 1, pts))
                    continue
                if abs(width / 72.0 * 25.4 - CM.HAIR_W) > 1e-6:
                    bad.append("page %d strokes a cut line %.3f mm wide, not the "
                               "house %.2f" % (pno + 1, width / 72.0 * 25.4,
                                               CM.HAIR_W))
                x0, x1 = sorted(p[0] / 72.0 * 25.4 for p in pts)
                if abs(x0) > 0.01 or abs(x1 - s.page_w) > 0.01:
                    bad.append("page %d: a cut line runs %.2f to %.2f mm, not "
                               "edge to edge" % (pno + 1, x0, x1))
                got_ys.append(pts[0][1] / 72.0 * 25.4)
            got_ys.sort()
            if len(got_ys) != len(want_ys) or any(
                    abs(a - b) > 0.01 for a, b in zip(got_ys, want_ys)):
                bad.append("page %d cuts at %s, not at the row boundaries %s"
                           % (pno + 1, ["%.2f" % v for v in got_ys],
                              ["%.2f" % v for v in want_ys]))
            hair = tuple(round(v, 6) for v in
                         (CM.HAIR_C.red, CM.HAIR_C.green, CM.HAIR_C.blue))
            # the triangle SETS a stroke colour it never strokes with
            # (drawPath(stroke=0)); the hairline is the only thing stroked.
            mark = tuple(round(v, 6) for v in
                         (CM.MARK_C.red, CM.MARK_C.green, CM.MARK_C.blue))
            if hair not in set(colours) or set(colours) - {hair, mark}:
                bad.append("page %d strokes in %s, not the cutmarks hairline grey"
                           % (pno + 1, sorted(set(colours))))
            # --- the rects: ticks and line segments, all inside the margins
            rows = [r for r in table if r[1] == tier]
            want_rects = ROWS + sum(len(line_segments(
                s, sen if variant == "guided" else None)[0])
                for _slug, _t, sen, *_r in rows)
            if len(M["rects"]) != want_rects:
                bad.append("page %d draws %d rects, not the %d ticks and line "
                           "segments" % (pno + 1, len(M["rects"]), want_rects))
            for x, y, rw, rh in M["rects"]:
                x, y, rw, rh = (v / 72.0 * 25.4 for v in (x, y, rw, rh))
                if (x < s.margin - PDF_ROUND or y < s.margin - PDF_ROUND
                        or x + rw > s.page_w - s.margin + PDF_ROUND
                        or y + rh > s.page_h - s.margin + PDF_ROUND):
                    bad.append("page %d: a rect at %.2f,%.2f %.2fx%.2f mm breaks "
                               "the %.1f mm margin"
                               % (pno + 1, x, y, rw, rh, s.margin))
            # --- the pictures: the right drawing, in the right row, sharp
            if len(M["images"]) != ROWS:
                bad.append("page %d draws %d images, not %d"
                           % (pno + 1, len(M["images"]), ROWS))
            order = sorted(M["images"], key=lambda im: -im[1][5])   # top row first
            for i, (name, m) in enumerate(order):
                if i >= len(rows):
                    break
                slug, _t, _sen, _p, px, dw, dh, dpi, _c = rows[i]
                obj = xobj[name]
                if str(obj.Subtype) != "/Image":
                    bad.append("page %d row %d holds a %s, not an image"
                               % (pno + 1, i + 1, obj.Subtype))
                    continue
                hsh = hashlib.sha256(embedded_jpeg(obj)).hexdigest()
                seen_hashes.add(hsh)
                if slug not in src_hash.get(hsh, set()):
                    bad.append("page %d row %d does not hold %s's source file — "
                               "the embedded JPEG hashes to %s..."
                               % (pno + 1, i + 1, slug, hsh[:16]))
                if int(obj.Width) != px[0] or int(obj.Height) != px[1]:
                    bad.append("%s is embedded at %dx%d, not %dx%d"
                               % (slug, int(obj.Width), int(obj.Height), *px))
                gw, gh = m[0] / 72.0 * 25.4, m[3] / 72.0 * 25.4
                if abs(gw - dw) > 0.01 or abs(gh - dh) > 0.01:
                    bad.append("%s is drawn %.2f x %.2f mm, not %.2f x %.2f"
                               % (slug, gw, gh, dw, dh))
                eff = max(px[0] / gw, px[1] / gh) * 25.4
                if eff < MIN_DPI - 1e-6:
                    bad.append("%s prints at %.0f dpi, under %.0f"
                               % (slug, eff, MIN_DPI))
                if abs(m[4] / 72.0 * 25.4 - s.margin) > 0.01:
                    bad.append("%s is not left-aligned on the %.1f mm margin"
                               % (slug, s.margin))
                drawn.append((slug, gw, gh, eff))
            # --- the fills: sheet 14's tier colour, the triangle ink, the grey
            tc = SB.TIER_C[tier]
            rgb = lambda col: tuple(round(v, 6) for v in
                                    (col.red, col.green, col.blue))
            want = {rgb(tc), rgb(CM.MARK_C), rgb(FOOT_C)}
            if variant == "guided":
                want.add(rgb(WORD_C))   # the guide words, and only them
            if set(M["fills"]) != want:
                bad.append("page %d fills %s; it should fill only %s"
                           % (pno + 1, sorted(set(M["fills"])), sorted(want)))
            # --- THE WORDS, WHERE THE CARDS LAND.  Read back out of the text
            # matrices: every printed word's ink must sit within INK_TOL of the
            # x its own card's ink occupies when the run is butted from the tick.
            words = [t for t in M["text"] if t[0] == "word"]
            expect_words = []
            if variant == "guided":
                for i, (_slug, _t, sen, *_r) in enumerate(rows):
                    bot, _top = row_y(s, i)
                    base = bot + s.band_y + s.baseline
                    for w, pen_x, ink0, _i1 in printed_words(s, sen):
                        expect_words.append((w, pen_x, ink0, base))
            if len(words) != len(expect_words):
                bad.append("page %d sets %d words, not %d"
                           % (pno + 1, len(words), len(expect_words)))
            else:
                order_w = sorted(words, key=lambda t: (-round(t[2], 1), t[1]))
                exp = sorted(expect_words, key=lambda t: (-round(t[3] / 25.4 * 72.0, 1), t[1]))
                for (_k, x, y, nb, fill), (w, pen_x, ink0, base) in zip(order_w, exp):
                    if fill != rgb(WORD_C):
                        bad.append("page %d sets %r in %s, not the guide grey "
                                   "%s — no glyph on this sheet is tier-coloured"
                                   % (pno + 1, w, fill, rgb(WORD_C)))
                    if nb != len(w):
                        bad.append("page %d sets a %d-byte string where %r goes"
                                   % (pno + 1, nb, w))
                    got_ink = x / 72.0 * 25.4 + W12.glyph_box(w)[0]
                    d = abs(got_ink - ink0)
                    if d > worst_ink[0]:
                        worst_ink = (d, w)
                    if d > INK_TOL:
                        bad.append("page %d: %r prints its ink at %.3f mm, "
                                   "%.3f mm off the %.3f its card lands on"
                                   % (pno + 1, w, got_ink, d, ink0))
                    if abs(y / 72.0 * 25.4 - base) > 0.01:
                        bad.append("page %d: %r sits off its baseline" % (pno + 1, w))
            adults = [t for t in M["text"] if t[0] == "adult"]
            if any(t[4] != rgb(FOOT_C) for t in adults):
                bad.append("page %d sets the caption in %s, not the adult grey"
                           % (pno + 1, [t[4] for t in adults]))
            if len(adults) != 1:
                bad.append("page %d sets %d adult strings, not the one caption"
                           % (pno + 1, len(adults)))
        if len(seen_hashes) != ROWS * len(s.tiers):
            bad.append("%d distinct images embedded, not %d"
                       % (len(seen_hashes), ROWS * len(s.tiers)))
        meta = " ".join(str(v) for v in doc.docinfo.values()) if doc.docinfo else ""
    # --- WHAT THE TEXT LAYER MAY SAY, PAGE BY PAGE.  A BLANK page must carry no
    # word of any sentence — that is the whole point of it — and a GUIDED page
    # must carry exactly its six, word for word.  Both are checked by striking
    # the page's own caption out of the extracted text and reading what is left.
    if shutil.which("pdftotext"):
        for pno, (tier, variant) in enumerate(pages, start=1):
            txt = subprocess.run(["pdftotext", "-f", str(pno), "-l", str(pno),
                                  str(pdf), "-"], check=True,
                                 capture_output=True, text=True).stdout
            rest = " ".join(txt.split()).replace(s.caption(tier, variant), " ")
            got = re.findall(r"[A-Za-z]+", rest)
            # letters only on both sides, so the full stop the last card
            # carries does not read as a word the page should not set — the
            # CAPITAL is still compared, which is the half that can go wrong.
            want_words = ([w for _slug, sen in rows_of(tier)
                           for w in re.findall(r"[A-Za-z]+", sen)]
                          if variant == "guided" else [])
            if sorted(got) != sorted(want_words):
                bad.append("page %d (%s %s) sets %r; it should set %r"
                           % (pno, SB.TIER_NAME[tier], variant,
                              sorted(got)[:12], sorted(want_words)[:12]))
    else:
        bad.append("no pdftotext: the guided/blank text checks did not run")
    if "laminate" not in meta.lower():
        bad.append("the print note no longer says the sheet is never laminated")
    if bad:
        raise SystemExit("VERIFY FAILURE:\n  " + "\n  ".join(bad))
    return drawn, worst_ink


# -------------------------------------------------------------- clearance ----
def clearance(s, table):
    """NOTHING MAY SIT ACROSS A CUT — proved on a raster, not on a drawing.

    The pages are drawn again WITHOUT their cut marks, rasterised at CLEAR_DPI,
    and every row of pixels that holds ink is measured against every row
    boundary.  Drawing the marks would beg the question: the hairline lies ON
    the boundary and the triangles straddle it, so a raster with them in it can
    only ever answer 'yes, there is ink on the cut line'.  Returns the tightest
    gap in mm and what owns it.
    """
    if not shutil.which("pdftoppm"):
        return None
    SCRATCH.mkdir(parents=True, exist_ok=True)
    tmp = SCRATCH / ("clear-%s.pdf" % s.key)
    write_pdf(s, tmp, table, cuts=False)
    mm_px = 25.4 / CLEAR_DPI
    tight = (1e9, None)
    for pno, (tier, variant) in enumerate(s.pages(), start=1):
        stem = SCRATCH / ("clear-%s-%d" % (s.key, pno))
        subprocess.run(["pdftoppm", "-r", str(CLEAR_DPI), "-gray", "-png",
                        "-f", str(pno), "-l", str(pno), "-singlefile",
                        str(tmp), str(stem)], check=True, capture_output=True)
        a = np.asarray(Image.open(str(stem) + ".png").convert("L"))
        rows_ink = np.nonzero(a.min(axis=1) < 250)[0]
        ys = s.page_h - (rows_ink + 0.5) * mm_px        # mm from the page foot
        for cy in s.cut_ys():
            d = np.abs(ys - cy)
            if len(d) and d.min() < tight[0]:
                tight = (float(d.min()),
                         "%s %s, the cut at %.1f mm"
                         % (SB.TIER_NAME[tier], variant, cy))
    if tight[0] < CLEAR_MIN:
        raise SystemExit("VERIFY FAILURE: ink comes within %.3f mm of a cut "
                         "line (%s); %.2f mm is the floor"
                         % (tight[0], tight[1], CLEAR_MIN))
    return tight


# ------------------------------------------------------------------ proof ----
def proof(s, pdf):
    """Every page to PNG at 150 dpi: mat-pink.png, mat-pink-guided.png, ….

    These are .build/proof/ files.  The felt mats' proofs of the same name live
    under public/dark-phonics-shelf/v2/mats/ and are a different sheet's; this
    build never writes there.
    """
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i, (tier, variant) in enumerate(s.pages(), start=1):
        stem = PROOF_DIR / ("mat-%s%s%s" % (SB.TIER_NAME[tier], s.proof_suffix,
                                            "-guided" if variant == "guided" else ""))
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i), "-l",
                        str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------ build ----
def build_sheet(s):
    table = art_table(s)
    s.foot_y = caption_y(s)[0]
    _y, floor, head = check(s)
    margins = check_runs(s)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / s.name
    write_pdf(s, out, table)

    _drawn, worst_ink = verify(s, out, table)
    tight = clearance(s, table)
    made = proof(s, out)

    # ------------------------------------------------------------- report ----
    print("  %-32s %d pp · A4 %s %.0f x %.0f mm · %d rows a page of %.3f mm · "
          "%d bytes"
          % (s.name, len(s.pages()), s.orient, s.page_w, s.page_h, s.rows,
             s.row_h, out.stat().st_size))
    print("    pages: %s" % ", ".join("%s %s" % (SB.TIER_NAME[t], v)
                                      for t, v in s.pages()))
    print("    CUT ACROSS ONLY: %d row cut lines in cutmarks' standard "
          "(%.2f mm hairline, edge to edge, a triangle each end at the %.1f mm "
          "safe margin); no vertical cut, and the only stroked paths on any "
          "page are those lines" % (len(s.cut_ys()), CM.HAIR_W, SAFE))
    print("    margin %.1f mm · picture box %.0f x %.3f left-aligned, %.1f mm "
          "clear of the cuts · tick %.1f mm at x %.1f · line %.1f mm thick, "
          "%.1f mm long, x %.1f to the right margin, %.1f mm up the %.1f mm band"
          % (s.margin, s.box_w, s.box_h, ART_CLEAR, s.tick_w, s.tick_x,
             s.line_t, s.line_w, s.line_x, s.baseline, s.band_h))
    print("    words: build_16's card_run/printed_run, %s at %.1f pt (x-height "
          "%.1f mm), in the guide grey #4F4A44; worst printed word %.2f µm off where "
          "its card's ink lands (%r), against a %.0f µm tolerance"
          % (W12.WORD_FONT, W12.SIZE, W12.X_HEIGHT, worst_ink[0] * 1000.0,
             worst_ink[1], INK_TOL * 1000.0))
    for tier in s.tiers:
        for slug, sen in rows_of(tier):
            _segs, gaps, _m = line_segments(s, sen)
            if gaps:
                print("      knockout %-6s %-13s %s"
                      % (SB.TIER_NAME[tier], slug,
                         ", ".join("%s of %r %.2f mm" % (ch, w, g1 - g0)
                                   for g0, g1, w, ch in gaps)))
    print("    tier colours imported from %s; read back out of every content "
          "stream and matched" % Path(SB.__file__).name)
    print("    caption: Andika %.1f pt at y %.2f — ink %.2f to %.2f mm, centred "
          "between the %.1f mm safe margin and the cut line at %.1f"
          % (FOOT_SIZE, s.foot_y, floor, head, SAFE, s.margin))
    print("    the line holds every real card run (G = %.3f mm, "
          "build_12.word_space)" % W12.word_space())
    print("      tightest  %-13s %-28s %6.1f mm of card, %5.1f mm spare"
          % (margins[0][1], margins[0][2], margins[0][3], margins[0][0]))
    print("      loosest   %-13s %-28s %6.1f mm of card, %5.1f mm spare"
          % (margins[-1][1], margins[-1][2], margins[-1][3], margins[-1][0]))
    caps = 0
    for slug, tier, sentence, _p, px, dw, dh, dpi, capped in table:
        caps += bool(capped)
        print("      %-6s %-13s %-28s %9s  %5.1f x %5.1f mm  %4.0f dpi%s"
              % (SB.TIER_NAME[tier], slug, sentence, "%dx%d" % px, dw, dh, dpi,
                 "  CAPPED at %.0f dpi" % MIN_DPI if capped else ""))
    lo = min(table, key=lambda r: r[7])
    hi = max(table, key=lambda r: r[7])
    print("      softest %s at %.0f dpi · sharpest %s at %.0f dpi · floor %.0f "
          "· %d capped" % (lo[0], lo[7], hi[0], hi[7], MIN_DPI, caps))
    print("    %d distinct images embedded, one a row, each matched to its "
          "source file BY HASH" % (ROWS * len(s.tiers)))
    if tight:
        print("    nothing crosses a cut: tightest ink-to-cut gap %.2f mm (%s), "
              "measured on a %d dpi raster of the pages without their marks"
              % (tight[0], tight[1], CLEAR_DPI))
    else:
        print("    ! no pdftoppm: the cut clearance was NOT measured")
    if made:
        print("    proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                    ", ".join(p.name for p in made)))
    else:
        print("    ! no pdftoppm: the proofs were NOT rendered")
    return out


def build(which=("landscape", "portrait")):
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()   # card_w measures off the real font
    n_src = SB.check_source()
    print("sentence mats -> %s" % OUT_DIR)
    print("  source of truth %s: %d sentence cards, matched"
          % (SB.SOURCE_TS.name, n_src))
    print("  art from %s (the prepared full-resolution JPEGs, not "
          ".build/canvas-jpg)" % ART_DIR.relative_to(REPO))
    for key in which:
        build_sheet(SHEETS[key])


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a.startswith("--")]
    unknown = [a for a in args if a not in ("--landscape", "--portrait")]
    if unknown:
        raise SystemExit("usage: build_18_sentence_mats.py "
                         "[--landscape | --portrait]   (default: both)")
    picked = tuple(a[2:] for a in args) or ("landscape", "portrait")
    build(picked)
