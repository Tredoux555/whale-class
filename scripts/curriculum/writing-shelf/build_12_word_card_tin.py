#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 12, the Tray 5 WORD-CARD TIN

Tray 5 asked for "a tin of about forty word cards from the readers, sorted:
naming / doing / small words" and then listed it under HAVE, as though a tin of
fifty cut, laminated word cards were something a classroom simply owns.  It is
not.  This is that tin, printed.

FIFTY-THREE WORDS, taken from the eleven Easy Readers and deduped: twenty-one
naming words, ten doing words, twenty-two small words.  Nothing is invented —
every word on the sheet is one the child has already read in a book.

THREE OF THEM ARE THE TIN CATCHING UP WITH SHEET 14.  `sun`, `digs` and `hot`
are the three words sheet 14's illustrated sentence cards ask for and the tin
did not hold, so five of those cards could be read but not BUILT.  Adding them
here closes that gap: the words come out of the same readers as the rest.

THE SIZE IS NOT A CHOICE.  A card is 60 x 35 mm, UNMOUNTED, which is exactly the
heart-word card on sheet 04, and the word is set in the same face at the same
size on the same baseline.  A heart word is a word like any other when it is
lying on the sentence line: `the` comes off the Tray 4 ring, `pig` comes out of
this tin, and the two sit side by side.  If they were different heights, or the
words sat at different heights on them, the sentence line would read as two
kinds of thing instead of one sentence.  So:

  card         60 x 35 mm, unmounted, printed at finished size
  face         Fredoka Medium (wght 500), instanced at build time
  size         21.3466 pt  = sheet 04's 29.33 pt in its own 0.24 x 3.125 user
               space, times the 0.9703 imposition scale build_cut_sheets.py
               applies to sheet 04.  Measured back off the published sheet:
               x-height 3.72 mm, cap height 5.20 mm.  This size reproduces both.
  baseline     14.79 mm up from the card's bottom edge — measured off the
               published sheet 04, so the words line up across the two sheets.
  ink          #141110, the house ink, same as the heart words.

