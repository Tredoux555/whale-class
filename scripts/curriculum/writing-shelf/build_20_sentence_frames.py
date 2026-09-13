#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 20, the EMPTY SENTENCE FRAMES

THE FRAME SUPPLIES THE GRAMMAR AND HE SUPPLIES THE WORDS.  Sheet 18/19's mats
give him eighteen FIXED sentences: a picture, a line, and — on the guided page —
the very words to lay.  This sheet is the step past them.  There is not one word
printed on it.  A row is a run of Montessori grammar symbols over a run of empty
card slots, and the child reads the symbols, goes to his word tins, and builds a
sentence of that SHAPE out of any words he can read.  Six frames to a page, three
pages, three shapes.

NO WORD IS PRINTED, AND THAT IS THE WHOLE SHEET.  verify() extracts the text
layer and refuses the build unless what comes out is the adult caption at the
foot and nothing else — no title, no example set in type, no faint guide word.
The example sentence is named in the caption, for the adult, in the adult's grey,
below the last cut line, and it goes in the bin with the trim.

THE THREE LEVELS, AND WHY THE THIRD ONE IS THE THIRD ONE
    1   article · noun · verb                                 The cat sat.
    2   article · adjective · noun · verb                      The sad cat sat.
    3   article · noun · verb · preposition · article · noun   The cat sat in the box.

LEVEL 3 IS PLACED THERE BY CURRICULAR CONVENTION, NOT BY EVIDENCE, and that is
recorded here rather than left to look like a finding.  The spoken-acquisition
literature runs the other way: Brown's morpheme order has children producing the
prepositions `in` and `on` BEFORE the articles `a` and `the` — prepositions are
morphemes 2 and 3 of the fourteen, the articles are morpheme 8 — so a
prepositional phrase is not, in acquisition terms, harder than an adjective, and
nothing here should be read as claiming it is.  What is true is that Montessori
practice and ordinary K-1 practice both introduce the adjective before the
prepositional phrase, because the adjective is the child's FIRST EXPANSION OF A
NOUN PHRASE HE ALREADY HAS — it drops into the frame he can already build,
between the article and the noun — while the prepositional phrase adds a second
noun phrase and a second article.  That is the order this sheet follows.  It is a
convention, it is the one the rest of this shelf is built on, and it is followed
for consistency, not because the adjective is the easier thing to say.

