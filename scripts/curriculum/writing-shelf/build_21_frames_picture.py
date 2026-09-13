#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheets 21 and 22, THE SENTENCE FRAMES WITH A PICTURE

Sheet 20 gives the child a row of grammar symbols over an empty line and asks him
to build a sentence of that SHAPE out of his own word cards.  It works, and it
leaves him with nothing to build a sentence ABOUT.  These two sheets are the same
frame with a subject at the left of the row, in the place the picture has held on
every other sheet of this tray — sheets 18 and 19 put the picture at the left and
the line to its right, and a child who has worked those mats reads this row the
same way without being told.

TWO SHEETS, ONE GEOMETRY, ONE DIFFERENCE.
    21  draw   a SOLID 44 mm square.  He draws his own subject in it, then
               builds the sentence he has just drawn.  Paper, once.
    22  tile   a DASHED 44 mm square, in sheet 17's own dashed-placeholder
               language — 0.35 alpha, 1.2/1.2 mm dash, the house hairline.  A
               44 mm picture tile off sheet 23 LANDS on it, and the sheet is
               laminated and worked again and again.
Everything else on the two pages is identical to the millimetre, and check()
proves it: the same rows, the same symbols, the same line, the same tick.  A
child moving between them is looking at one material in two states.

WHY THE PICTURE IS 44 mm AND WHY THE ROW IS 46.833.
44 mm is the tile, fixed.  A 44 mm square will not stand in sheet 20's 43 mm row,
so the row grows to (297 - 16) / 6 = 46.8333 mm — which is sheet 19's portrait row
exactly, arrived at from the other end, and six rows still fill the page.  The
44 mm square is centred in it with 1.4167 mm of paper to each cut, and the 41 mm
symbol-gap-card stack is centred in it with 2.9167 mm.  Both clearances are read
off the raster every build.

THE LINE IS SHORTER, AND THE SLOTS SHRINK WITH IT — PROPORTIONALLY, ONCE.
The picture takes 44 mm of the 194 mm measure and a 4 mm gap takes 4 more, so the
line is 146.0 mm.  Sheet 20's slot widths are the proportion of the tin's card
classes and are IMPORTED, then multiplied by 146/194 and by nothing else, so the
noun stays the widest and the preposition the narrowest and this file holds no
second opinion about the classes.  Level 3 still SPANS THE MEASURE EXACTLY —
check() asserts it to the millimetre, as sheet 20 does on its own line.

