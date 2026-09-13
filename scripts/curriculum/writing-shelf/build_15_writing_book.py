#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dark Phonics · Writing Shelf · sheet 15, the Tray 5 A5 WRITING BOOK

THE STEP THE SHELF WAS MISSING.  Sheet 14 gave Tray 5 eighteen illustrated
sentence cards and sheet 12 gave it the tin of loose words, so the child can
DRAW a card, SAY it, and BUILD it.  What he could not do was WRITE it: sheet 05
put blank ruled strips on the tray for that, and blank strips failed in the
room, because a loose strip has nothing on it to tell the child WHICH sentence
he is writing.  He builds "the cat digs", picks up a strip, and the strip is
silent.  So the strip became a place to practise handwriting rather than the
last movement of a piece of work, and it was thrown away afterwards.

This book replaces it.  It is HIS OWN, it has his name in the plate on the
cover, and every one of the eighteen cards has a page in it with that card's
PICTURE on it.  The work is now closed at both ends:

    draw a card  ->  build it from the tin  ->  find that picture in MY book
                 ->  write the sentence under it  ->  check it against the card

and the book only goes home when all eighteen are done, which is why page 3 is
a tracker and page 23 is a finishing page and not a blank.

NOTHING IS PRINTED ON THE LINES.  Not the sentence, not a model, not a word
bank, not the card's number.  The model is the sentence the child has just laid
out in front of him in real word cards; a model printed on the page would make
the tiles ornamental and turn the work into copying.  The picture identifies
the page, the tiles are the model, the card back is the control of error.

THE TIER IS A COLOUR AND NOTHING ELSE, exactly as on sheet 14 and for the same
reason a pink-series card has never had "pink series" printed on it.  Each page
carries a small coloured TAB on its FORE-EDGE (the outer edge, away from the
fold, so it alternates left/right with verso/recto), and the tab sits high for
pink, middle for blue and low for green — so the closed book shows three
blocks down its fore-edge and a child can open at his own colour without
reading a word.  Colours are sheet 14's TIER_C, imported, not re-declared.

WHY 6.6 mm AND TWO RULES.  The rule is the school three-line rule ported
verbatim from build_tracing.py: dotted headline, dashed midline, solid
baseline, u apart.  u = 6.6 mm gives a 6.6 mm x-height, which is the size the
same child writes at on the Tray 5 strips he already uses.  Two rules is one
sentence with room to have another go at it; a sentence of FIVE OR MORE WORDS
gets a third, computed from the word count (there are three of those, and the
seven-word "the sad dad sat in the sand" is the reason the rule exists).

THE PICTURE BAND IS FIXED — 85 mm tall, its top on 192 mm — on EVERY work page
whatever the rule count, so the book reads as one book and not as eighteen
layouts.  The extra air a two-rule page has falls BETWEEN the picture and the
lines, where it is invisible, instead of moving the picture.

THE ART IS SHEET 14's PREPARED ART, not the source PNGs: .build/sentence-
builder/<slug>.jpg, which build_14 has already white-pointed, ink-trimmed and
resampled.  Reading the source art again here would mean a second copy of that
whole pipeline and two pictures of one card that do not match.  Run sheet 14
first if .build/ is empty; this script says so rather than guessing.

THE CARD TABLE IS NOT DECLARED HERE EITHER.  It is imported from sheet 14,
which mirrors SENTENCE_BUILDER_CARDS in writing-shelf-language.ts and refuses
to build if the two have drifted — and this script calls that same check before
it draws anything, so the book cannot describe a deck the app does not have.

24 pages = 6 saddle-stitched A4 sheets.  Page order, imposition, folio, cover
bookplate and the print note are build_booklets.py's, imported and not copied:
a writing book that came out of a different imposition to the readers would be
a different physical object on the same shelf.

Run:   python3 scripts/curriculum/writing-shelf/build_15_writing_book.py
Needs: reportlab, Pillow (via sheet 14), the canvas fonts
Out:   public/dark-phonics-shelf/v2/15-writing-book-print.pdf   (imposed — PRINT THIS)
       public/dark-phonics-shelf/v2/15-writing-book-reading.pdf (screen / proofing order)