AND SUBJECT-VERB-OBJECT IS A PARALLEL THIRD RUNG, NOT A FOURTH.  `The cat sat in
the box` and `The cat bit the dog` are the same step — one more noun phrase after
the verb — and a fuller shelf would print both and let the child take either.
This sheet prints the prepositional one because HIS VERBS ARE NEARLY ALL
INTRANSITIVE: sat, ran, naps, sit, fell, splash, jump, digs, spat, is.  Of the
tin's verbs only cut, fix and mix take an object at all, and `the cat cut the
box` is not a sentence he would want to have built.  A transitive frame his cards
cannot fill is a frame that teaches him the material is broken, so SVO waits for
the verbs, not for the child.  When the readers bring transitive verbs, the row
is LEVELS + one more tuple and nothing else in this file changes.

THE ROW, IN MILLIMETRES.  A4 portrait at an 8 mm margin: a 194 mm measure, six
rows of 43.0 mm stacked from the top margin.  Each row is a 10 mm SYMBOL BAND, a
3 mm gap, and a 28 mm CARD BAND — build_12's own card height, so a real card laid
in a slot fills the band exactly.  41 mm of stack in a 43 mm row leaves 2 mm, and
it is SPLIT, 1 mm above and 1 mm below, so neither the symbols nor the cards sit
on a blade.  1.0 mm is half the 2.0 mm clearance sheets 18/19 hold everything to;
the row arithmetic is given and 1 mm is all there is to give, and it is the
number clearance() measures off the raster and prints every build.

THERE ARE NO SLOT BOXES, AND THE FIRST CUT OF THIS SHEET WAS WRONG TO DRAW THEM.
It ruled a faint divider down the card band at every slot boundary, and a ruled
box is a PROMISE THAT THE CARD LANDS INSIDE IT — which this sheet cannot keep.
`penguin.` is 53.6 mm of card against a 40 mm noun slot and `splash.` 43.9
against a 34 mm verb slot, so on a real sentence the card would visibly overhang
a line the child can see, and the material would be telling him he had got it
wrong when he had not.  The dividers are gone.  What is left is a ROW OF SYMBOLS
IN ORDER, which hints at where each word goes without asserting a width, and that
is what a frame is: a sequence, not a set of boxes.  The cards butt along the one
line exactly as they do on every other sheet of this shelf.

THE SLOT WIDTHS SURVIVE AS THE SYMBOL SPACING and as nothing else — they set
where each symbol stands and they are never drawn.  article 24, noun 44,
adjective 30, verb 38, preposition 20, the proportion of the classes as the tin
measures their cards, and LEVEL 3 COMES TO EXACTLY 194.0 mm: the six symbols of
the longest frame span the whole measure, the first over the start of the line
and the last over its end.  check() asserts that to the millimetre.  Levels 1 and
2 come to 106 and 136 and are left-aligned under the same line, so a shorter
frame reads as a shorter sentence and not as a differently-scaled one.

AND THE LINE IS THE LIMIT, WHICH IS INFORMATION AND NOT A DEFECT.  A child who
takes `penguin` and `splash.` at level 3 has 229.6 mm of card for a 194 mm line
and runs off the end of it.  Nothing here stops him and nothing should: he finds
that out the way he finds out that the tin holds one sentence's worth of cards,
by reaching the end with his hands.  The caption says it in one clause, for the
adult who is watching it happen.

THE LINE RUNS THE FULL 194 mm ON EVERY ROW, WHATEVER THE LEVEL.  Level 1 uses
100 mm of it and level 3 uses 188, and the line is the same length on all three
pages for sheet 18's reason: a line cut to its sentence tells the child how many
words to expect before he has read the symbols, which is the answer given away
for free.  The line is build_12's free-composition charcoal #4F4A44, imported,
1 mm thick with its TOP on the baseline 9 mm up the card band — where a laid
card's own coloured rule sits, so the card covers it exactly — and a 1 mm start
tick the full 28 mm of the band stands at its left end.  That is the mats'
treatment, at the mats' baseline, and the tick is the mark he lines his first
card up with.

THE SYMBOLS ARE THE TIN'S, SCALED.  build_12.SYMBOL and build_12.draw_symbol are
imported and the symbol is drawn THROUGH build_12's own function under a uniform
scale of SYM_H / build_12.SYM_H, so the shapes, the relative sizes (the article's
triangle smaller than the adjective's, the adjective's smaller than the noun's)
and the colours are the tin's by construction and not by a second copy of the
table.  No grammar hex appears anywhere in this file.  The symbols sit on the
FLOOR of the symbol band, all on one groundline 3 mm above the cards they label,
so the noun triangle and the verb circle at full height fill the 10 mm band and
the smaller symbols hang below its top — the band IS the tallest symbol.

THE FULL STOP.  The eighteen fixed sentences carry their stop printed on the last
word card, which is right for a sentence that is always the same sentence.  A
sentence the child composes here has no such card, and the free-composition tin
holds none: there is no `.` in it and there cannot be, because the stop belongs to
whichever word he happens to end on.  So the stop comes back off TRAY 5's
PUNCTUATION DISH, where it was always meant to live, and the caption says so in
one clause.  Sheet 04 still prints the tile — three tiles, `stop · question ·
shout`, the stop a 10 mm dot — so nothing has to be rebuilt for this work; the
tile has to be put back in the dish.  This sheet does not edit sheet 04 and must
not.

Run:   python3 scripts/curriculum/writing-shelf/build_20_sentence_frames.py
Needs: reportlab, pikepdf, numpy, Pillow, fontTools; pdftoppm and pdftotext
       (poppler) for the raster clearance, the text assertion and the proofs —
       the build says so loudly rather than going quiet if they are absent.
"""

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pikepdf
from PIL import Image
from fontTools import ttLib
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  symbols, colours, cards
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
PROOF_DIR = HERE / ".build" / "proof"
SCRATCH = HERE / ".build" / "scratch"
NAME = "20-sentence-frames.pdf"

PDF_TITLE = "Dark Phonics · Writing Shelf · sentence frames"
PDF_AUTHOR = W12.PDF_AUTHOR                  # the set's, never re-typed
PRINT_NOTE = (
    "Dark Phonics · The Writing Shelf · Tray 5, free composition — print 1-up "
    "onto A4, portrait, 100%, single-sided. One level a page, six frames a "
    "page. Cut along the grey lines, across only, for six single frames — or "
    "leave the page whole. The child reads the symbols and builds a sentence "
    "of that shape from his word tins; the full stop comes from the "
    "punctuation dish."
)

# ------------------------------------------------------------------ page ----
PAGE_W, PAGE_H = 210.0, 297.0
MARGIN = 8.0                            # sheet 19's margin, the portrait one
MEASURE = PAGE_W - 2.0 * MARGIN         # 194.0 — the line, every row
ROWS = 6
ROW_H = 43.0                            # six of them, from the top margin down

# ------------------------------------------------------------------- row ----
SYM_BAND = 10.0                         # mm — and SYM_H is the same number
BAND_GAP = 3.0                          # mm — paper between symbol and card
CARD_BAND = W12.CARD_H                  # 28.0 — build_12's card, imported
STACK = SYM_BAND + BAND_GAP + CARD_BAND         # 41.0
ROW_CLEAR = (ROW_H - STACK) / 2.0               # 1.0 mm of paper each cut

SYM_H = 10.0                            # mm — the noun triangle / verb circle
SYM_K = SYM_H / W12.SYM_H               # the uniform scale on build_12's own art

BASELINE = W12.BASELINE                 # 9.0 mm up the card band, imported
LINE_T = 1.0                            # mm — the writing line
TICK_W = 1.0                            # mm — the start tick
TICK_H = CARD_BAND                      # 28.0 — the full band

LINE_C = W12.CHARCOAL_C                 # #4F4A44, build_12's, never re-typed

# --------------------------------------------------------------- the slots ----
# THE SLOT IS NEVER DRAWN.  It is the spacing that sets where a symbol stands, and
# it is the proportion of the classes as build_12 measures their cards — noun
# widest, preposition narrowest.  The widths are balanced so that LEVEL 3 fills
# the measure EXACTLY: 24 + 44 + 38 + 20 + 24 + 44 = 194.0, asserted in check().
SLOT_W = {
    "article": 24.0,
    "noun": 44.0,
    "adjective": 30.0,
    "verb": 38.0,
    "preposition": 20.0,
}
FULL_LEVEL = 3                          # the level whose run IS the measure
SLOT_SIDE = 2.0                         # mm — least paper each side of a symbol

# THE LEVELS, IN THE ORDER HE MEETS THEM.  See the docstring for why level 3 is
# the prepositional phrase and not an SVO frame, and why that ordering is a
# convention of practice rather than a claim about acquisition.
LEVELS = [
    (1, ("article", "noun", "verb"), "The cat sat."),
    (2, ("article", "adjective", "noun", "verb"), "The sad cat sat."),
    (3, ("article", "noun", "verb", "preposition", "article", "noun"),
     "The cat sat in the box."),
]

# ------------------------------------------------------------ adult text ----
# The ONLY type on the sheet, at sheet 12's size, in sheet 12's grey, in sheet
# 12's voice, sitting in the bottom margin BELOW the last cut line so that the
# six frames carry no adult writing at all and the caption goes with the trim.
ADULT_FONT = W12.ADULT_FONT
FOOT_SIZE = W12.FOOT_SIZE               # 5.5
FOOT_C = W12.LABEL_C                    # #5F594F, the set's adult grey
LEAD = 2.6                              # mm between the caption's two baselines
FOOT_AIR = 0.3                          # mm of paper under the caption's ink
SAFE = CM.SAFE

CAPTION = (
    "sentence frames · level %d · %s — no words are printed: he reads the "
    "symbols and builds a sentence of that shape out of his own word cards · %s",
    "the full stop comes from the punctuation dish, not the word tin · a very "
    "long word may leave no room for another, and the line is the limit · cut "
    "along the grey lines for six single frames",
)

# reportlab writes coordinates rounded to 0.01 pt; the margin assertions are held
# to the file's own precision, as sheet 18 holds its own.
PDF_ROUND = 0.01 / 72.0 * 25.4          # 0.00353 mm

CLEAR_DPI = 300                         # the raster the clearances are read off
CLEAR_MIN = 0.5                         # mm — the least ink-to-cut gap allowed
GEOM_TOL = 0.02                         # mm — read-back tolerance on a drawn box


# ---------------------------------------------------------------- layout ----
def captions(level, parts, example):
    return (CAPTION[0] % (level, " · ".join(parts), example), CAPTION[1])


def slot_run(parts):
    """(x0, width, class) a slot, from the left margin, butted."""
    out, x = [], MARGIN
    for cls in parts:
        w = SLOT_W[cls]
        out.append((x, w, cls))
        x += w
    return out


def run_mm(parts):
    return sum(SLOT_W[cls] for cls in parts)


def cut_ys():
    """The seven row boundaries, top down: 289.0 … 31.0."""
    return [PAGE_H - MARGIN - i * ROW_H for i in range(ROWS + 1)]


def row_y(i):
    """(bottom, top) of row i, 0 being the top row."""
    top = PAGE_H - MARGIN - i * ROW_H
    return top - ROW_H, top


def row_bands(i):
    """(card_bot, card_top, sym_bot, sym_top, baseline) of row i, in mm."""
    bot, top = row_y(i)
    card_bot = bot + ROW_CLEAR
    card_top = card_bot + CARD_BAND
    sym_bot = card_top + BAND_GAP
    sym_top = sym_bot + SYM_BAND
    return card_bot, card_top, sym_bot, sym_top, card_bot + BASELINE


def sym_size(cls):
    """The tin's symbol at THIS sheet's base height: build_12's own proportions."""
    w, h = W12.sym_size(cls)
    return w * SYM_K, h * SYM_K


def sym_box(cls, x, w, sym_bot):
    """(x0, y0, x1, y1) of one symbol: centred on its slot, on the band floor."""
    sw, sh = sym_size(cls)
    cx = x + w / 2.0
    return cx - sw / 2.0, sym_bot, cx + sw / 2.0, sym_bot + sh


# ---------------------------------------------------------------- measure ----
def class_forms(cls):
    """Every PRINTED form of this class the tin can hold, measured.

    build_12's tins hold three forms of a word — the plain card, the
    sentence-opening capital and the sentence-closing full stop — so the widest
    card of a class is not the widest word of it.  [(width mm, form)], sorted.
    """
    words = [w for key, _l, _s, ws in W12.CATEGORIES if key == cls for w in ws]
    forms = set(words) | {w[0].upper() + w[1:] for w in words} | {w + "." for w in words}
    return sorted((W12.card_w(w), w) for w in forms)


def slot_fit(cls):
    """How this class's real cards sit in its slot.

    THE SLOT IS SPACING AND IS NEVER DRAWN, so nothing here is a promise the sheet
    can break — this is a report, and it is kept because it is the measurement
    that killed the slot dividers and it should stay visible to anyone who thinks
    of drawing them again.  A card wider than its spacing simply butts along the
    line like every other card on this shelf, and the line is the FULL 194 mm on
    every row.

    Returns (n fitting, n total, widest that fits, widest of all, narrowest).
    """
    forms = class_forms(cls)
    fits = [f for f in forms if f[0] <= SLOT_W[cls] + 1e-9]
    return (len(fits), len(forms), fits[-1] if fits else None, forms[-1], forms[0])


def real_run(parts, pick):
    """A level's run as REAL butted cards, `pick` choosing the form a class."""
    return sum(pick(cls) for cls in parts)


def caption_ink(text):
    """The caption's REAL ink above and below its baseline, in mm.

    Sheet 18's measurement, for sheet 18's reason: getAscentDescent hands back
    the FACE's line, not the room these glyphs use, and the caption has to be
    placed against a margin the face's nominal line does not fit.  Measured on
    the outlines of the characters it actually sets, out of the TTF reportlab
    embeds.
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


def caption_ys():
    """Baselines of the two caption lines, bottom line first.

    The block is bottom-aligned on the 8 mm margin with FOOT_AIR of paper under
    its deepest descender — 'at the foot' means at the foot, and the 23 mm
    between the last cut line and the page edge is trim, not a place to float
    type in.  Every page's two lines share one pair of baselines, measured off
    the deepest ink any of them sets.
    """
    all_lines = [t for lvl, parts, ex in LEVELS for t in captions(lvl, parts, ex)]
    down = min(caption_ink(t)[0] for t in all_lines)
    y_lo = MARGIN + FOOT_AIR - down
    return y_lo, y_lo + LEAD


def caption_extent():
    """(floor, head) of the caption block's ink, in mm."""
    all_lines = [t for lvl, parts, ex in LEVELS for t in captions(lvl, parts, ex)]
    down = min(caption_ink(t)[0] for t in all_lines)
    up = max(caption_ink(t)[1] for t in all_lines)
    y_lo, y_hi = caption_ys()
    return y_lo + down, y_hi + up


# ------------------------------------------------------------------ check ----
def check():
    """The geometry, before a single mark is made."""
    bad, runs = [], []
    if abs(ROW_CLEAR * 2.0 + STACK - ROW_H) > 1e-9:
        bad.append("the %.1f mm stack does not sit in the %.1f mm row" % (STACK, ROW_H))
    if ROW_CLEAR <= 0:
        bad.append("the row has no clearance to its cut lines")
    if PAGE_H - MARGIN - ROWS * ROW_H < SAFE:
        bad.append("six rows of %.1f run past the printer-safe margin" % ROW_H)
    if abs(SYM_H - SYM_BAND) > 1e-9:
        bad.append("the symbol band is %.1f mm and the tallest symbol %.1f — the "
                   "band IS the tallest symbol, or the docstring is wrong"
                   % (SYM_BAND, SYM_H))
    if BASELINE - LINE_T < 0 or BASELINE > CARD_BAND:
        bad.append("the writing line does not sit inside the card band")

    # ---- every level's slot run inside the one measure, and every level's
    # REAL card run measured against the one line it is actually laid on.
    for level, parts, example in LEVELS:
        run = run_mm(parts)
        lo = real_run(parts, lambda c: class_forms(c)[0][0])
        hi = real_run(parts, lambda c: class_forms(c)[-1][0])
        ex = sum(W12.card_w(w) for w in example.rstrip(".").split())
        runs.append((level, parts, run, MEASURE - run, lo, hi, ex))
        if run > MEASURE + 1e-9:
            bad.append("level %d is %.1f mm of symbol run and the measure is "
                       "%.1f" % (level, run, MEASURE))
        if level == FULL_LEVEL and abs(run - MEASURE) > 1e-9:
            bad.append("level %d must SPAN the measure and comes to %.4f mm, "
                       "not %.1f" % (level, run, MEASURE))
        if lo > MEASURE + 1e-9:
            bad.append("level %d cannot be built at all: its SHORTEST run of "
                       "real cards is %.1f mm against a %.1f mm line"
                       % (level, lo, MEASURE))
        if ex > MEASURE + 1e-9:
            bad.append("level %d's own example %r is %.1f mm of card against a "
                       "%.1f mm line" % (level, example, ex, MEASURE))

    # ---- every slot carries its own symbol with paper to spare, and every
    # slot is measured against the real cards of its class.  The FIT is
    # reported, not required: see slot_fit() for why a slot is a proportion and
    # not a container.
    fits = {}
    for cls in sorted(SLOT_W):
        fits[cls] = slot_fit(cls)
        if fits[cls][0] == 0:
            bad.append("not one %s card the tin holds fits its %.1f mm slot"
                       % (cls, SLOT_W[cls]))
        sw, _sh = sym_size(cls)
        if sw + 2.0 * SLOT_SIDE > SLOT_W[cls] + 1e-9:
            bad.append("the %s symbol is %.1f mm wide and leaves under %.1f mm "
                       "of paper each side of its %.1f mm slot"
                       % (cls, sw, SLOT_SIDE, SLOT_W[cls]))

    # ---- the example sentence must be buildable out of the tin, in this shape
    for level, parts, example in LEVELS:
        words = example.rstrip(".").split()
        if len(words) != len(parts):
            bad.append("level %d's example %r is %d words against %d slots"
                       % (level, example, len(words), len(parts)))
            continue
        for word, cls in zip(words, parts):
            got = W12.CLASS_OF.get(word.lower().rstrip("."))
            if got != cls:
                bad.append("level %d's example uses %r in the %s slot and the "
                           "tin classes it %s" % (level, word, cls, got))

    # ---- the caption: two lines, inside the measure, clear of margin and cut
    for level, parts, example in LEVELS:
        for text in captions(level, parts, example):
            w = pdfmetrics.stringWidth(text, ADULT_FONT, FOOT_SIZE) / 72.0 * 25.4
            if w > MEASURE + 1e-9:
                bad.append("a caption line is %.1f mm wide, over the %.1f mm "
                           "measure: %r" % (w, MEASURE, text[:60]))
    floor, head = caption_extent()
    if floor < MARGIN - 1e-9:
        bad.append("the caption's ink falls to %.2f mm, under the %.1f mm margin"
                   % (floor, MARGIN))
    if head > min(cut_ys()) - 1e-9:
        bad.append("the caption's ink reaches %.2f mm, into the last cut line "
                   "at %.1f" % (head, min(cut_ys())))
    for y in cut_ys():
        if y < SAFE or y > PAGE_H - SAFE:
            bad.append("a cut line at y %.1f breaks the printer-safe margin" % y)

    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return runs, fits, (floor, head)


# ------------------------------------------------------------------- draw ----
def draw_symbol(c, cls, x, w, sym_bot):
    """The tin's own symbol, drawn THROUGH build_12.draw_symbol under a scale.

    Nothing about the shape, the proportion or the colour is restated here: the
    canvas is translated and scaled so that build_12's function, asked for a
    symbol on a card, lays it centred on this slot with its foot on the band
    floor at SYM_K times the tin's size.  If the tin's art or its colours move,
    this sheet moves with them and cannot drift.
    """
    _sw, sh = sym_size(cls)
    cx = x + w / 2.0
    # In build_12's own frame a symbol drawn on a card of width CW at (X, Y) is
    # centred at X + CW/2 with its TOP at Y + CARD_H - SYM_TOP.  Put that top on
    # the scaled origin and that centre on a known abscissa, then carry both
    # where they belong.
    CW, X = 20.0, 0.0
    Y = W12.SYM_TOP - W12.CARD_H
    tx = cx - SYM_K * (X + CW / 2.0)
    ty = sym_bot + sh                       # the symbol's TOP, on the band floor
    c.saveState()
    c.translate(tx * mm, ty * mm)
    c.scale(SYM_K, SYM_K)
    W12.draw_symbol(c, cls, X, Y, CW)
    c.restoreState()


def draw_row(c, i, parts):
    """One frame: the symbols, the writing line and the start tick.  No boxes."""
    card_bot, _card_top, sym_bot, _sym_top, base = row_bands(i)
    slots = slot_run(parts)
    c.saveState()
    c.setFillColor(LINE_C)
    # the line — its TOP on the baseline, the full measure, every level
    c.rect(MARGIN * mm, (base - LINE_T) * mm, MEASURE * mm, LINE_T * mm,
           stroke=0, fill=1)
    # the start tick — the full card band, at the line's left end
    c.rect(MARGIN * mm, card_bot * mm, TICK_W * mm, TICK_H * mm,
           stroke=0, fill=1)
    c.restoreState()
    for x, w, cls in slots:
        draw_symbol(c, cls, x, w, sym_bot)
    return slots


def draw_cuts(c):
    """The row cut lines, in cutmarks.py's standard.  HORIZONTAL ONLY: a frame is
    one piece and a vertical would saw it in half."""
    return CM.cut_lines(c, [], [(y, 0.0, PAGE_W) for y in cut_ys()],
                        PAGE_W, PAGE_H)


def draw_page(c, level, parts, example, cuts=True):
    for i in range(ROWS):
        draw_row(c, i, parts)
    if cuts:
        draw_cuts(c)
    y_lo, y_hi = caption_ys()
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    for text, y in zip(captions(level, parts, example), (y_hi, y_lo)):
        c.drawString(MARGIN * mm, y * mm, text)
    c.restoreState()


def write_pdf(path, cuts=True):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    for level, parts, example in LEVELS:
        draw_page(c, level, parts, example, cuts=cuts)
        c.showPage()
    c.save()


# ----------------------------------------------------------------- verify ----
def _mul(a, b):
    """a then b, both as PDF 6-tuples."""
    return (a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
            a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
            a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5])


def _apply(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


def page_marks(page):
    """Everything one page draws, in PAGE millimetres, with the CTM composed.

    Returns fills  [(rgb, x0, y0, x1, y1)] — one entry a filled path, its box in
    mm; strokes [(rgb, width_mm, [(x, y) …])]; and text [(rgb, x, y, nbytes)].
    The CTM matters here because the symbols are drawn under a scale: a symbol's
    real size on the paper is the only thing worth reading back.
    """
    ident = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    ctm, stack = ident, []
    pts, fill, stroke, width = [], None, None, 1.0
    fills, strokes, text = [], [], []
    tm = None
    K = 25.4 / 72.0

    def box():
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs) * K, min(ys) * K, max(xs) * K, max(ys) * K

    for operands, op in pikepdf.parse_content_stream(page):
        o, a = str(op), list(operands)
        if o == "q":
            stack.append((ctm, fill, stroke, width))
        elif o == "Q":
            ctm, fill, stroke, width = stack.pop() if stack else (ident, fill, stroke, width)
        elif o == "cm":
            ctm = _mul(tuple(float(v) for v in a), ctm)
        elif o == "rg":
            fill = tuple(round(float(v), 6) for v in a)
        elif o == "RG":
            stroke = tuple(round(float(v), 6) for v in a)
        elif o == "w":
            width = float(a[0]) * abs(ctm[0])
        elif o in ("m", "l"):
            pts.append(_apply(ctm, float(a[0]), float(a[1])))
        elif o == "c":
            for j in (0, 2, 4):
                pts.append(_apply(ctm, float(a[j]), float(a[j + 1])))
        elif o == "re":
            x, y, w, h = (float(v) for v in a)
            for cx, cy in ((x, y), (x + w, y), (x + w, y + h), (x, y + h)):
                pts.append(_apply(ctm, cx, cy))
        elif o == "Tf":
            pass
        elif o == "Tm":
            tm = [float(v) for v in a]
        elif o == "Tj" and tm is not None:
            p = _apply(ctm, tm[4], tm[5])
            text.append((fill, p[0] * K, p[1] * K, len(bytes(a[0]))))
        elif o in ("f", "F", "f*", "b", "b*"):
            if pts:
                fills.append((fill,) + box())
            pts = []
        elif o in ("S", "s"):
            if pts:
                strokes.append((stroke, width * K, [(p[0] * K, p[1] * K) for p in pts]))
            pts = []
        elif o in ("B", "B*"):
            if pts:
                fills.append((fill,) + box())
                strokes.append((stroke, width * K, [(p[0] * K, p[1] * K) for p in pts]))
            pts = []
        elif o == "n":
            pts = []
    return dict(fills=fills, strokes=strokes, text=text)


def rgb(col):
    return tuple(round(v, 6) for v in (col.red, col.green, col.blue))


def verify(pdf, clean):
    """Read the FINISHED PDF back and prove every claim this file makes.

    `clean` is the same three pages drawn WITHOUT their cut marks: the symbol and
    slot geometry is read off that, so the triangles and hairlines — which live
    on the margins and ON the cut lines by design — cannot be mistaken for the
    sheet's own ink.
    """
    bad = []
    want_pt = (PAGE_W / 25.4 * 72.0, PAGE_H / 25.4 * 72.0)
    counts, worst_geom = [], (0.0, None)

    with pikepdf.open(pdf) as doc, pikepdf.open(clean) as cdoc:
        if len(doc.pages) != len(LEVELS):
            bad.append("%d pages, not %d" % (len(doc.pages), len(LEVELS)))
        for pno, (level, parts, example) in enumerate(LEVELS):
            page, cpage = doc.pages[pno], cdoc.pages[pno]
            mb = [float(v) for v in page.MediaBox]
            w, h = mb[2] - mb[0], mb[3] - mb[1]
            if abs(w - want_pt[0]) > 0.01 or abs(h - want_pt[1]) > 0.01:
                bad.append("page %d is %.2f x %.2f mm, not %.0f x %.0f"
                           % (pno + 1, w / 72 * 25.4, h / 72 * 25.4, PAGE_W, PAGE_H))
            M, C = page_marks(page), page_marks(cpage)

            # ---- THE SYMBOLS: one a slot a row, at the right size, in the
            # tin's own colour for that class, centred over its own slot.
            want = []
            for i in range(ROWS):
                _cb, _ct, sym_bot, _st, _base = row_bands(i)
                for x, sw, cls in slot_run(parts):
                    want.append((cls,) + sym_box(cls, x, sw, sym_bot))
            # on a page drawn without its marks the only fills are the symbols
            # and the two charcoal bars a row; the symbols are what is left.
            got = [f for f in C["fills"] if f[0] != rgb(LINE_C)]
            if len(got) != len(want):
                bad.append("page %d draws %d symbols, not the %d its %d slots "
                           "over %d rows ask for"
                           % (pno + 1, len(got), len(want), len(parts), ROWS))
            else:
                got.sort(key=lambda f: (-round(f[2], 2), f[1]))
                want.sort(key=lambda t: (-round(t[2], 2), t[1]))
                for (col, gx0, gy0, gx1, gy1), (cls, wx0, wy0, wx1, wy1) in zip(got, want):
                    if col != rgb(W12.SYMBOL[cls][1]):
                        bad.append("page %d draws the %s symbol in %s, not the "
                                   "tin's %s" % (pno + 1, cls, col,
                                                 rgb(W12.SYMBOL[cls][1])))
                    d = max(abs(gx0 - wx0), abs(gy0 - wy0),
                            abs(gx1 - wx1), abs(gy1 - wy1))
                    if d > worst_geom[0]:
                        worst_geom = (d, "%s, page %d" % (cls, pno + 1))
                    if d > GEOM_TOL:
                        bad.append("page %d: the %s symbol reads back at "
                                   "%.2f,%.2f-%.2f,%.2f mm, %.3f mm off the "
                                   "%.2f,%.2f-%.2f,%.2f it was asked for"
                                   % (pno + 1, cls, gx0, gy0, gx1, gy1, d,
                                      wx0, wy0, wx1, wy1))

            # ---- THE LINE AND THE TICK: two charcoal rects a row, nothing else
            bars = [f for f in C["fills"] if f[0] == rgb(LINE_C)]
            if len(bars) != 2 * ROWS:
                bad.append("page %d draws %d charcoal bars, not the %d lines "
                           "and ticks" % (pno + 1, len(bars), 2 * ROWS))
            for col, x0, y0, x1, y1 in bars:
                if abs(x1 - x0 - MEASURE) < 0.01:
                    if abs(y1 - y0 - LINE_T) > 0.01 or abs(x0 - MARGIN) > 0.01:
                        bad.append("page %d: a writing line is %.2f mm thick at "
                                   "x %.2f" % (pno + 1, y1 - y0, x0))
                elif abs(x1 - x0 - TICK_W) < 0.01:
                    if abs(y1 - y0 - TICK_H) > 0.01 or abs(x0 - MARGIN) > 0.01:
                        bad.append("page %d: a start tick is %.2f mm tall at "
                                   "x %.2f" % (pno + 1, y1 - y0, x0))
                else:
                    bad.append("page %d draws a charcoal bar %.2f mm wide, "
                               "neither the line nor the tick" % (pno + 1, x1 - x0))

            # ---- NO BOXES.  A page drawn without its cut marks must stroke
            # NOTHING AT ALL: the dividers are gone and nothing replaced them.
            if C["strokes"]:
                bad.append("page %d strokes %d path(s) inside the frames — this "
                           "sheet draws no slot boxes and no rules but the cut "
                           "lines" % (pno + 1, len(C["strokes"])))

            # ---- THE CUT LINES, on the real page: seven, edge to edge, house
            # weight, at the row boundaries, and no vertical anywhere.
            cuts = [s for s in M["strokes"] if s[0] == rgb(CM.HAIR_C)]
            if len(cuts) != ROWS + 1:
                bad.append("page %d strokes %d cut lines, not %d"
                           % (pno + 1, len(cuts), ROWS + 1))
            gotc = []
            for col, wid, pp in cuts:
                if abs(wid - CM.HAIR_W) > 1e-6:
                    bad.append("page %d strokes a cut line %.3f mm wide, not the "
                               "house %.2f" % (pno + 1, wid, CM.HAIR_W))
                if len(pp) != 2 or abs(pp[0][1] - pp[1][1]) > 0.01:
                    bad.append("page %d strokes a cut that is not horizontal — "
                               "this sheet has no vertical cut" % (pno + 1))
                    continue
                x0, x1 = sorted(p[0] for p in pp)
                if abs(x0) > 0.01 or abs(x1 - PAGE_W) > 0.01:
                    bad.append("page %d: a cut line runs %.2f to %.2f mm, not "
                               "edge to edge" % (pno + 1, x0, x1))
                gotc.append(pp[0][1])
            if sorted(round(v, 2) for v in gotc) != sorted(round(v, 2) for v in cut_ys()):
                bad.append("page %d cuts at %s, not at the row boundaries %s"
                           % (pno + 1, sorted("%.1f" % v for v in gotc),
                              sorted("%.1f" % v for v in cut_ys())))
            extra = {s[0] for s in M["strokes"]} - {rgb(CM.HAIR_C), rgb(CM.MARK_C)}
            if extra:
                bad.append("page %d strokes in %s — the only strokes on this "
                           "sheet are the cut hairlines"
                           % (pno + 1, sorted(extra)))

            # ---- THE FILLS: the tin's classes, the charcoal, the adult grey,
            # the cut triangles' ink, AND NOTHING ELSE.
            want_fill = {rgb(W12.SYMBOL[cls][1]) for cls in parts}
            want_fill |= {rgb(LINE_C), rgb(FOOT_C), rgb(CM.MARK_C)}
            got_fill = {f[0] for f in M["fills"]} | {t[0] for t in M["text"]}
            if got_fill != want_fill:
                bad.append("page %d fills %s; it should fill only %s"
                           % (pno + 1, sorted(got_fill), sorted(want_fill)))

            # ---- THE TYPE: two adult strings, in the adult grey, and no more
            if len(M["text"]) != 2:
                bad.append("page %d sets %d strings, not the caption's two"
                           % (pno + 1, len(M["text"])))
            for col, tx, ty, _nb in M["text"]:
                if col != rgb(FOOT_C):
                    bad.append("page %d sets type in %s, not the adult grey"
                               % (pno + 1, col))
                if abs(tx - MARGIN) > 0.01:
                    bad.append("page %d sets a caption line at x %.2f, not on "
                               "the margin" % (pno + 1, tx))

            # ---- NOTHING CROSSES THE MARGIN.  Cut marks are exempt and must be:
            # the hairline runs edge to edge by construction and the triangles
            # sit out on the printer-safe margin, which is what they are for.
            for col, x0, y0, x1, y1 in C["fills"]:
                if (x0 < MARGIN - PDF_ROUND or y0 < MARGIN - PDF_ROUND
                        or x1 > PAGE_W - MARGIN + PDF_ROUND
                        or y1 > PAGE_H - MARGIN + PDF_ROUND):
                    bad.append("page %d: a mark at %.2f,%.2f-%.2f,%.2f mm "
                               "breaks the %.1f mm margin"
                               % (pno + 1, x0, y0, x1, y1, MARGIN))
            counts.append(len(parts))
        meta = " ".join(str(v) for v in doc.docinfo.values()) if doc.docinfo else ""
        if str(doc.docinfo.get("/Title", "")) != PDF_TITLE:
            bad.append("the PDF Title is %r, not %r"
                       % (str(doc.docinfo.get("/Title", "")), PDF_TITLE))
        if str(doc.docinfo.get("/Author", "")) != PDF_AUTHOR:
            bad.append("the PDF Author is %r, not %r"
                       % (str(doc.docinfo.get("/Author", "")), PDF_AUTHOR))

    # ---- NO TEXT ANYWHERE EXCEPT THE FOOT CAPTION.  This is the sheet's whole
    # premise — the child reads SYMBOLS — so it is proved off the extracted text
    # layer, not off the drawing code.
    if shutil.which("pdftotext"):
        for pno, (level, parts, example) in enumerate(LEVELS, start=1):
            txt = subprocess.run(["pdftotext", "-f", str(pno), "-l", str(pno),
                                  str(pdf), "-"], check=True,
                                 capture_output=True, text=True).stdout
            got = " ".join(txt.split())
            want = " ".join(" ".join(captions(level, parts, example)).split())
            if got != want:
                bad.append("page %d's text layer reads %r; the only type on the "
                           "page is its caption, %r" % (pno, got[:90], want[:90]))
    else:
        bad.append("no pdftotext: the no-words-on-the-page assertion did NOT run")
    if "punctuation dish" not in meta.lower():
        bad.append("the print note no longer says where the full stop comes from")
    if bad:
        raise SystemExit("VERIFY FAILURE:\n  " + "\n  ".join(bad))
    return counts, worst_geom


# -------------------------------------------------------------- clearance ----
def clearance(clean):
    """NOTHING MAY SIT ACROSS A CUT, and nothing may cross the margin — proved on
    a raster of the pages WITHOUT their marks, not on a drawing.

    Drawing the marks would beg the question: the hairline lies ON the boundary
    and the triangles straddle it.  Returns (tightest ink-to-cut mm, what owns
    it, the four margin clearances).
    """
    if not shutil.which("pdftoppm"):
        return None
    px = 25.4 / CLEAR_DPI
    tight, edges = (1e9, None), (1e9, 1e9, 1e9, 1e9)
    for pno, (level, _p, _e) in enumerate(LEVELS, start=1):
        stem = SCRATCH / ("frames-clear-%d" % pno)
        subprocess.run(["pdftoppm", "-r", str(CLEAR_DPI), "-gray", "-png",
                        "-f", str(pno), "-l", str(pno), "-singlefile",
                        str(clean), str(stem)], check=True, capture_output=True)
        a = np.asarray(Image.open(str(stem) + ".png").convert("L"))
        ink = a < 250
        rows = np.nonzero(ink.any(axis=1))[0]
        cols = np.nonzero(ink.any(axis=0))[0]
        ys = PAGE_H - (rows + 0.5) * px
        xs = (cols + 0.5) * px
        for cy in cut_ys():
            d = np.abs(ys - cy)
            if len(d) and d.min() < tight[0]:
                tight = (float(d.min()), "level %d, the cut at %.1f mm" % (level, cy))
        edges = (min(edges[0], float(xs.min()) - MARGIN),
                 min(edges[1], (PAGE_W - MARGIN) - float(xs.max())),
                 min(edges[2], float(ys.min()) - MARGIN),
                 min(edges[3], (PAGE_H - MARGIN) - float(ys.max())))
    if tight[0] < CLEAR_MIN:
        raise SystemExit("VERIFY FAILURE: ink comes within %.3f mm of a cut line "
                         "(%s); %.2f mm is the floor" % (tight[0], tight[1], CLEAR_MIN))
    if min(edges) < -px:
        raise SystemExit("VERIFY FAILURE: ink crosses the %.1f mm margin by "
                         "%.3f mm" % (MARGIN, -min(edges)))
    return tight, edges


# ------------------------------------------------------------------ proof ----
def proof(pdf):
    """Every page to PNG at 150 dpi: frames-p1.png, frames-p2.png, frames-p3.png."""
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(1, len(LEVELS) + 1):
        stem = PROOF_DIR / ("frames-p%d" % i)
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i), "-l",
                        str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------ build ----
def build():
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()   # card_w measures off the real font
    runs, fits, (cfloor, chead) = check()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    write_pdf(out)
    clean = SCRATCH / "frames-nomarks.pdf"
    write_pdf(clean, cuts=False)

    counts, worst_geom = verify(out, clean)
    tight = clearance(clean)
    made = proof(out)

    # ------------------------------------------------------------- report ----
    print("sentence frames -> %s" % OUT_DIR)
    print("  %-28s %d pp · A4 portrait %.0f x %.0f mm · %d frames a page of "
          "%.1f mm · %d bytes"
          % (NAME, len(LEVELS), PAGE_W, PAGE_H, ROWS, ROW_H, out.stat().st_size))
    print("  NOT ONE WORD IS PRINTED: the text layer of every page extracts to "
          "its two-line foot caption and nothing else")
    print("  row: %.0f mm symbol band · %.0f mm gap · %.0f mm card band "
          "(build_12.CARD_H) = %.0f in %.1f, %.1f mm clear of each cut"
          % (SYM_BAND, BAND_GAP, CARD_BAND, STACK, ROW_H, ROW_CLEAR))
    print("  line %.1f mm thick, top on the baseline %.0f mm up the band, the "
          "full %.1f mm measure on EVERY row · tick %.1f x %.1f at its left end "
          "· both build_12's charcoal #4F4A44, imported"
          % (LINE_T, BASELINE, MEASURE, TICK_W, TICK_H))
    for level, parts, run, spare, lo, hi, ex in runs:
        print("    level %d  %-52s %5.1f mm of symbol run, %4.1f spare in %.1f "
              "· %d symbols x %d rows = %d"
              % (level, " · ".join(parts), run, spare, MEASURE,
                 len(parts), ROWS, len(parts) * ROWS))
        print("             real cards on the %.1f mm line: shortest run %.1f, "
              "the example %r %.1f, longest possible %.1f%s"
              % (MEASURE, lo, LEVELS[level - 1][2], ex, hi,
                 "  — OVERRUNS by %.1f, see slot_fit()" % (hi - MEASURE)
                 if hi > MEASURE else ""))
    print("  slot widths are SYMBOL SPACING and are never drawn; level %d spans "
          "the measure exactly.  A wide card butts past its spacing onto the "
          "full %.1f mm line, which is the limit:" % (FULL_LEVEL, MEASURE))
    for cls in sorted(SLOT_W):
        n, tot, widest_fit, widest_all, narrowest = fits[cls]
        sw, sh = sym_size(cls)
        print("    %-12s spacing %4.1f mm · %2d of %2d printed cards fit "
              "(%r %.1f … %r %.1f) · widest of all %r %.1f · symbol %4.1f x "
              "%4.1f mm, %s"
              % (cls, SLOT_W[cls], n, tot, narrowest[1], narrowest[0],
                 widest_fit[1], widest_fit[0], widest_all[1], widest_all[0],
                 sw, sh, W12.SYMBOL[cls][0]))
    print("  symbols: build_12.SYMBOL / draw_symbol drawn through a x%.4f scale "
          "on %.1f mm, so shape, proportion and colour are the tin's by "
          "construction; read back off the content streams and matched, worst "
          "%.4f mm (%s)" % (SYM_K, W12.SYM_H, worst_geom[0], worst_geom[1]))
    print("  NO SLOT BOXES ANYWHERE: the symbols are an ordered row, not a set "
          "of compartments — a page drawn without its cut marks strokes nothing "
          "at all, and verify() refuses the build if it strokes anything")
    print("  CUT ACROSS ONLY: %d row cut lines in cutmarks' standard (%.2f mm "
          "hairline edge to edge, a triangle each end at the %.1f mm safe "
          "margin); no vertical cut anywhere, so a page cuts into six single "
          "frames" % (ROWS + 1, CM.HAIR_W, SAFE))
    print("  caption: Andika %.1f pt, two lines at y %.2f / %.2f — ink %.2f to "
          "%.2f mm, below the last cut at %.1f and clear of the %.1f mm margin"
          % (FOOT_SIZE, caption_ys()[1], caption_ys()[0], cfloor, chead,
             min(cut_ys()), MARGIN))
    if tight:
        (td, twhat), edges = tight
        print("  nothing crosses a cut: tightest ink-to-cut gap %.2f mm (%s), on "
              "a %d dpi raster of the pages without their marks; floor %.2f"
              % (td, twhat, CLEAR_DPI, CLEAR_MIN))
        print("  nothing crosses the %.1f mm margin: %.2f left, %.2f right, "
              "%.2f foot, %.2f head of clearance"
              % (MARGIN, edges[0], edges[1], edges[2], edges[3]))
    else:
        print("  ! no pdftoppm: the cut and margin clearances were NOT measured")
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(p.name for p in made)))
    else:
        print("  ! no pdftoppm: the proofs were NOT rendered")


if __name__ == "__main__":
    build()