AND THE GAP IS 4 mm BECAUSE OF ONE SENTENCE.  Level 3's own example, `The cat sat
in the box.`, is 142.6 mm of real butted card.  At a 6 mm gap the line is 144.0
and the example clears it by 1.4 mm, which is not clearance, it is luck.  At 4 mm
the line is 146.0 and it clears by 3.4.  The gap was set by the measurement and
check() re-measures it every build rather than trusting this paragraph.

NO WORD IS PRINTED HERE EITHER.  verify() extracts the text layer of every page
and refuses the build unless what comes out is the two-line adult caption at the
foot and nothing else.  That is sheet 20's whole premise and it survives the
addition of the picture.

THE FULL STOP still comes off Tray 5's punctuation dish, for sheet 20's reason:
the free-composition tin holds no stopped cards because the stop belongs to
whichever word he happens to end on.

Run:   python3 scripts/curriculum/writing-shelf/build_21_frames_picture.py
       [--draw | --tile]            (default: both)
Needs: reportlab, pikepdf, numpy, Pillow, fontTools; pdftoppm and pdftotext.
"""

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pikepdf
from PIL import Image
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  symbols, colours, cards
import build_17_grammar_work as G17           # noqa: E402  the dashed placeholder
import build_20_sentence_frames as F20        # noqa: E402  the frame this extends
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
PROOF_DIR = HERE / ".build" / "proof"
SCRATCH = HERE / ".build" / "scratch"

PDF_AUTHOR = W12.PDF_AUTHOR

# ------------------------------------------------------------------ page ----
PAGE_W, PAGE_H = F20.PAGE_W, F20.PAGE_H         # 210 x 297, sheet 20's
MARGIN = F20.MARGIN                             # 8.0, sheet 20's
ROWS = F20.ROWS                                 # 6, sheet 20's
FOOT = 11.0                     # mm — the strip of trim the caption is printed on
ROW_H = (PAGE_H - MARGIN - FOOT) / ROWS         # 46.3333 — six of them, top down

# --------------------------------------------------------------- the picture ----
PIC = 44.0                      # mm — the tile, square, and the box that draws one
PIC_W = CM.HAIR_W * 2.0         # 0.5 mm — the drawn box's rule, two hairlines
PIC_GAP = 3.5                   # mm — paper between the square's ink and the tick

# THE RULE IS CENTRED ON THE 44 mm BOUNDARY AND THE SQUARE IS INSET BY HALF OF IT.
# A 44 mm tile laid on the dashed square covers half the dashed rule and leaves
# half of it showing, which is the control of placement: the child sees the halo
# go even all the way round when the tile is square on its landing.  Centring the
# rule means its ink reaches PIC_W/2 OUTSIDE the square, so the square starts half
# a rule inside the margin and the measure below accounts for both halves.
PIC_X0 = MARGIN + PIC_W / 2.0                   # 8.25 — ink from exactly 8.0
PIC_INK = PIC + PIC_W                           # 44.5 — what the square costs

# ----------------------------------------------------------------- the line ----
FULL = PAGE_W - 2.0 * MARGIN                    # 194.0 — sheet 20's whole measure
MEASURE = FULL - PIC_INK - PIC_GAP              # 146.0 — what is left for the line
LINE_X = MARGIN + PIC_INK + PIC_GAP             # 56.0
SLOT_K = MEASURE / F20.MEASURE                  # 146 / 194, the one scale

SYM_BAND, BAND_GAP, CARD_BAND = F20.SYM_BAND, F20.BAND_GAP, F20.CARD_BAND
STACK = F20.STACK                               # 41.0
ROW_CLEAR = (ROW_H - STACK) / 2.0               # 2.9167
PIC_CLEAR = (ROW_H - PIC) / 2.0                 # 1.4167

BASELINE, LINE_T, TICK_W, TICK_H = F20.BASELINE, F20.LINE_T, F20.TICK_W, F20.TICK_H
LINE_C = F20.LINE_C                             # build_12's charcoal, imported twice removed
SLOT_SIDE = F20.SLOT_SIDE
FULL_LEVEL = F20.FULL_LEVEL
LEVELS = F20.LEVELS                             # the three shapes, imported whole

# the tin's proportions, scaled ONCE and never re-typed
SLOT_W = {cls: w * SLOT_K for cls, w in F20.SLOT_W.items()}

# ------------------------------------------------------------ adult text ----
ADULT_FONT, FOOT_SIZE, FOOT_C = F20.ADULT_FONT, F20.FOOT_SIZE, F20.FOOT_C
LEAD, FOOT_AIR, SAFE = F20.LEAD, F20.FOOT_AIR, F20.SAFE
PDF_ROUND, CLEAR_DPI, CLEAR_MIN, GEOM_TOL = (F20.PDF_ROUND, F20.CLEAR_DPI,
                                             F20.CLEAR_MIN, F20.GEOM_TOL)


# ---------------------------------------------------------------- variants ----
class Sheet:
    """One of the two sheets.  The ONLY difference is how the square is drawn."""

    def __init__(self, key, n, name, kind, title, caption_clause, print_clause):
        self.key, self.n, self.name, self.kind = key, n, name, kind
        self.title = title
        self.caption_clause = caption_clause
        self.print_clause = print_clause

    @property
    def pdf_title(self):
        return "Dark Phonics · Writing Shelf · %s" % self.title

    @property
    def print_note(self):
        return (
            "Dark Phonics · The Writing Shelf · Tray 5, free composition — print "
            "1-up onto A4, portrait, 100%%, single-sided. One level a page, six "
            "frames a page. Cut along the grey lines, across only, for six "
            "single frames — or leave the page whole. %s The child reads the "
            "symbols and builds a sentence of that shape from his word tins; "
            "the full stop comes from the punctuation dish." % self.print_clause)


SHEETS = {
    "draw": Sheet(
        "draw", 21, "21-sentence-frames-draw.pdf", "solid",
        "sentence frames with a drawing box",
        "he draws his subject in the square, then builds that sentence from his "
        "word cards",
        "The square at the left of every row is DRAWN IN — plain paper, worked "
        "once, not laminated."),
    "tile": Sheet(
        "tile", 22, "22-sentence-frames-tile.pdf", "dashed",
        "sentence frames with a picture-tile landing",
        "he lays a picture tile on the square, then builds a sentence about it "
        "from his cards",
        "The dashed square at the left of every row is where a 44 mm PICTURE "
        "TILE off sheet 23 lands — laminate this one and work it again and "
        "again."),
}

# ONE LINE, NOT SHEET 20'S TWO, AND THE 44 mm SQUARE IS WHY.  Six rows of a
# 44 mm picture take 278 of the 281 mm between the margins, so the foot this
# caption is printed on is 11 mm of trim and not sheet 20's 23.  A second line
# would have to come out of the rows, and the millimetre it would cost is the
# millimetre standing between the blade and a picture square.  What the second
# line said — that a long word may leave no room for another, and that a page
# cuts into six single frames — is in the print note and in the shelf's own
# entry for the sheet, where the adult reads it before printing rather than off
# a strip that goes in the bin.
CAPTION = ("level %d · %s — %s · the stop comes from the punctuation dish · %s")


def captions(s, level, parts, example):
    return (CAPTION % (level, " · ".join(parts), s.caption_clause, example),)


# ---------------------------------------------------------------- layout ----
def slot_run(parts):
    """(x0, width, class) a slot, from the LINE's left end, butted."""
    out, x = [], LINE_X
    for cls in parts:
        w = SLOT_W[cls]
        out.append((x, w, cls))
        x += w
    return out


def run_mm(parts):
    return sum(SLOT_W[cls] for cls in parts)


def cut_ys():
    return [PAGE_H - MARGIN - i * ROW_H for i in range(ROWS + 1)]


def row_y(i):
    top = PAGE_H - MARGIN - i * ROW_H
    return top - ROW_H, top


def row_bands(i):
    """(card_bot, card_top, sym_bot, sym_top, baseline) of row i."""
    bot, _top = row_y(i)
    card_bot = bot + ROW_CLEAR
    card_top = card_bot + CARD_BAND
    sym_bot = card_top + BAND_GAP
    return card_bot, card_top, sym_bot, sym_bot + SYM_BAND, card_bot + BASELINE


def pic_box(i):
    """(x0, y0, x1, y1) of row i's 44 mm square, centred in the row."""
    bot, _top = row_y(i)
    return PIC_X0, bot + PIC_CLEAR, PIC_X0 + PIC, bot + PIC_CLEAR + PIC


def sym_box(cls, x, w, sym_bot):
    sw, sh = F20.sym_size(cls)
    cx = x + w / 2.0
    return cx - sw / 2.0, sym_bot, cx + sw / 2.0, sym_bot + sh


def caption_ys():
    """Sheet 20's own placement, measured over THIS sheet's caption lines."""
    all_lines = [t for s in SHEETS.values()
                 for lvl, parts, ex in LEVELS for t in captions(s, lvl, parts, ex)]
    down = min(F20.caption_ink(t)[0] for t in all_lines)
    return MARGIN + FOOT_AIR - down


def caption_extent():
    all_lines = [t for s in SHEETS.values()
                 for lvl, parts, ex in LEVELS for t in captions(s, lvl, parts, ex)]
    down = min(F20.caption_ink(t)[0] for t in all_lines)
    up = max(F20.caption_ink(t)[1] for t in all_lines)
    y = caption_ys()
    return y + down, y + up


# ------------------------------------------------------------------ check ----
def check():
    """The geometry, before a single mark is made."""
    bad, runs = [], []
    if abs(ROW_CLEAR * 2.0 + STACK - ROW_H) > 1e-9:
        bad.append("the %.1f mm stack does not sit in the %.4f mm row" % (STACK, ROW_H))
    if abs(PIC_CLEAR * 2.0 + PIC - ROW_H) > 1e-9:
        bad.append("the %.1f mm picture does not sit in the %.4f mm row" % (PIC, ROW_H))
    if min(ROW_CLEAR, PIC_CLEAR) < CLEAR_MIN:
        bad.append("the row leaves %.3f mm to its cut lines, under the %.2f floor"
                   % (min(ROW_CLEAR, PIC_CLEAR), CLEAR_MIN))
    if abs(MARGIN + PIC_INK + PIC_GAP + MEASURE - (PAGE_W - MARGIN)) > 1e-9:
        bad.append("picture + gap + line does not fill the %.1f mm measure" % FULL)
    if abs(PIC_X0 - PIC_W / 2.0 - MARGIN) > 1e-9:
        bad.append("the square's rule does not start on the %.1f mm margin" % MARGIN)
    if PIC_CLEAR - PIC_W / 2.0 < CLEAR_MIN:
        bad.append("the square's ink comes within %.3f mm of a cut line"
                   % (PIC_CLEAR - PIC_W / 2.0))
    if abs(PAGE_H - MARGIN - FOOT - ROWS * ROW_H) > 1e-9:
        bad.append("six rows of %.4f do not run from the top margin to the %.1f mm "
                   "caption foot" % (ROW_H, FOOT))
    if abs(min(cut_ys()) - FOOT) > 1e-9:
        bad.append("the last cut is at %.4f mm, not on the %.1f mm foot"
                   % (min(cut_ys()), FOOT))

    # ---- the levels, on THIS line
    for level, parts, example in LEVELS:
        run = run_mm(parts)
        lo = sum(F20.class_forms(c)[0][0] for c in parts)
        hi = sum(F20.class_forms(c)[-1][0] for c in parts)
        ex = sum(W12.card_w(w) for w in example.rstrip(".").split())
        runs.append((level, parts, run, MEASURE - run, lo, hi, ex))
        if run > MEASURE + 1e-9:
            bad.append("level %d is %.1f mm of symbol run and the line is %.1f"
                       % (level, run, MEASURE))
        if level == FULL_LEVEL and abs(run - MEASURE) > 1e-9:
            bad.append("level %d must SPAN the line and comes to %.4f, not %.1f"
                       % (level, run, MEASURE))
        if lo > MEASURE + 1e-9:
            bad.append("level %d cannot be built at all: its SHORTEST run of real "
                       "cards is %.1f mm against a %.1f mm line" % (level, lo, MEASURE))
        if ex > MEASURE + 1e-9:
            bad.append("level %d's own example %r is %.1f mm of card against a "
                       "%.1f mm line — widen the line or change the example"
                       % (level, example, ex, MEASURE))

    # ---- every slot still carries its symbol with paper to spare
    fits = {}
    for cls in sorted(SLOT_W):
        forms = F20.class_forms(cls)
        n = len([f for f in forms if f[0] <= SLOT_W[cls] + 1e-9])
        fits[cls] = (n, len(forms), forms[0], forms[-1])
        sw, _sh = F20.sym_size(cls)
        if sw + 2.0 * SLOT_SIDE > SLOT_W[cls] + 1e-9:
            bad.append("the %s symbol is %.1f mm wide and leaves under %.1f mm of "
                       "paper each side of its %.2f mm slot"
                       % (cls, sw, SLOT_SIDE, SLOT_W[cls]))

    # ---- the slots are sheet 20's, scaled once and by one number
    for cls, w in SLOT_W.items():
        if abs(w - F20.SLOT_W[cls] * SLOT_K) > 1e-12:
            bad.append("the %s slot is not sheet 20's under the one scale" % cls)

    # ---- the two sheets differ in the square and in NOTHING else
    if {s.kind for s in SHEETS.values()} != {"solid", "dashed"}:
        bad.append("the two sheets no longer differ by the square alone")

    # ---- the caption
    for s in SHEETS.values():
        for level, parts, example in LEVELS:
            for text in captions(s, level, parts, example):
                w = pdfmetrics.stringWidth(text, ADULT_FONT, FOOT_SIZE) / 72.0 * 25.4
                if w > FULL + 1e-9:
                    bad.append("a caption line is %.1f mm wide, over the %.1f mm "
                               "measure: %r" % (w, FULL, text[:60]))
    floor, head = caption_extent()
    if floor < MARGIN - 1e-9:
        bad.append("the caption's ink falls to %.2f mm, under the %.1f margin"
                   % (floor, MARGIN))
    if head > min(cut_ys()) - 1e-9:
        bad.append("the caption's ink reaches %.2f mm, into the last cut line at "
                   "%.3f" % (head, min(cut_ys())))
    for y in cut_ys():
        if y < SAFE or y > PAGE_H - SAFE:
            bad.append("a cut line at y %.2f breaks the printer-safe margin" % y)

    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return runs, fits, (floor, head)


# ------------------------------------------------------------------- draw ----
def draw_picture(c, s, i):
    """Row i's 44 mm square: SOLID on sheet 21, sheet 17's DASH on sheet 22."""
    x0, y0, _x1, _y1 = pic_box(i)
    c.saveState()
    c.setStrokeColor(LINE_C)
    if s.kind == "dashed":
        c.setStrokeAlpha(G17.BOX_ALPHA)
        c.setLineWidth(CM.HAIR_W * mm)
        c.setDash([G17.BOX_DASH[0] * mm, G17.BOX_DASH[1] * mm])
    else:
        c.setLineWidth(PIC_W * mm)
    c.rect(x0 * mm, y0 * mm, PIC * mm, PIC * mm, stroke=1, fill=0)
    c.restoreState()


def draw_row(c, s, i, parts):
    """One frame: the square, the symbols, the writing line and the start tick."""
    card_bot, _ct, sym_bot, _st, base = row_bands(i)
    draw_picture(c, s, i)
    c.saveState()
    c.setFillColor(LINE_C)
    c.rect(LINE_X * mm, (base - LINE_T) * mm, MEASURE * mm, LINE_T * mm,
           stroke=0, fill=1)
    c.rect(LINE_X * mm, card_bot * mm, TICK_W * mm, TICK_H * mm, stroke=0, fill=1)
    c.restoreState()
    for x, w, cls in slot_run(parts):
        F20.draw_symbol(c, cls, x, w, sym_bot)


def draw_cuts(c):
    return CM.cut_lines(c, [], [(y, 0.0, PAGE_W) for y in cut_ys()], PAGE_W, PAGE_H)


def draw_page(c, s, level, parts, example, cuts=True):
    for i in range(ROWS):
        draw_row(c, s, i, parts)
    if cuts:
        draw_cuts(c)
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(MARGIN * mm, caption_ys() * mm, captions(s, level, parts, example)[0])
    c.restoreState()


def write_pdf(s, path, cuts=True):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(s.pdf_title)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(s.print_note)
    for level, parts, example in LEVELS:
        draw_page(c, s, level, parts, example, cuts=cuts)
        c.showPage()
    c.save()


# ----------------------------------------------------------------- verify ----
def verify(s, pdf, clean):
    """Read the FINISHED PDF back and prove every claim this file makes."""
    bad = []
    want_pt = (PAGE_W / 25.4 * 72.0, PAGE_H / 25.4 * 72.0)
    worst_geom = (0.0, None)
    rgb = F20.rgb

    with pikepdf.open(pdf) as doc, pikepdf.open(clean) as cdoc:
        if len(doc.pages) != len(LEVELS):
            bad.append("%d pages, not %d" % (len(doc.pages), len(LEVELS)))
        for pno, (level, parts, example) in enumerate(LEVELS):
            page, cpage = doc.pages[pno], cdoc.pages[pno]
            mb = [float(v) for v in page.MediaBox]
            if (abs(mb[2] - mb[0] - want_pt[0]) > 0.01
                    or abs(mb[3] - mb[1] - want_pt[1]) > 0.01):
                bad.append("page %d is not %.0f x %.0f mm" % (pno + 1, PAGE_W, PAGE_H))
            M, C = F20.page_marks(page), F20.page_marks(cpage)

            # ---- THE SYMBOLS
            want = []
            for i in range(ROWS):
                _cb, _ct, sym_bot, _st, _b = row_bands(i)
                for x, sw, cls in slot_run(parts):
                    want.append((cls,) + sym_box(cls, x, sw, sym_bot))
            got = [f for f in C["fills"] if f[0] != rgb(LINE_C)]
            if len(got) != len(want):
                bad.append("page %d draws %d symbols, not the %d its %d slots over "
                           "%d rows ask for"
                           % (pno + 1, len(got), len(want), len(parts), ROWS))
            else:
                # BY ROW, THEN ACROSS.  The rows are 46.33 mm apart and the
                # crescent's own curve reads back 0.01 mm below its neighbours'
                # feet, so the row key is rounded to a tenth: a hundredth lets
                # one symbol jump its row and pairs every symbol with the wrong
                # one.  0.1 mm cannot confuse two rows and cannot confuse two
                # symbols, which are 15 mm apart at the narrowest slot.
                got.sort(key=lambda f: (-round(f[2], 1), f[1]))
                want.sort(key=lambda t: (-round(t[2], 1), t[1]))
                for (col, gx0, gy0, gx1, gy1), (cls, wx0, wy0, wx1, wy1) in zip(got, want):
                    if col != rgb(W12.SYMBOL[cls][1]):
                        bad.append("page %d draws the %s symbol in %s, not the tin's "
                                   "%s" % (pno + 1, cls, col, rgb(W12.SYMBOL[cls][1])))
                    d = max(abs(gx0 - wx0), abs(gy0 - wy0), abs(gx1 - wx1), abs(gy1 - wy1))
                    worst_geom = max(worst_geom, (d, "%s, page %d" % (cls, pno + 1)))
                    if d > GEOM_TOL:
                        bad.append("page %d: the %s symbol reads back %.3f mm off"
                                   % (pno + 1, cls, d))

            # ---- THE LINE AND THE TICK: two charcoal rects a row, nothing else
            bars = [f for f in C["fills"] if f[0] == rgb(LINE_C)]
            if len(bars) != 2 * ROWS:
                bad.append("page %d draws %d charcoal bars, not the %d lines and "
                           "ticks" % (pno + 1, len(bars), 2 * ROWS))
            for _col, x0, y0, x1, y1 in bars:
                if abs(x1 - x0 - MEASURE) < 0.01:
                    if abs(y1 - y0 - LINE_T) > 0.01 or abs(x0 - LINE_X) > 0.01:
                        bad.append("page %d: a writing line is %.2f mm thick at x "
                                   "%.2f, not %.1f at %.1f"
                                   % (pno + 1, y1 - y0, x0, LINE_T, LINE_X))
                elif abs(x1 - x0 - TICK_W) < 0.01:
                    if abs(y1 - y0 - TICK_H) > 0.01 or abs(x0 - LINE_X) > 0.01:
                        bad.append("page %d: a start tick is %.2f mm tall at x %.2f"
                                   % (pno + 1, y1 - y0, x0))
                else:
                    bad.append("page %d draws a charcoal bar %.2f mm wide, neither "
                               "the line nor the tick" % (pno + 1, x1 - x0))

            # ---- THE PICTURE SQUARES: exactly ROWS of them, stroked, square, at
            # the left margin, in the charcoal, at THIS sheet's weight.
            squares = [st for st in C["strokes"] if st[0] == rgb(LINE_C)]
            if len(squares) != ROWS:
                bad.append("page %d strokes %d picture squares, not %d — this sheet "
                           "strokes the square and nothing else"
                           % (pno + 1, len(squares), ROWS))
            want_w = CM.HAIR_W if s.kind == "dashed" else PIC_W
            for _col, wid, pp in squares:
                if abs(wid - want_w) > 1e-6:
                    bad.append("page %d strokes a square %.3f mm wide, not the %s "
                               "sheet's %.2f" % (pno + 1, wid, s.kind, want_w))
                xs = [p[0] for p in pp]
                ys = [p[1] for p in pp]
                w, h = max(xs) - min(xs), max(ys) - min(ys)
                if abs(w - PIC) > 0.02 or abs(h - PIC) > 0.02:
                    bad.append("page %d strokes a %.2f x %.2f mm square, not %.1f"
                               % (pno + 1, w, h, PIC))
                if abs(min(xs) - PIC_X0) > 0.02:
                    bad.append("page %d strokes a square at x %.2f, not at %.2f — "
                               "half a rule inside the %.1f mm margin"
                               % (pno + 1, min(xs), PIC_X0, MARGIN))
            extra = {st[0] for st in C["strokes"]} - {rgb(LINE_C)}
            if extra:
                bad.append("page %d strokes in %s — the only stroke inside the "
                           "frames is the picture square" % (pno + 1, sorted(extra)))

            # ---- THE CUT LINES
            cuts = [st for st in M["strokes"] if st[0] == rgb(CM.HAIR_C)]
            if len(cuts) != ROWS + 1:
                bad.append("page %d strokes %d cut lines, not %d"
                           % (pno + 1, len(cuts), ROWS + 1))
            gotc = []
            for _col, wid, pp in cuts:
                if abs(wid - CM.HAIR_W) > 1e-6:
                    bad.append("page %d strokes a cut line %.3f mm wide" % (pno + 1, wid))
                if len(pp) != 2 or abs(pp[0][1] - pp[1][1]) > 0.01:
                    bad.append("page %d strokes a cut that is not horizontal" % (pno + 1))
                    continue
                x0, x1 = sorted(p[0] for p in pp)
                if abs(x0) > 0.01 or abs(x1 - PAGE_W) > 0.01:
                    bad.append("page %d: a cut line is not edge to edge" % (pno + 1))
                gotc.append(pp[0][1])
            if sorted(round(v, 2) for v in gotc) != sorted(round(v, 2) for v in cut_ys()):
                bad.append("page %d cuts at %s, not at the row boundaries"
                           % (pno + 1, sorted("%.2f" % v for v in gotc)))

            # ---- THE FILLS AND THE TYPE
            want_fill = {rgb(W12.SYMBOL[cls][1]) for cls in parts}
            want_fill |= {rgb(LINE_C), rgb(FOOT_C), rgb(CM.MARK_C)}
            got_fill = {f[0] for f in M["fills"]} | {t[0] for t in M["text"]}
            if got_fill != want_fill:
                bad.append("page %d fills %s; it should fill only %s"
                           % (pno + 1, sorted(got_fill), sorted(want_fill)))
            if len(M["text"]) != 1:
                bad.append("page %d sets %d strings, not the caption's one"
                           % (pno + 1, len(M["text"])))
            for col, tx, _ty, _nb in M["text"]:
                if col != rgb(FOOT_C):
                    bad.append("page %d sets type in %s, not the adult grey"
                               % (pno + 1, col))
                if abs(tx - MARGIN) > 0.01:
                    bad.append("page %d sets a caption line at x %.2f" % (pno + 1, tx))

            # ---- NOTHING CROSSES THE MARGIN
            for _col, x0, y0, x1, y1 in C["fills"]:
                if (x0 < MARGIN - PDF_ROUND or y0 < MARGIN - PDF_ROUND
                        or x1 > PAGE_W - MARGIN + PDF_ROUND
                        or y1 > PAGE_H - MARGIN + PDF_ROUND):
                    bad.append("page %d: a mark at %.2f,%.2f-%.2f,%.2f breaks the "
                               "%.1f mm margin" % (pno + 1, x0, y0, x1, y1, MARGIN))
        meta = " ".join(str(v) for v in doc.docinfo.values()) if doc.docinfo else ""
        if str(doc.docinfo.get("/Title", "")) != s.pdf_title:
            bad.append("the PDF Title is %r, not %r"
                       % (str(doc.docinfo.get("/Title", "")), s.pdf_title))
        if str(doc.docinfo.get("/Author", "")) != PDF_AUTHOR:
            bad.append("the PDF Author is not the set's")

    # ---- NO TEXT ANYWHERE EXCEPT THE FOOT CAPTION
    if shutil.which("pdftotext"):
        for pno, (level, parts, example) in enumerate(LEVELS, start=1):
            txt = subprocess.run(["pdftotext", "-f", str(pno), "-l", str(pno),
                                  str(pdf), "-"], check=True, capture_output=True,
                                 text=True).stdout
            got = " ".join(txt.split())
            want = " ".join(" ".join(captions(s, level, parts, example)).split())
            if got != want:
                bad.append("page %d's text layer reads %r; the only type on the "
                           "page is its caption" % (pno, got[:90]))
    else:
        bad.append("no pdftotext: the no-words-on-the-page assertion did NOT run")
    if "punctuation dish" not in meta.lower():
        bad.append("the print note no longer says where the full stop comes from")
    if bad:
        raise SystemExit("VERIFY FAILURE (%s):\n  %s" % (s.key, "\n  ".join(bad)))
    return worst_geom


# -------------------------------------------------------------- clearance ----
def clearance(clean):
    """NOTHING MAY SIT ACROSS A CUT, proved on a raster of the pages WITHOUT
    their marks.  Returns (tightest ink-to-cut mm, what owns it, four margins)."""
    if not shutil.which("pdftoppm"):
        return None
    px = 25.4 / CLEAR_DPI
    tight, edges = (1e9, None), (1e9, 1e9, 1e9, 1e9)
    for pno, (level, _p, _e) in enumerate(LEVELS, start=1):
        stem = SCRATCH / ("fp-clear-%s-%d" % (clean.stem, pno))
        subprocess.run(["pdftoppm", "-r", str(CLEAR_DPI), "-gray", "-png",
                        "-f", str(pno), "-l", str(pno), "-singlefile",
                        str(clean), str(stem)], check=True, capture_output=True)
        a = np.asarray(Image.open(str(stem) + ".png").convert("L"))
        ink = a < 250
        ys = PAGE_H - (np.nonzero(ink.any(axis=1))[0] + 0.5) * px
        xs = (np.nonzero(ink.any(axis=0))[0] + 0.5) * px
        for cy in cut_ys():
            d = np.abs(ys - cy)
            if len(d) and d.min() < tight[0]:
                tight = (float(d.min()), "level %d, the cut at %.2f mm" % (level, cy))
        edges = (min(edges[0], float(xs.min()) - MARGIN),
                 min(edges[1], (PAGE_W - MARGIN) - float(xs.max())),
                 min(edges[2], float(ys.min()) - MARGIN),
                 min(edges[3], (PAGE_H - MARGIN) - float(ys.max())))
    if tight[0] < CLEAR_MIN:
        raise SystemExit("VERIFY FAILURE: ink comes within %.3f mm of a cut line "
                         "(%s); %.2f mm is the floor" % (tight[0], tight[1], CLEAR_MIN))
    if min(edges) < -px:
        raise SystemExit("VERIFY FAILURE: ink crosses the %.1f mm margin by %.3f mm"
                         % (MARGIN, -min(edges)))
    return tight, edges


def same_but_the_square(cleans):
    """THE TWO SHEETS ARE ONE MATERIAL IN TWO STATES, and that is proved off the
    finished files rather than asserted in a docstring: every FILL of every page
    — symbols, line, tick — must match to the millimetre between them, and the
    only thing allowed to differ is the stroked square."""
    if len(cleans) < 2:
        return None
    keys = sorted(cleans)
    ref = None
    for key in keys:
        with pikepdf.open(cleans[key]) as doc:
            got = [sorted((f[0], round(f[1], 3), round(f[2], 3), round(f[3], 3),
                           round(f[4], 3)) for f in F20.page_marks(p)["fills"])
                   for p in doc.pages]
        if ref is None:
            ref, ref_key = got, key
        elif got != ref:
            raise SystemExit("VERIFY FAILURE: sheets %s and %s do not draw the same "
                             "frame — only the picture square may differ"
                             % (ref_key, key))
    return sum(len(p) for p in ref)


# ------------------------------------------------------------------ proof ----
def proof(s, pdf):
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(1, len(LEVELS) + 1):
        stem = PROOF_DIR / ("frames-%s-p%d" % (s.key, i))
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i), "-l", str(i),
                        "-singlefile", str(pdf), str(stem)], check=True,
                       capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------ build ----
def build(which=("draw", "tile")):
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()
    F20.W12.SIZE, F20.W12.SIZE_FROM = W12.SIZE, W12.SIZE_FROM
    runs, fits, (cfloor, chead) = check()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)

    print("sentence frames with a picture -> %s" % OUT_DIR)
    print("  row %.4f mm x %d = the page between its %.1f mm margins · picture "
          "%.1f mm square, %.4f mm clear of each cut · the %.1f mm stack %.4f clear"
          % (ROW_H, ROWS, MARGIN, PIC, PIC_CLEAR, STACK, ROW_CLEAR))
    print("  picture %.1f (%.1f of ink) + gap %.1f + line %.1f = the %.1f mm "
          "measure · slots are "
          "sheet 20's, scaled ONCE by %.4f, and level %d spans the line exactly"
          % (PIC, PIC_INK, PIC_GAP, MEASURE, FULL, SLOT_K, FULL_LEVEL))
    for level, parts, run, spare, lo, hi, ex in runs:
        print("    level %d  %-52s %6.2f mm of symbol run, %4.2f spare in %.1f"
              % (level, " · ".join(parts), run, spare, MEASURE))
        print("             real cards on the %.1f mm line: shortest %.1f, the "
              "example %r %.1f (%.1f spare), longest possible %.1f%s"
              % (MEASURE, lo, LEVELS[level - 1][2], ex, MEASURE - ex, hi,
                 "  — OVERRUNS by %.1f, and the line is the limit" % (hi - MEASURE)
                 if hi > MEASURE else ""))
    for cls in sorted(SLOT_W):
        n, tot, narrow, wide = fits[cls]
        sw, sh = F20.sym_size(cls)
        print("    %-12s spacing %5.2f mm · %2d of %2d printed cards fit (%r %.1f "
              "… widest of all %r %.1f) · symbol %4.1f x %4.1f mm, %s"
              % (cls, SLOT_W[cls], n, tot, narrow[1], narrow[0], wide[1], wide[0],
                 sw, sh, W12.SYMBOL[cls][0]))

    cleans = {}
    for key in which:
        s = SHEETS[key]
        out = OUT_DIR / s.name
        write_pdf(s, out)
        clean = SCRATCH / ("frames-%s-nomarks.pdf" % key)
        write_pdf(s, clean, cuts=False)
        cleans[key] = clean

        worst = verify(s, out, clean)
        tight = clearance(clean)
        made = proof(s, out)

        print("  %-30s sheet %d · %d pp · A4 portrait · %d frames a page · %d bytes"
              % (s.name, s.n, len(LEVELS), ROWS, out.stat().st_size))
        print("      the %s %.1f mm square at the left of every row — %s"
              % (s.kind.upper(), PIC, s.caption_clause))
        print("      NOT ONE WORD IS PRINTED: every page's text layer extracts to "
              "its one-line foot caption and nothing else")
        print("      symbols read back off the content stream, worst %.4f mm (%s) "
              "· line %.1f mm thick from x %.1f, tick %.1f x %.1f at its left end"
              % (worst[0], worst[1], LINE_T, LINE_X, TICK_W, TICK_H))
        print("      %d cut lines across only, cutmarks' %.2f mm hairline edge to "
              "edge — a page cuts into six single frames" % (ROWS + 1, CM.HAIR_W))
        if tight:
            (td, twhat), edges = tight
            print("      nothing crosses a cut: tightest ink-to-cut %.2f mm (%s) on "
                  "a %d dpi raster; floor %.2f" % (td, twhat, CLEAR_DPI, CLEAR_MIN))
            print("      margins: %.2f left, %.2f right, %.2f foot, %.2f head"
                  % edges)
        else:
            print("      ! no pdftoppm: the cut and margin clearances were NOT measured")
        if made:
            print("      proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                          ", ".join(p.name for p in made)))
    n_same = same_but_the_square(cleans)
    if n_same:
        print("  ONE MATERIAL IN TWO STATES: all %d fills of all %d pages are "
              "identical between the two sheets, read back off the finished files; "
              "only the stroked square differs" % (n_same, len(LEVELS)))
    print("  caption: Andika %.1f pt, ONE line on the %.1f mm foot — ink %.2f to "
          "%.2f mm, below the last cut at %.2f and clear of the %.1f mm margin"
          % (FOOT_SIZE, FOOT, cfloor, chead, min(cut_ys()), MARGIN))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a.startswith("--")]
    unknown = [a for a in args if a not in ("--draw", "--tile")]
    if unknown:
        raise SystemExit("usage: build_21_frames_picture.py [--draw | --tile]")
    build(tuple(a[2:] for a in args) or ("draw", "tile"))