"""

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]

# FONTS: env -> repo -> the canvas-design skill folder.  build_booklets.py
# registers the seven house faces at IMPORT time off MONTREE_CANVAS_FONTS, so
# the resolution has to happen before it is imported, not after.
_REPO_FONTS = REPO / "scripts" / "curriculum" / "flashcards" / "canvas-fonts"
if not os.environ.get("MONTREE_CANVAS_FONTS") and _REPO_FONTS.is_dir():
    os.environ["MONTREE_CANVAS_FONTS"] = str(_REPO_FONTS) + "/"

sys.path.insert(0, str(HERE))
sys.path.insert(0, str(REPO / "scripts" / "curriculum" / "flashcards"))

from reportlab.lib.pagesizes import A4, landscape           # noqa: E402
from reportlab.lib.units import mm                          # noqa: E402
from reportlab.lib.utils import ImageReader                 # noqa: E402
from reportlab.pdfgen import canvas as rl_canvas            # noqa: E402

import build_booklets as BB                                 # noqa: E402
import build_12_word_card_tin as TIN                        # noqa: E402
import build_14_sentence_builder_cards as SB                # noqa: E402

PW, PH, M = BB.PW, BB.PH, BB.M          # 148.5 x 210 mm, 14 mm margin — in POINTS
INK, RED = BB.INK, BB.RED
SOFT_GREY, HAIR_GREY, RULE_GREY = BB.SOFT_GREY, BB.HAIR_GREY, BB.RULE_GREY

ART_DIR = HERE / ".build" / "sentence-builder"
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
SLUG = "writing-book"
# The two emitted files, in the shelf's sheet sequence (build_12.NAME's shape).
# NAME_PRINT is the one the teacher prints; NAME_READING is the proofing order.
NAME_PRINT = "15-writing-book-print.pdf"
NAME_READING = "15-writing-book-reading.pdf"

# ------------------------------------------------------------ the rules ----
# THE RULES HANG DOWN FROM A CONSTANT TOP HEADLINE, they do not stand up from
# the bottom margin.  That is what makes this a book rather than eighteen
# sheets: the first line and the second line are in the SAME PLACE on every
# page in it, and a third line, on the three pages that earn one, is simply an
# extra line underneath.  Building up from a fixed bottom baseline instead —
# which is what this did first — moved the top line 21 mm between a two-rule
# page and a three-rule page, so the child had to find the lines again every
# time he turned to a long sentence.
RULE_U = 6.6 * mm            # x-height of the three-line rule (build_tracing's u)
RULE_PITCH = 21.0 * mm       # baseline to baseline
RULE_TOP_GAP = 20.0 * mm     # clear air between the picture and the top headline
RULES = 3                    # THREE ON EVERY PAGE. See the note below.

# ------------------------------------------------------ the picture band ----
# Fixed on every work page.  The rule count moves the LINES, never the picture,
# and the picture's own size moves inside the band, never the band.
ART_TOP = PH - M - 4 * mm                    # 192 mm
ART_BAND_H = 85.0 * mm
ART_BAND_BOT = ART_TOP - ART_BAND_H          # 107 mm
ART_MAX_W = PW - 2 * M - 4 * mm              # 116.5 mm
ART_CLEAR = 6.0 * mm                         # least air between lines and picture
FOLIO_TOP = 9.9 * mm                         # ink ceiling of build_booklets' folio()

# ...AND NO PICTURE IS EVER DRAWN BIGGER THAN ITS OWN PIXELS.  Sheet 14's
# prepared art is resampled for an 80 x 120 mm CARD; this book draws it at up
# to 116.5 x 85 mm, and eleven of the eighteen came out under 200 dpi at that
# size — blob-sat at 87, which is visibly soft in a child's hand.  The band is
# not the answer: shrinking the band would move the writing lines, and re-
# rendering the art would fork sheet 14's pipeline.  So the DRAWN SIZE is
# capped by the art's own resolution — 72 pt to the inch over MIN_DPI is a
# ceiling in POINTS PER PIXEL, which is all the cap has to be — and a picture
# from a small source simply prints smaller, centred in the same band.
MIN_DPI = 220.0
MAX_PT_PER_PX = 72.0 / MIN_DPI

# ---------------------------------------------------------- the tier tab ----
# THE FORE-EDGE INDEX.  The fore edge is divided into three long tabs — pink
# top third, blue middle, green bottom — and every page of a tier carries the
# whole of its own tab.  Eighteen pages later that is three solid blocks of
# colour down the closed book's edge, and a child opens at his colour with his
# thumb instead of leafing.  A short mark would only read as a stray flaw on
# the page; the length IS the feature.  Outer edge only, so it alternates with
# verso and recto and always lands on the edge away from the fold.
TIER_C = SB.TIER_C                           # sheet 14's pink / blue / green
TAB_W = 2.2 * mm
TAB_EDGE = 7.0 * mm                          # off the trim; clears the 5.5 mm safe margin
TAB_GAP = 6.0 * mm                           # white between one tier's block and the next
TAB_H = (PH - 2 * M - 2 * TAB_GAP) / 3.0     # 56.7 mm
TAB_SLOT = {1: 2, 2: 1, 3: 0}                # pink top, blue middle, green bottom


# THREE RULES ON EVERY PAGE, AND THE SENTENCE LENGTH DOES NOT GET A VOTE.
# This started out as two rules, with a third computed for any sentence of five
# words or more — and that was the old blank sentence strip's mistake wearing a
# smarter hat.  The strips failed in the room because they did not give the
# child ROOM; a two-rule page left forty-five millimetres of empty paper under
# the writing, which is a whole line of white saying "you have finished" to a
# child who has not.  A child with three words to write leaves two lines blank
# and that costs nothing.  A child who needs to have another go, or who writes
# large, or who is on his second attempt at "the sad dad sat in the sand", has
# somewhere to go.  Err long, never short.  It also makes all eighteen pages
# the SAME page, which is the other half of the argument: the lines are in the
# same three places in the whole book, so a child never looks for them twice.
def top_headline():
    """The y of the highest dotted headline. The same on every page."""
    return ART_BAND_BOT - RULE_TOP_GAP


def baselines():
    """The three baselines, top one first, hanging off the constant headline."""
    top = top_headline() - 2 * RULE_U
    return [top - i * RULE_PITCH for i in range(RULES)]


# ------------------------------------------------------------------ art ----
def art_for(slug):
    p = ART_DIR / ("%s.jpg" % slug)
    if not p.exists():
        raise SystemExit(
            "missing prepared art: %s\n"
            "  Sheet 14 prepares it. Run:\n"
            "    python3 scripts/curriculum/writing-shelf/"
            "build_14_sentence_builder_cards.py" % p)
    return p


def art_box(img):
    """Fitted (x, y, w, h) for one picture, centred in the fixed band.

    Three ceilings, whichever bites first: the band's width, the band's height,
    and the art's OWN RESOLUTION (see MIN_DPI). The band never moves.
    """
    iw, ih = img.getSize()
    sc = min(ART_MAX_W / float(iw), ART_BAND_H / float(ih), MAX_PT_PER_PX)
    w, h = iw * sc, ih * sc
    return (PW - w) / 2.0, ART_BAND_BOT + (ART_BAND_H - h) / 2.0, w, h


def art_dpi(img):
    """The resolution the picture actually lands on the page at."""
    iw, ih = img.getSize()
    _x, _y, w, h = art_box(img)
    return min(iw * 72.0 / w, ih * 72.0 / h)


# ------------------------------------------------------------ guidelines ----
def guidelines(c, x0, x1, base, u):
    """Three-line school paper: dotted headline, dashed midline, solid baseline.

    Ported verbatim from scripts/curriculum/satpin-paperwork/build_tracing.py so
    the book and the tracing workbooks rule identically.
    """
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


# ------------------------------------------------------------- page bits ----
def tier_tab(c, tier, recto):
    """The fore-edge colour tab. Outer edge = right on a recto, left on a verso."""
    x = (PW - TAB_EDGE - TAB_W) if recto else TAB_EDGE
    y = M + TAB_SLOT[tier] * (TAB_H + TAB_GAP)
    col = TIER_C[tier]
    c.setFillColorRGB(col.red, col.green, col.blue)
    c.roundRect(x, y, TAB_W, TAB_H, TAB_W / 2.0, stroke=0, fill=1)


def head(c, label, y=None):
    """The house tracked small-caps heading, as on WORDS IN THIS BOOK."""
    y = PH - M - 30 * mm if y is None else y
    BB.draw_tracked(c, PW / 2, y, '   '.join(' '.join(w) for w in label.split()),
                    'Label', 8, 0.3, INK)
    return y


def wrap(c, text, font, size, maxw):
    out, line = [], ''
    for word in text.split():
        trial = (line + ' ' + word).strip()
        if c.stringWidth(trial, font, size) <= maxw or not line:
            line = trial
        else:
            out.append(line)
            line = word
    if line:
        out.append(line)
    return out


# ----------------------------------------------------------- the painters ----
def page_cover(c, _b):
    """Typographic. No art: nothing in the shelf's picture library is a drawing
    OF WRITING, and a borrowed sentence-card picture on the cover would say
    this book is about that one card. The three tier dots say what it is."""
    BB.draw_tracked(c, PW / 2, PH - M - 8, 'M O N T R E E   P H O N I C S',
                    'Label', 8.5, 0.28, INK)
    BB.draw_tracked(c, PW / 2, PH - M - 22, 'THE WRITING SHELF  ·  TRAY FIVE',
                    'Label', 7.5, 0.22, INK)
    size = min(BB.fit(c, 'My Writing Book', 'Title', 40, PW - 2 * M), 40)
    c.setFont('Title', size)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, PH - M - 30 - size * 1.25, 'My Writing Book')
    # A hairline under the title holds the top block together, and the three
    # series colours below it are the whole cover device.  They are repeated on
    # the fore-edge at the heights their tabs sit at inside the book, so the
    # cover IS the index: pink high, blue middle, green low, which is exactly
    # the three blocks the closed book shows down its edge.
    rule_y = PH - M - 30 - size * 1.25 - 11 * mm
    c.setStrokeColorRGB(*HAIR_GREY)
    c.setLineWidth(0.5)
    c.setDash()
    c.line(M, rule_y, PW - M, rule_y)
    # The three colours live on the FORE EDGE, where they are the index; a row
    # of dots in the middle of the cover said the same thing a second time and
    # left the middle of the cover a void. The middle is the CHILD'S instead:
    # he draws the one he liked best, and the finished book has a reason to be
    # picked up and looked at.
    for tier in (1, 2, 3):
        tier_tab(c, tier, recto=True)
    bw, bh = 90 * mm, 70 * mm
    bx, by = (PW - bw) / 2.0, rule_y - 12 * mm - bh
    c.setStrokeColorRGB(*HAIR_GREY)
    c.setLineWidth(0.5)
    c.setDash()
    c.roundRect(bx, by, bw, bh, 2 * mm, stroke=1, fill=0)
    c.setFont('Nar', 9.5)
    c.setFillColorRGB(*SOFT_GREY)
    c.drawCentredString(PW / 2, by - 7.5 * mm, 'draw the one you liked best')
    c.setFillColorRGB(*RED)
    c.circle(PW / 2, M + 12.5 * mm, 1.6 * mm, stroke=0, fill=1)
    BB.draw_bookplate(c)


HOW_IT_WORKS = [
    'Take a card. Build the sentence with the word tiles.',
    'Read it back, touching each word.',
    'Find the picture in this book. Write the sentence under it.',
    'Full stop goes on last. Check the card, then put it away.',
    'Sandpaper letters stay within reach — if a stroke goes wrong, go back '
    'to the letter, not the sentence.',
]


def page_inside_front(c, _b):
    y = head(c, 'HOW THIS BOOK WORKS')
    y -= 16 * mm
    num_w = 7 * mm
    body_w = PW - 2 * M - num_w
    for i, item in enumerate(HOW_IT_WORKS, 1):
        lines = wrap(c, item, 'Nar', 9.5, body_w)
        c.setFont('Nar', 9.5)
        c.setFillColorRGB(*SOFT_GREY)
        c.drawString(M, y, '%d.' % i)
        c.setFillColorRGB(*INK)
        for ln in lines:
            c.drawString(M + num_w, y, ln)
            y -= 5.2 * mm
        y -= 4.2 * mm


def page_halftitle(c, _b):
    """The tracker. Three dots, six squares each — one square per finished page,
    eighteen in all. No difficulty word anywhere: the colour is the tier."""
    c.setFont('Title', 17)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, PH * 0.78, 'My Writing Book')
    c.setFillColorRGB(*RED)
    c.circle(PW / 2, PH * 0.78 - 9 * mm, 1.1 * mm, stroke=0, fill=1)

    sq, gap = 9 * mm, 3.2 * mm
    block_w = 2 * sq + gap
    top = PH * 0.56
    for i, tier in enumerate((1, 2, 3)):
        cx = PW / 2 + (i - 1) * (block_w + 16 * mm)
        col = TIER_C[tier]
        c.setFillColorRGB(col.red, col.green, col.blue)
        c.circle(cx, top, 3.4 * mm, stroke=0, fill=1)
        c.setStrokeColorRGB(*RULE_GREY)
        c.setLineWidth(0.6)
        c.setDash()
        for r in range(3):
            for col_i in range(2):
                x = cx - block_w / 2 + col_i * (sq + gap)
                y = top - 14 * mm - sq - r * (sq + gap)
                c.roundRect(x, y, sq, sq, 1.2 * mm, stroke=1, fill=0)
    c.setFont('Nar', 9.5)
    c.setFillColorRGB(*SOFT_GREY)
    c.drawCentredString(PW / 2, top - 14 * mm - 3 * sq - 2 * gap - 12 * mm,
                        'Colour a square each time you finish a page.')


def make_work_page(slug, tier, sentence):
    img = ImageReader(str(art_for(slug)))

    def _p(c, _b):
        x, y, w, h = art_box(img)
        c.drawImage(img, x, y, w, h, mask='auto')
        for base in baselines():
            guidelines(c, M, PW - M, base, RULE_U)
        c.setDash()

    _p.slug, _p.tier, _p.sentence, _p.rules = slug, tier, sentence, RULES
    _p.img = img
    return _p


def page_words(c, _b):
    y = head(c, 'WORDS IN THIS BOOK')
    y -= 15 * mm
    words = sorted({w for _k, _l, _s, ws in TIN.CATEGORIES for w in ws})
    cols, size, pitch = 4, 12, 7.4 * mm
    rows = -(-len(words) // cols)
    colw = (PW - 2 * M) / float(cols)
    c.setFont('WordRg', size)
    c.setFillColorRGB(*INK)
    for i, word in enumerate(words):
        cx = M + (i // rows) * colw + colw / 2.0
        c.drawCentredString(cx, y - (i % rows) * pitch, word)
    y -= rows * pitch + 10 * mm

    hs = 11.0
    c.setFillColorRGB(*RED)
    BB.draw_heart(c, PW / 2, y + 2.2, hs)
    y -= 9 * mm
    BB.draw_tracked(c, PW / 2, y, 'W O R D S   W E   K N O W   B Y   H E A R T',
                    'Label', 7.5, 0.26, SOFT_GREY)
    y -= 11 * mm
    hearts = ['a', 'an', 'I', 'the', 'ate']
    c.setFont('WordRg', 14)
    c.setFillColorRGB(*INK)
    widths = [c.stringWidth(w, 'WordRg', 14) for w in hearts]
    gap = 11 * mm
    x = PW / 2 - (sum(widths) + gap * (len(hearts) - 1)) / 2.0
    for w, ww in zip(hearts, widths):
        c.drawString(x, y, w)
        x += ww + gap


def page_finished(c, _b):
    y = head(c, 'THIS BOOK IS FINISHED')
    y -= 16 * mm
    c.setFont('Nar', 11)
    c.setFillColorRGB(*INK)
    lbl = 'finished on'
    c.drawString(M, y, lbl)
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(0.6)
    c.setDash()
    c.line(M + c.stringWidth(lbl, 'Nar', 11) + 4 * mm, y - 1.2 * mm, PW - M, y - 1.2 * mm)

    box_top = y - 12 * mm
    box_bot = M + 24 * mm
    c.setStrokeColorRGB(*RULE_GREY)
    c.setLineWidth(0.6)
    c.roundRect(M, box_bot, PW - 2 * M, box_top - box_bot, 2 * mm, stroke=1, fill=0)
    c.setStrokeColorRGB(*HAIR_GREY)
    c.setLineWidth(0.35)
    c.roundRect(M + 1.6 * mm, box_bot + 1.6 * mm, PW - 2 * M - 3.2 * mm,
                box_top - box_bot - 3.2 * mm, 1.4 * mm, stroke=1, fill=0)
    c.setFont('Nar', 9.5)
    c.setFillColorRGB(*SOFT_GREY)
    c.drawCentredString(PW / 2, M + 14 * mm, 'draw your favourite one')


def page_back(c, _b):
    """Quiet. NOT build_booklets' page_back: that one says 'decodable readers'
    and promises Teacher Potato at the end of the book, and neither is true of
    a writing book."""
    BB.draw_tracked(c, PW / 2, PH * 0.60, 'M O N T R E E   P H O N I C S',
                    'Label', 9, 0.3, INK)
    c.setFont('Nar', 11)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, PH * 0.60 - 9 * mm, 'the writing shelf  ·  tray five')
    c.setFillColorRGB(*RED)
    c.circle(PW / 2, PH * 0.60 - 20 * mm, 1.6 * mm, stroke=0, fill=1)
    c.setFont('Label', 7.5)
    c.setFillColorRGB(*INK)
    c.drawCentredString(PW / 2, M + 11 * mm, 'teacherpotato.xyz')


# ----------------------------------------------------------------- build ----
def pages():
    """(painter, is_work) x 24, in reading order."""
    out = [(page_cover, None), (page_inside_front, None), (page_halftitle, None)]
    # THE TAB FOLLOWS `tier`, NOT `frameTier` (sheet 14 gained a fifth field on
    # 2026-09-13: a card may be CARRIED into a harder group and keep its own
    # easier frame — "a fox in a box" sits in the blue six wearing a pink
    # frame). The two answer different questions and must not be conflated
    # here: the card's FRAME says how hard the sentence is, and the book's
    # fore-edge TAB says WHERE THE PAGE IS. fox-box's page is in the blue
    # stretch, so its tab is blue — a pink tab there would put a hole in the
    # blue block and send a thumb to the wrong part of the book. The pink
    # FRAME on the card he is holding still tells him it is an easy one.
    for slug, tier, sentence, _art, _frame_tier in SB.CARDS:
        out.append((make_work_page(slug, tier, sentence), tier))
    out += [(page_words, None), (page_finished, None), (page_back, None)]
    return out


def check(ps):
    """Refuse to build a page whose picture and lines can touch, or a book that
    is not a whole number of saddle-stitched sheets."""
    bad = []
    n = len(ps)
    if n != 24:
        bad.append('the book is %d pages, not 24' % n)
    if n % 4:
        bad.append('%d pages does not fold into whole sheets' % n)
    seen = set()
    for painter, tier in ps:
        if tier is None:
            continue
        seen.add(painter.slug)
        gap = ART_BAND_BOT - top_headline()
        if gap < ART_CLEAR:
            bad.append('%s: only %.1f mm between the top line and the picture '
                       '(want >= %.1f)' % (painter.slug, gap / mm, ART_CLEAR / mm))
        x, y, w, h = art_box(painter.img)
        if y < ART_BAND_BOT - 1e-6 or y + h > ART_TOP + 1e-6 or w > ART_MAX_W + 1e-6:
            bad.append('%s: the picture is drawn outside its band' % painter.slug)
        dpi = art_dpi(painter.img)
        if dpi < MIN_DPI - 0.5:
            bad.append('%s: the picture lands at %d dpi (want >= %d)'
                       % (painter.slug, dpi, MIN_DPI))
        if painter.rules != RULES:
            bad.append('%s: %d rules, not %d' % (painter.slug, painter.rules, RULES))
        # FOLIO_TOP is the folio's ink ceiling: Label 6.5 pt sits on 8 mm, so it
        # reaches about 9.9 mm. Twelve millimetres of white under the last
        # baseline is the floor; less and the page number reads as a fourth line.
        low = baselines()[-1]
        if low - FOLIO_TOP < 12 * mm:
            bad.append('%s: only %.1f mm between the last baseline and the folio'
                       % (painter.slug, (low - FOLIO_TOP) / mm))
    if len(seen) != len(SB.CARDS):
        bad.append('%d work pages for %d cards' % (len(seen), len(SB.CARDS)))
    if bad:
        raise SystemExit('SPEC FAILURE:\n  ' + '\n  '.join(bad))


def build():
    n_cards = SB.check_source()          # the deck must match the TypeScript
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ps = pages()
    check(ps)
    N = len(ps)

    # reading order
    c = rl_canvas.Canvas(str(OUT_DIR / NAME_READING), pagesize=(PW, PH))
    c.setTitle('My Writing Book · A5 reading order')
    c.setAuthor(BB.PDF_AUTHOR)
    c.setCreator('Montree Phonics printable generator')
    for i, (painter, tier) in enumerate(ps):
        idx = i + 1
        painter(c, None)
        if tier is not None:
            tier_tab(c, tier, recto=(idx % 2 == 1))
            BB.folio(c, idx, left=(idx % 2 == 0))
        c.showPage()
    c.save()

    # saddle imposition on A4 landscape — dpbuild.py's loop, unchanged
    sheetW, sheetH = landscape(A4)
    c = rl_canvas.Canvas(str(OUT_DIR / NAME_PRINT),
                         pagesize=(sheetW, sheetH))
    c.setTitle('My Writing Book · Booklet print')
    c.setAuthor(BB.PDF_AUTHOR)
    c.setCreator('Montree Phonics printable generator')
    order = []
    for k in range(N // 2):
        order.append((N - k, k + 1) if k % 2 == 0 else (k + 1, N - k))
    for si, (li, ri) in enumerate(order):
        for idx, xoff in ((li, 0), (ri, sheetW / 2)):
            painter, tier = ps[idx - 1]
            c.saveState()
            c.translate(xoff + (sheetW / 2 - PW) / 2, (sheetH - PH) / 2)
            c.setFillColorRGB(1, 1, 1)
            painter(c, None)
            if tier is not None:
                tier_tab(c, tier, recto=(idx % 2 == 1))
                BB.folio(c, idx, left=(idx % 2 == 0))
            c.restoreState()
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.3)
        c.setDash()
        c.line(sheetW / 2, sheetH - 4 * mm, sheetW / 2, sheetH - 9 * mm)
        c.line(sheetW / 2, 4 * mm, sheetW / 2, 9 * mm)
        if si == 0:
            BB.draw_print_note(c)
        c.showPage()
    c.save()

    works = [p for p, t in ps if t is not None]
    dpis = sorted((art_dpi(p.img), p.slug) for p in works)
    bs = baselines()
    print('%s  %d pages, %d sheets, %d cards' % (SLUG, N, N // 4, n_cards))
    print('  picture dpi  min %d (%s)  max %d (%s)  floor %d'
          % (round(dpis[0][0]), dpis[0][1], round(dpis[-1][0]), dpis[-1][1], MIN_DPI))
    print('  %d rules on every page; headline %.1f mm; baselines %s'
          % (RULES, top_headline() / mm, ' / '.join('%.1f' % (b / mm) for b in bs)))
    print('  white: %.1f mm above the first headline, %.1f mm below the last '
          'baseline (to the folio)'
          % (RULE_TOP_GAP / mm, (bs[-1] - FOLIO_TOP) / mm))
    print('  ->', OUT_DIR / NAME_PRINT)
    print('  ->', OUT_DIR / NAME_READING)


if __name__ == '__main__':
    build()