THE CORNER SYMBOL is the sort order, and it is the Tray 8 grammar symbol shrunk:
a black triangle for a naming word, a red circle for a doing word, a small grey
dot for a small word.  Colours are lifted from 10-grammar-pack.pdf unchanged
(#141110 and #C8102E); the grey is the set's own #8C857B.  The dot is a disc and
so is the doing circle, which is deliberate and is the grammar pack's own
argument — "same shape, same hand, same term — the size is what keeps them
apart" — and the colours differ anyway.  The symbol is ~4.6 mm against a ~7.5 mm
word, sits inside the 4 mm content margin at the bottom-right, and is there so a
card that has fallen out of the tin can be put back in the right compartment
without reading it.

CUT ONCE, per cutmarks.py: three columns and seven rows of butted cards, every
line edge to edge with a triangle at both page edges.

SEVEN ROWS AND NOT EIGHT.  Eight rows of 35 mm is 280 mm and fits an A4 page,
but it leaves an 8.5 mm margin top and bottom, and the footer — the only place
"cut along every grey line" is written down — cannot live in 8.5 mm without
breaking the 5.5 mm printer-safe margin.  Seven rows leave 26 mm at each end,
which holds the footer and the page's category label with room to spare.

A CATEGORY ALWAYS STARTS A FRESH ROW, so a row is never half naming and half
doing.  That costs one blank card at the end of the naming words and nothing
else.  The last page is padded out to a full grid with blank cards: they carry
no word and no symbol, and they are the point — the tin is meant to grow as the
readers do, and a teacher who has to find blank card stock will not grow it.

Run:   python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py
Needs: reportlab, fontTools
"""

import math
from pathlib import Path

from fontTools import ttLib
from fontTools.varLib import instancer
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import cutmarks as CM

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
FONT_DIR = REPO / "public" / "fonts"
FREDOKA_VAR = REPO / "docs" / "circle-time" / "guide-src" / "fonts" / "Fredoka-Variable.ttf"
BUILD_DIR = HERE / ".build"
NAME = "12-word-card-tin.pdf"

PAGE_W, PAGE_H = 210.0, 297.0
CARD_W, CARD_H = 60.0, 35.0
COLS, ROWS = 3, 7
X0 = (PAGE_W - COLS * CARD_W) / 2.0            # 15.0
Y0 = (PAGE_H - ROWS * CARD_H) / 2.0            # 26.0

WORD_SIZE = 21.3466        # pt — see the header; this is sheet 04's word, exactly
BASELINE = 14.79           # mm up from the card's bottom edge, measured off sheet 04
INK = CM.MARK_C            # #141110

FOOT_SIZE = 5.5
LABEL_C = Color(0.3725, 0.3490, 0.3098)        # #5F594F, the set's adult-text grey
LABEL_Y = 277.0
FOOT_Y = 18.0
TEXT_X = X0 + 5.0

# Tray 8 grammar colours, unchanged from 10-grammar-pack.pdf
TRI_C = Color(0.0784, 0.0667, 0.0549)          # #141110  naming word
CIR_C = Color(0.7843, 0.0627, 0.1804)          # #C8102E  doing word
DOT_C = Color(0.5490, 0.5216, 0.4824)          # #8C857B  small word

SYM_RIGHT = 5.5            # mm in from the card's right edge (the 4 mm rule + slack)
SYM_BOTTOM = 5.5           # mm up from the card's bottom edge
TRI_BASE = 4.6             # mm
CIR_D = 4.2                # mm
DOT_D = 2.6                # mm


# ---------------------------------------------------------------- words ----
# From the eleven Dark Phonics Easy Readers, deduped, sorted inside each group.
CATEGORIES = [
    ("naming", "naming words", "triangle",
     ["bed", "bell", "box", "cat", "cats", "chick", "chip", "cot", "crab",
      "fish", "fox", "frog", "hen", "hill", "moth", "moths", "mud", "pup",
      "sand", "sun", "tub"]),
    ("doing", "doing words", "circle",
     ["cut", "digs", "fell", "fix", "jump", "mix", "ran", "sat", "sit",
      "splash"]),
    ("small", "small words", "dot",
     ["a", "and", "bad", "big", "bonk", "hot", "in", "is", "it", "mad", "my",
      "off", "on", "red", "six", "that", "the", "this", "tip", "to", "top",
      "wet"]),
]


def slots():
    """Every card slot, in order, as (word|None, symbol|None, category|None).

    A category starts a fresh row; its last row is padded with blanks, and the
    last page is padded out to a whole grid.
    """
    out, page_rows = [], []
    for key, _label, sym, words in CATEGORIES:
        rows = []
        for i in range(0, len(words), COLS):
            chunk = words[i:i + COLS]
            rows.append([(w, sym, key) for w in chunk]
                        + [(None, None, None)] * (COLS - len(chunk)))
        page_rows.append((key, rows))
    flat = []
    for key, rows in page_rows:
        for r in rows:
            flat.append((key, r))
    while len(flat) % ROWS:
        flat.append((None, [(None, None, None)] * COLS))
    for _key, r in flat:
        out.extend(r)
    pages = [flat[i:i + ROWS] for i in range(0, len(flat), ROWS)]
    return out, pages


def page_label(page):
    keys = []
    for key, _row in page:
        if key and key not in keys:
            keys.append(key)
    names = {k: lbl for k, lbl, _s, _w in CATEGORIES}
    if not keys:
        return "word cards · blanks"
    return "word cards · " + " · ".join(names[k] for k in keys)


# ----------------------------------------------------------------- font ----
def fredoka_medium():
    """Fredoka ships as one variable font whose default instance is Light.

    Sheet 04's heart words are Fredoka MEDIUM, so the wght=500 / wdth=100
    instance is cut here at build time and thrown away with .build/ — a static
    Medium is not in the repo and does not need to be.
    """
    BUILD_DIR.mkdir(exist_ok=True)
    out = BUILD_DIR / "Fredoka-Medium-inst.ttf"
    if not out.exists():
        var = ttLib.TTFont(str(FREDOKA_VAR))
        inst = instancer.instantiateVariableFont(var, {"wght": 500, "wdth": 100})
        inst.save(str(out))
    pdfmetrics.registerFont(TTFont("FredokaMedium", str(out)))
    pdfmetrics.registerFont(TTFont("Andika", str(FONT_DIR / "Andika-Regular.ttf")))
    return out


# ----------------------------------------------------------------- draw ----
def symbol(c, kind, x_right, y_bottom):
    c.saveState()
    if kind == "triangle":
        h = TRI_BASE * math.sqrt(3.0) / 2.0
        cx = x_right - TRI_BASE / 2.0
        p = c.beginPath()
        p.moveTo((cx - TRI_BASE / 2.0) * mm, y_bottom * mm)
        p.lineTo((cx + TRI_BASE / 2.0) * mm, y_bottom * mm)
        p.lineTo(cx * mm, (y_bottom + h) * mm)
        p.close()
        c.setFillColor(TRI_C)
        c.drawPath(p, stroke=0, fill=1)
    elif kind == "circle":
        c.setFillColor(CIR_C)
        c.circle((x_right - CIR_D / 2.0) * mm, (y_bottom + CIR_D / 2.0) * mm,
                 CIR_D / 2.0 * mm, stroke=0, fill=1)
    elif kind == "dot":
        c.setFillColor(DOT_C)
        c.circle((x_right - DOT_D / 2.0) * mm, (y_bottom + DOT_D / 2.0) * mm,
                 DOT_D / 2.0 * mm, stroke=0, fill=1)
    c.restoreState()


def card(c, x, y, word, sym):
    if word:
        c.saveState()
        c.setFillColor(INK)
        c.setFont("FredokaMedium", WORD_SIZE)
        c.drawCentredString((x + CARD_W / 2.0) * mm, (y + BASELINE) * mm, word)
        c.restoreState()
        symbol(c, sym, x + CARD_W - SYM_RIGHT, y + SYM_BOTTOM)


def grid():
    v, h = CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)
    return v, h


def check(pages):
    bad = []
    v, h = grid()
    for x, _a, _b in v:
        if x < CM.SAFE or x > PAGE_W - CM.SAFE:
            bad.append("a vertical cut line at x %.1f breaks the safe margin" % x)
    for y, _a, _b in h:
        if y < CM.SAFE or y > PAGE_H - CM.SAFE:
            bad.append("a horizontal cut line at y %.1f breaks the safe margin" % y)
    for yy, what in ((LABEL_Y, "label"), (FOOT_Y, "footer")):
        if yy < CM.SAFE or yy > PAGE_H - CM.SAFE:
            bad.append("the %s at y %.1f breaks the safe margin" % (what, yy))
        if any(abs(yy - y) < 3.0 for y, _a, _b in h):
            bad.append("the %s sits on a horizontal cut line" % what)
    if TEXT_X < 14.0 or PAGE_W - TEXT_X < 14.0:
        bad.append("adult text starts within 14 mm of a page edge")
    if any(abs(TEXT_X - x) < 3.0 for x, _a, _b in v):
        bad.append("adult text starts on a vertical cut line")
    # every word must clear the card edge by CONTENT_CLEAR on all four sides
    asc = pdfmetrics.getAscent("FredokaMedium", WORD_SIZE) / 72.0 * 25.4
    desc = abs(pdfmetrics.getDescent("FredokaMedium", WORD_SIZE)) / 72.0 * 25.4
    if BASELINE - desc < CM.CONTENT_CLEAR:
        bad.append("a descender reaches %.2f mm of the card foot" % (BASELINE - desc))
    if CARD_H - (BASELINE + asc) < CM.CONTENT_CLEAR:
        bad.append("an ascender reaches %.2f mm of the card head"
                   % (CARD_H - BASELINE - asc))
    widest, wmm = "", 0.0
    for _k, _l, _s, words in CATEGORIES:
        for w in words:
            ww = pdfmetrics.stringWidth(w, "FredokaMedium", WORD_SIZE) / 72.0 * 25.4
            if ww > wmm:
                widest, wmm = w, ww
    if (CARD_W - wmm) / 2.0 < CM.CONTENT_CLEAR:
        bad.append("the widest word %r is %.2f mm wide and crowds the card edge"
                   % (widest, wmm))
    if SYM_RIGHT - max(TRI_BASE, CIR_D) < 0 or SYM_BOTTOM < CM.CONTENT_CLEAR:
        bad.append("a corner symbol breaks the 4 mm content margin")
    words = sum(len(w) for _k, _l, _s, w in CATEGORIES)
    if len(set(sum([list(w) for _k, _l, _s, w in CATEGORIES], []))) != words:
        bad.append("the word list has a duplicate")
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return dict(widest=widest, wmm=wmm, asc=asc, desc=desc, words=words)


def build():
    fredoka_medium()
    _flat, pages = slots()
    stats = check(pages)
    v, h = grid()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Writing Shelf · word-card tin")
    marks = 0
    for page in pages:
        for r, (_key, row) in enumerate(page):
            y = Y0 + (ROWS - 1 - r) * CARD_H
            for ci, (word, sym, _cat) in enumerate(row):
                card(c, X0 + ci * CARD_W, y, word, sym)
        st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
        marks = st["marks"]
        c.saveState()
        c.setFillColor(LABEL_C)
        c.setFont("Andika", FOOT_SIZE)
        c.drawString(TEXT_X * mm, LABEL_Y * mm, page_label(page))
        c.restoreState()
        CM.footer(c, TEXT_X, FOOT_Y, CM.cards_line(COLS * ROWS, "card"),
                  "Andika", FOOT_SIZE)
        c.showPage()
    c.save()
    n_blank = len(pages) * ROWS * COLS - stats["words"]
    print("word-card tin -> %s" % OUT_DIR)
    print("  %-30s %d pp · %d cards a page (%d x %d of %g x %g mm) · %d words + "
          "%d blanks · %d cut lines, %d triangles · %.0f KB"
          % (NAME, len(pages), COLS * ROWS, COLS, ROWS, CARD_W, CARD_H,
             stats["words"], n_blank, len(v) + len(h), marks,
             out.stat().st_size / 1024.0))
    print("  word %.4f pt Fredoka Medium, baseline %.2f mm — sheet 04's heart word, "
          "exactly · widest %r %.2f mm" % (WORD_SIZE, BASELINE,
                                           stats["widest"], stats["wmm"]))


if __name__ == "__main__":
    build()
