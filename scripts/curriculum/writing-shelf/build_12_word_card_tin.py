#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 12, the Tray 5 WORD-CARD TINS

FOUR TINS, NOT ONE, and every word printed at the size the child WRITES it.

The old sheet was one tin of fifty-three reader words on 60 x 35 mm cards, set
at sheet 04's heart-word size.  Two things were wrong with it and they are the
whole of this rebuild.

ONE · THE CARD WAS A FIXED 60 mm WIDE.  `a` got a 60 mm card and `penguin` got
a 60 mm card, so when the child butted the words up into a sentence on the mat
the ink-to-ink space between them was whatever the shorter word happened to
leave — 26 mm after `a`, 10 mm after `splash`.  The tin was teaching him to
leave gigantic and uneven spaces between his words, which is the one thing a
word-building material exists to teach him NOT to do.  The card is now MEASURED:

    G          = 7.0 mm, the word space
    card width = the word's INK width + G, to the nearest 0.1 mm
    the word   = placed with exactly G/2 of paper from the card's left edge to
                 its first ink, and G/2 from its last ink to the right edge

There is no minimum.  `a` comes out a 12.3 mm sliver and that is correct: a
sliver is what the word IS.  Butt any two cards and the space between the last
ink of one word and the first ink of the next is G — 7.0 mm, 0.52 em — for EVERY
pair in every tin, whatever letters meet.

PADDING BY THE INK IS THE WHOLE OF IT, and padding by the ADVANCE was the first
cut of this and was wrong.  stringWidth() measures the advance box, which
carries each glyph's side bearings: `o` sits well inside its advance, `j` and
`y` hang outside theirs.  Pad by that and the paper between two cards is
constant but the space the EYE reads — ink to ink — swings from 2.85 mm to
6.17 mm depending on which letters happen to meet, and on the proof
`blob cat crab dad penguin` came out with word gaps barely wider than the letter
gaps inside the words.  The child cannot see a word boundary he cannot measure.
So the card is measured on the real glyph outlines, first glyph's left side
bearing and last glyph's right side bearing included, and the gap is constant in
the only units that matter.

WHY 7.0 AND NOT A DERIVED NUMBER.  The obvious G is one letter wide — the ink of
this font's own `o` at this size, 5.909 mm — which is the oldest rule in setting
type and is what this sheet shipped first.  Set as real cards at true scale and
looked at, it was still tight: these are LOOSE cards a child pushes together with
his hands, not glyphs locked in a line, and a gap that reads as a word space on
a page reads as a join when the pieces can drift a millimetre.  7.0 mm was
chosen by eye off .build/gap_compare.py, which draws 4.0 / 5.0 / 5.909 / 7.0 /
8.5 through these very functions on an A3 sheet that prints life size.  4.0 and
5.0 crowd; 8.5 breaks the sentence into separate objects.  The `o` derivation is
kept in word_space() as the None branch and is what the proof still calls; it
was not lost, it was outvoted.

THE 0.1 mm GRID is the nearest tenth, not the next tenth up: the roundoff is then
at most 0.05 mm and it is SPLIT between the two sides of the card, so no butted
pair is more than 0.05 mm off G.  The cut is found off a printed tick, never off
a ruler, so nothing about the cutting wanted a coarser grid.

THE TYPEFACE IS COMIC NEUE, sheets 13/14/15's face, single-storey a and g, and
the same file: public/fonts/ComicNeue-Regular.ttf.  Not sheet 04's Fredoka —
Fredoka is the flashcard display face and the tin is now a WRITING material.

THREE TINS AND A FOURTH SET.  Tray 5's eighteen sentence cards are graded pink /
blue / green (sheet 14, the Montessori reading series), and a tin that holds all
the words for all three tiers is a tin the child has to sort before he can start.
So there are three tins, one a tier, and each is SELF-CONTAINED: it holds every
word that tier's six sentences need, in the maximum number any SINGLE sentence
of that tier needs at once.  Pink holds `a` TWICE because of "a pig in a wig";
blue holds `a` twice for "a fox in a box"; green holds `the` twice for "the sad
dad sat in the sand".  Words shared across tiers are printed again in each tin.
That duplication is the point: he takes down one tin and never reaches for
another, and no tin can be half of a sentence.

The FOURTH set is uncoloured and is for FREE COMPOSITION: the reader words the
tin already held that no sentence card uses — bell, chick, splash, bonk and the
rest — plus the ten blank cards, so the tin grows as the readers do.  Its rule
is a neutral charcoal, which is the absence of a tier and not a fourth one.

THE TIER COLOUR IS THE BASELINE.  A 0.5 mm rule runs the FULL width of the card,
edge to edge, and the word sits on it.  It is a WRITING LINE, not a highlighter
stripe: the first cut of this sheet drew it 1.8 mm thick and it read as a bar
under the word and swallowed the descenders whole — the g of `penguin` and the p
of `jump` vanished into it.  0.5 mm in full tier colour still carries across a
room for sorting, and the word is drawn AFTER the rule so the descenders cross
OVER it exactly as they do on ruled paper and in the booklet, whose own baseline
is 0.9 pt.  That is the only colour on the card and
it does three things at once: it says which tin the card belongs to, it is the
line the letters stand on — so the card is a one-word writing line — and when
the cards are butted the rules join into ONE continuous coloured line under the
whole sentence.  There is no frame, no tint, no label.  Colours are sheet 14's
TIER_C, imported, never re-declared.

THE PART-OF-SPEECH MARK IS ON THE BACK OF THE CARD, and that is a teaching
decision, not a layout one.  With the mark on the FRONT, laying the Tray 8
grammar symbols over a built sentence is a NAMING exercise — the card has already
told him the answer.  With it on the back, he lays his own symbols, turns the
cards over, and the card tells him whether he was right.  The card becomes its
own CONTROL OF ERROR, which is the whole Montessori argument, and sorting back
into the tin's three compartments still works: he flips.

The mark is DEAD CENTRE on that face, on both axes, and it is deliberately not
inset from a corner: a 1-2 mm duplex misregistration is glaring on a mark held
3 mm off the corner of an 11 mm card and invisible on one in the middle.  Nothing
else is on the back — no word, no rule, no caption, no cut line.  An otherwise
empty back face is correct, and the cut is made from the front.

Shapes and colours are the Tray 8 grammar pack's, unchanged: black triangle =
naming word, red circle = doing word, small grey dot = small word.  The sizes are
CONSTANT across every card and are not scaled to the card, because the circle and
the dot are the same shape and the grammar pack's own argument is that "the size
is what keeps them apart" — a dot on a wide card must never grow into a circle.
They are therefore sized off the NARROWEST card in the build (`a`, 11.2 mm), with
2.6 mm of clear paper each side of the widest of them for the press to drift into.

DUPLEX, FLIP ON THE SHORT EDGE, which is the set's convention (build_booklets'
PRINT_NOTE, sheet 01, the Tray 4 cards).  A short-edge flip of a portrait sheet
is (x, y) -> (x, H - y): top and bottom swap, LEFT AND RIGHT DO NOT.  So a back
page carries its cards at the SAME x, in the same left-to-right order and at
exactly the same widths, with the STRIPS mirrored top to bottom — and each mark
is drawn rotated 180 degrees in the back page's own frame, so that it stands the
right way up once the card is turned.  check() simulates the flip card by card
and refuses to build unless every front card is backed by one card of identical
width in the mirrored position.  Pages therefore come in front/back pairs and the
page count is double what the cards alone would need.

THE SHEET IS LAID IN STRIPS, NOT A GRID, because the cards are no longer all the
same width.  A strip is 28 mm tall and holds cards butted left to right from the
left margin until the next one will not fit; then a new strip starts.  The strips
are separated by an 8 mm gutter and each is bounded top and bottom by a
full-width cut line with a triangle at each end, per cutmarks.py's CUT ONCE
standard.  The one place this sheet cannot follow that standard is the VERTICAL
cut: a full-height vertical would run through the middle of the cards in every
other strip, since no two strips share their card boundaries.  So a vertical is a
TICK — the same grey hairline, running the height of its own strip and 3.5 mm out
into the gutter above and below, where the eye and the blade pick it up before
they reach the card.  The hairline crosses the card because it IS the card edge
and is cut away, which is the standard's own rule 3 and is why the tick can be
trusted after the strip has been cut free of the sheet.

ONE TIN TO A PAGE RUN, in tray order: pink, blue, green, then the free set.  A
page never mixes tins, for sheet 14's reason — the teacher prints each tin on its
own stock — and a page holding fewer than seven strips centres them, so a short
page reads as composed and not as a full page that failed to fill.

WHAT IS IN EACH TIN IS DERIVED, NEVER TYPED.  SENTENCE_BUILDER_CARDS in
lib/montree/dark-phonics/writing-shelf-language.ts is the source of truth; the
counts above are read off its sentences, and check_source() — sheet 14's, called
through — refuses to build if the mirror has drifted.  A sentence word that has
no part-of-speech class here also stops the build, so a new card can never
quietly leave its word out of the tin.

Eleven words the readers use arrived with sheet 14's sentences and are now in the
ledger: ant, sad, pig, wig, naps, star, penguin, spat, blob, dad, can, classed
the way WORD_CLASSES in the same TypeScript classes them (its `describing` and
`little` both land in this sheet's `small` compartment, as `bad` and `hot`
already did).

Run:   python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py
Needs: reportlab, fontTools; pdftoppm (poppler) for the x-height probe and the
       proof PNGs — the build says so loudly rather than skipping if it is absent.
"""

import collections
import functools
import math
import shutil
import subprocess
from pathlib import Path

from fontTools import ttLib
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import build_14_sentence_builder_cards as SB
import cutmarks as CM

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
FONT_DIR = REPO / "public" / "fonts"
BUILD_DIR = HERE / ".build"
PROOF_DIR = BUILD_DIR / "proof"
NAME = "12-word-card-tin.pdf"
PDF_TITLE = "Dark Phonics · Writing Shelf · word-card tin"
PDF_AUTHOR = "Montree Phonics"          # build_booklets.PDF_AUTHOR, the set's
PRINT_NOTE = "print DUPLEX, flip on the SHORT edge, 100%"

PAGE_W, PAGE_H = 210.0, 297.0

# ---------------------------------------------------------------- the size ----
# 6.6 mm is build_15_writing_book.RULE_U and build_tracing's u.  It is NOT
# imported: build_15 imports THIS module (for the word ledger), so importing it
# back would be a cycle.  If the book's rule ever moves, move this with it.
X_HEIGHT = 6.6                          # mm — the x-height of the writing rule
WORD_FONT = "ComicNeue"
WORD_TTF = FONT_DIR / "ComicNeue-Regular.ttf"
ADULT_FONT = "Andika"
ADULT_TTF = FONT_DIR / "Andika-Regular.ttf"

# ---------------------------------------------------------------- the card ----
CARD_H = 28.0                           # mm, every card
BASELINE = 9.0                          # mm up from the card's bottom edge
RULE_H = 0.5                            # mm — the coloured baseline rule
W_STEP = 0.1                            # mm — card width, to the NEAREST tenth
BLANK_W = 30.0                          # mm — a blank card, room for a long word

# The mark, centred on the BACK face.  Constant across every card: the circle and
# the dot are one shape told apart by size.  Sized off the narrowest card in the
# build so the largest of them keeps MARK_CLEAR of paper each side of it.
TRI_BASE = 6.0                          # mm — naming word
CIR_D = 5.4                             # mm — doing word
DOT_D = 3.2                             # mm — small word
MARK_CLEAR = 2.5                        # mm — paper each side on the thinnest card

# ---------------------------------------------------------------- the sheet ----
X0 = 15.0                               # mm — every strip starts here
STRIP_MAX_W = PAGE_W - 2.0 * X0         # 180.0
MAX_STRIPS = 7
GUTTER = 8.0                            # mm between strips
TICK_OVER = 3.5                         # mm a vertical tick runs into the gutter
BAND_BOT, BAND_TOP = 26.0, 270.0        # the band the strips are centred in

LABEL_Y = 277.0
FOOT_Y = 18.0
FOOT_SIZE = 5.5
TEXT_X = X0 + 5.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)         # #5F594F, the set's adult grey
INK = CM.MARK_C                                 # #141110, the house ink

# Tray 8 grammar colours, unchanged from 10-grammar-pack.pdf
TRI_C = Color(0.0784, 0.0667, 0.0549)           # #141110  naming word
CIR_C = Color(0.7843, 0.0627, 0.1804)           # #C8102E  doing word
DOT_C = Color(0.5490, 0.5216, 0.4824)           # #8C857B  small word

# The free set's rule.  The house ink lifted to a charcoal: dark enough to be a
# baseline, plainly not one of the three series colours.
CHARCOAL_C = Color(0.3098, 0.2902, 0.2667)      # #4F4A44


# ------------------------------------------------------------- the ledger ----
# Every word the eleven Easy Readers and Tray 5's sentence cards use, in the
# three compartments the tin is sorted into.  `naming` / `doing` / `small` are
# the tin's own three, and WORD_CLASSES in writing-shelf-language.ts maps onto
# them: its `naming` and `doing` are these, and both its `describing` (sad, big)
# and its `little` (a, the, is, in) live in `small`, which is what the old list
# already did with bad, big, hot, mad, red and wet.
#
# build_15_writing_book.py reads CATEGORIES for the book's "words in this book"
# page, so the shape (key, label, symbol, words) is part of the interface.
CATEGORIES = [
    ("naming", "naming words", "triangle",
     ["ant", "bed", "bell", "blob", "box", "cat", "cats", "chick", "chip",
      "cot", "crab", "dad", "fish", "fox", "frog", "hen", "hill", "moth",
      "moths", "mud", "penguin", "pig", "pup", "sand", "star", "sun", "tub",
      "wig"]),
    ("doing", "doing words", "circle",
     ["cut", "digs", "fell", "fix", "jump", "mix", "naps", "ran", "sat", "sit",
      "spat", "splash"]),
    ("small", "small words", "dot",
     ["a", "and", "bad", "big", "bonk", "can", "hot", "in", "is", "it", "mad",
      "my", "off", "on", "red", "sad", "six", "that", "the", "this", "tip",
      "to", "top", "wet"]),
]

# AND IT IS DELIBERATELY NOT THE SAME LIST as WORD_CLASSES / the RAW decodable
# ledger / SENTENCE_BUILDER_GAPS in writing-shelf-language.ts, which still count
# sun, digs, hot and the eleven words below as words the tin does not hold.  The
# owner has ruled on that divergence and it is not a bug to tidy: a tile
# EXISTING in the printed tin is not the same fact as the word having been
# TAUGHT in sequence, and the ledger tracks the teaching.  An earlier session was
# right to refuse an instruction to sync the two.  Do not sync them.
CLASS_OF = {w: key for key, _l, _s, ws in CATEGORIES for w in ws}
SYMBOL_OF = {key: sym for key, _l, sym, _w in CATEGORIES}
LABEL_OF = {key: lbl for key, lbl, _s, _w in CATEGORIES}

N_BLANKS = 10                       # what the old sheet carried, unchanged

# The four sets, in tray order.  tier None is the free-composition set.
TINS = [(1, "pink"), (2, "blue"), (3, "green"), (None, "free composition")]


def tier_need(tier):
    """How many of each word ONE sentence of this tier can need at once.

    Derived from SENTENCE_BUILDER_CARDS' sentences, by GROUP tier — which is the
    tray the card sits in, and therefore the tin the child reaches for.  The one
    carried card (fox-box: pink words, blue tray) is counted with the blue tin
    for that reason, even though its frame is pink.
    """
    need = collections.Counter()
    for _slug, group, sentence, _art, _frame in SB.CARDS:
        if group != tier:
            continue
        for word, n in collections.Counter(sentence.split()).items():
            need[word] = max(need[word], n)
    return need


def tin_cards(tier):
    """(word, class) for one tin, in compartment order, duplicates adjacent."""
    if tier is None:
        used = set()
        for _slug, _g, sentence, _a, _f in SB.CARDS:
            used.update(sentence.split())
        out = [(w, key) for key, _l, _s, ws in CATEGORIES for w in ws
               if w not in used]
        return out + [(None, None)] * N_BLANKS
    need = tier_need(tier)
    out = []
    for key, _l, _s, ws in CATEGORIES:
        for w in ws:
            out.extend([(w, key)] * need.get(w, 0))
    return out


# ---------------------------------------------------------------- the font ----
def register_fonts():
    pdfmetrics.registerFont(TTFont(WORD_FONT, str(WORD_TTF)))
    pdfmetrics.registerFont(TTFont(ADULT_FONT, str(ADULT_TTF)))


@functools.lru_cache(maxsize=1)
def _ttf():
    """The word face's own outlines, opened once. Metrics come off THIS."""
    return ttLib.TTFont(str(WORD_TTF))


def word_size():
    """Solve the point size from the FONT's own x-height. Never a guess."""
    f = _ttf()
    upm = float(f["head"].unitsPerEm)
    sx = float(getattr(f["OS/2"], "sxHeight", 0) or 0)
    how = "OS/2.sxHeight"
    if sx <= 0:                     # pre-OS/2 v2 face: measure the 'x' outline
        g = f["glyf"]["x"]
        sx, how = float(g.yMax), "measured 'x' bbox"
    size = (X_HEIGHT / 25.4 * 72.0) / (sx / upm)
    return size, dict(upm=upm, sx=sx, how=how)


SIZE, SIZE_FROM = None, None        # filled by build(); a module-level cache


@functools.lru_cache(maxsize=None)
def glyph_box(word):
    """Ink box of a word at SIZE, in mm relative to (left of advance, baseline).

    Uses the real glyph outlines and side bearings, so a check on `my` sees the
    y descender and a check on `a` sees how far its ink really is from the card
    edge — neither of which the advance width knows.
    """
    f = _ttf()
    upm = float(f["head"].unitsPerEm)
    glyf, hmtx = f["glyf"], f["hmtx"]
    k = SIZE / upm / 72.0 * 25.4
    pen, left, right, top, bot = 0.0, None, None, -1e9, 1e9
    for ch in word:
        adv, lsb = hmtx[ch]
        g = glyf[ch]
        if g.numberOfContours:
            x0, x1 = pen + g.xMin, pen + g.xMax
            left = x0 if left is None else min(left, x0)
            right = x1 if right is None else max(right, x1)
            top, bot = max(top, g.yMax), min(bot, g.yMin)
        pen += adv
    if left is None:                # nothing but spaces; no such word here
        return 0.0, 0.0, 0.0, 0.0
    return left * k, right * k, top * k, bot * k


def advance(word):
    """The typographic advance. Kept for reporting; the CARD is not built on it."""
    return pdfmetrics.stringWidth(word, WORD_FONT, SIZE) / 72.0 * 25.4


def ink_w(word):
    left, right, _t, _b = glyph_box(word)
    return right - left


# G lives here as a module-level DEFAULT, and not as a bare measurement inside
# word_space(), so that a proof can draw these same cards at a CANDIDATE gap
# through the real drawing functions instead of keeping a second copy of them.
# None means "measure it off the font", which is the shipped sheet's G and the
# only value the build itself ever uses.  Nothing in the build passes g=.
# 7.0 mm was CHOSEN BY EYE against 4.0 / 5.0 / 5.909 (the `o` ink) / 8.5, drawn
# as real cards at true scale and printed — .build/gap_compare.py regenerates
# that comparison.  The `o`-width derivation below is not lost and is not to be
# "restored": it is the None branch, it still runs for the proof, and it lost.
WORD_SPACE = 7.0                        # mm — or None for the ink of one `o`


def word_space(g=None):
    """G — the word space. 7.0 mm on this sheet; see WORD_SPACE above.

    An explicit `g` overrides it, which is how the gap proof draws candidates
    through the real card functions.  g=None with WORD_SPACE=None falls back to
    the measured ink width of a lowercase `o`, the derivation 7.0 was picked
    over.
    """
    if g is not None:
        return g
    if WORD_SPACE is not None:
        return WORD_SPACE
    return ink_w("o")


def card_w(word, g=None):
    """MEASURED width: the word's INK plus G/2 of paper each side."""
    if word is None:
        return BLANK_W
    return round((ink_w(word) + word_space(g)) / W_STEP) * W_STEP


def ink_left(word, cw):
    """Where the word's first INK sits, in mm from the card's left edge."""
    return (cw - ink_w(word)) / 2.0


# ------------------------------------------------------------- the imposition ----
def strips(cards):
    """Butted strips, packed left to right until the next card will not fit."""
    out, row, w = [], [], 0.0
    for word, cls in cards:
        cw = card_w(word)
        # ...and a BLANK starts a fresh strip.  A blank card half way along a
        # strip of words reads as a card the build forgot to print on; a strip
        # of nothing but blanks reads as what it is, the room the tin has to grow.
        blank_break = row and (word is None) != (row[0][0] is None)
        if row and (blank_break or w + cw > STRIP_MAX_W + 1e-9):
            out.append(row)
            row, w = [], 0.0
        row.append((word, cls, cw))
        w += cw
    if row:
        out.append(row)
    return out


def pages(cards):
    """Strips to pages, BALANCED: a run never ends on a nearly empty page.

    Seven strips is all an A4 holds, but filling to seven and spilling the
    remainder leaves the free set's second page carrying one strip of blanks in
    the middle of an otherwise empty sheet.  The strips are spread evenly over
    the fewest pages that hold them instead — eight become 4 + 4 — and each page
    centres what it carries.
    """
    st = strips(cards)
    n = max(1, -(-len(st) // MAX_STRIPS))
    per = -(-len(st) // n)
    return [st[i:i + per] for i in range(0, len(st), per)]


def strip_tops(n):
    """Top edge y of each strip. The run HANGS FROM THE TOP of the band.

    Centring the strips in the band was the first cut of this and it was wrong:
    a tin of two or three strips came out as a band across the middle of the
    page with a hand's width of white above and below it, which reads as a
    rendering fault and not as a design.  The strips hang from the top margin,
    straight under the caption, and whatever white is left falls at the foot
    where a short page is supposed to leave it.
    """
    return [BAND_TOP - i * (CARD_H + GUTTER) for i in range(n)]


def flip(top):
    """Where a strip lands on the back face. SHORT-EDGE flip: (x, y) -> (x, H-y).

    A strip whose top edge is at `top` has its bottom at top - CARD_H; behind it,
    on the back page, that bottom edge is the strip's TOP.  x is untouched, which
    is the whole difference between a short-edge and a long-edge flip.
    """
    return PAGE_H - (top - CARD_H)


def layout():
    """Every page: (tier, name, [(strip_top, strip), ...], face), front then back."""
    out = []
    for tier, label in TINS:
        cards = tin_cards(tier)
        for page in pages(cards):
            front = list(zip(strip_tops(len(page)), page))
            back = [(flip(t), strip) for t, strip in front]
            out.append((tier, label, front, "front"))
            out.append((tier, label, back, "back"))
    return out


# ------------------------------------------------------------------ drawing ----
def mark_size(cls):
    if cls == "naming":
        return TRI_BASE, TRI_BASE * math.sqrt(3.0) / 2.0
    if cls == "doing":
        return CIR_D, CIR_D
    if cls == "small":
        return DOT_D, DOT_D
    return None


def mark_box(cls, x, y, cw):
    """(x0, y0, x1, y1) of the mark on the BACK face: dead centre, both axes."""
    wh = mark_size(cls)
    if wh is None:
        return None
    w, h = wh
    cx, cy = x + cw / 2.0, y + CARD_H / 2.0
    return (cx - w / 2.0, cy - h / 2.0, cx + w / 2.0, cy + h / 2.0)


def draw_mark(c, cls, x, y, cw):
    """The back of one card.  Drawn rotated 180 in the back page's own frame, so
    the triangle stands up once the sheet is turned on its short edge."""
    box = mark_box(cls, x, y, cw)
    if box is None:
        return
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    c.saveState()
    c.translate(cx * mm, cy * mm)
    c.rotate(180)
    if cls == "naming":
        w, h = mark_size(cls)
        p = c.beginPath()
        p.moveTo(-w / 2.0 * mm, -h / 2.0 * mm)
        p.lineTo(w / 2.0 * mm, -h / 2.0 * mm)
        p.lineTo(0.0, h / 2.0 * mm)
        p.close()
        c.setFillColor(TRI_C)
        c.drawPath(p, stroke=0, fill=1)
    else:
        c.setFillColor(CIR_C if cls == "doing" else DOT_C)
        c.circle(0.0, 0.0, (x1 - x0) / 2.0 * mm, stroke=0, fill=1)
    c.restoreState()


def draw_card(c, x, y, word, cls, cw, rule_c):
    """One card: the coloured baseline rule edge to edge, the word on it, the mark."""
    c.saveState()
    c.setFillColor(rule_c)
    c.rect(x * mm, (y + BASELINE - RULE_H) * mm, cw * mm, RULE_H * mm,
           stroke=0, fill=1)
    c.restoreState()
    if word is None:
        return
    c.saveState()
    c.setFillColor(INK)
    c.setFont(WORD_FONT, SIZE)
    # drawString takes the PEN origin; the ink starts one left side bearing
    # further right, so the bearing comes off the position before it is set.
    lsb = glyph_box(word)[0]
    c.drawString((x + ink_left(word, cw) - lsb) * mm, (y + BASELINE) * mm, word)
    c.restoreState()


def cut_geometry(page):
    """(vlines, hlines) for one page, in cutmarks.py's own form."""
    v, h = [], []
    for top, strip in page:
        bot = top - CARD_H
        h.append((top, 0.0, PAGE_W))
        h.append((bot, 0.0, PAGE_W))
        x = X0
        for _word, _cls, cw in strip:
            v.append((x, bot - TICK_OVER, top + TICK_OVER))
            x += cw
        v.append((x, bot - TICK_OVER, top + TICK_OVER))
    return v, h


def page_label(tier, label, page):
    keys, blanks = [], False
    for _top, strip in page:
        for word, cls, _cw in strip:
            if word is None:
                blanks = True
            elif cls not in keys:
                keys.append(cls)
    tin = "%s tin" % label if tier else label
    parts = [LABEL_OF[k] for k in keys] + (["blank cards"] if blanks else [])
    return "word cards · %s · %s" % (tin, " · ".join(parts))


# ------------------------------------------------------------------- checks ----
def probe_x_height():
    """RASTERISE 'x' at SIZE and measure the ink. Verifies the size, not the sum.

    Returns (measured mm, predicted mm from the outline) or None if there is no
    rasteriser on this machine — build() then says so rather than going quiet.
    """
    if not shutil.which("pdftoppm"):
        return None
    from PIL import Image
    BUILD_DIR.mkdir(exist_ok=True)
    pdf = BUILD_DIR / "xheight-probe.pdf"
    c = canvas.Canvas(str(pdf), pagesize=(40 * mm, 40 * mm))
    c.setFillColor(Color(0, 0, 0))
    c.setFont(WORD_FONT, SIZE)
    c.drawString(10 * mm, 10 * mm, "x")
    c.showPage()
    c.save()
    dpi = 1200
    subprocess.run(["pdftoppm", "-r", str(dpi), "-gray", "-png",
                    str(pdf), str(BUILD_DIR / "xheight-probe")],
                   check=True, capture_output=True)
    png = BUILD_DIR / "xheight-probe-1.png"
    im = Image.open(png).convert("L")
    box = im.point(lambda p: 255 if p < 128 else 0).getbbox()
    measured = (box[3] - box[1]) / float(dpi) * 25.4
    _l, _r, top, bot = glyph_box("x")
    return measured, top - bot


def check(plan):
    bad, notes = [], {}
    # ---- the size, measured off a rasterised glyph and not off the arithmetic
    probe = probe_x_height()
    if probe is None:
        notes["probe"] = None
    else:
        measured, predicted = probe
        notes["probe"] = (measured, predicted)
        if abs(measured - predicted) > 0.05:
            bad.append("the rendered 'x' measures %.3f mm where its outline "
                       "predicts %.3f mm — the point size is not rendering true"
                       % (measured, predicted))
    nominal = SIZE / 72.0 * 25.4 * SIZE_FROM["sx"] / SIZE_FROM["upm"]
    if abs(nominal - X_HEIGHT) > 0.001:
        bad.append("%.4f pt gives a %.4f mm x-height, not %.2f"
                   % (SIZE, nominal, X_HEIGHT))
    notes["nominal"] = nominal

    # ---- every card: the INK is padded G/2 a side and the mark clears it
    widths, gaps = {}, []
    for tier, _label, page, face in plan:
        if face != "front":
            continue
        rule_c = SB.TIER_C[tier] if tier else CHARCOAL_C
        if tier and rule_c is not SB.TIER_C[tier]:
            bad.append("tier %s is not drawn in sheet 14's TIER_C" % tier)
        for top, strip in page:
            y = top - CARD_H
            x = X0
            prev = None
            for word, cls, cw in strip:
                if word is not None:
                    G = word_space()
                    pad = ink_left(word, cw)          # paper to the first ink
                    widths[word] = cw
                    if abs(pad - G / 2.0) > W_STEP / 2.0 + 1e-9:
                        bad.append("%r has %.3f mm of paper to its ink, not the "
                                   "%.3f mm G/2 asks for" % (word, pad, G / 2.0))
                    if prev is not None:
                        gaps.append((prev + pad, prev, pad))
                    prev = pad
                    ilo, ihi, itop, ibot = glyph_box(word)
                    ink_top = y + BASELINE + itop
                    ink_bot = y + BASELINE + ibot
                    if ink_bot < y + 1e-9:
                        bad.append("%r descends %.2f mm below the card"
                                   % (word, y - ink_bot))
                    if ink_top > y + CARD_H - 1e-9:
                        bad.append("%r rises %.2f mm above the card"
                                   % (word, ink_top - y - CARD_H))
                    mw = mark_size(cls)
                    if mw is not None and (cw - mw[0]) / 2.0 < MARK_CLEAR - 1e-6:
                        bad.append("the %s mark is %.2f mm wide on a %.2f mm "
                                   "card (%r): under %.1f mm of paper each side"
                                   % (cls, mw[0], cw, word, MARK_CLEAR))
                else:
                    prev = None
                x += cw
            if x > X0 + STRIP_MAX_W + 1e-6:
                bad.append("a strip is %.2f mm wide, over the %.1f mm measure"
                           % (x - X0, STRIP_MAX_W))
        # ---- the cut geometry
        v, h = cut_geometry(page)
        for xx, y0, y1 in v:
            if xx < CM.SAFE or xx > PAGE_W - CM.SAFE:
                bad.append("a cut tick at x %.1f breaks the safe margin" % xx)
            if min(y0, y1) < CM.SAFE or max(y0, y1) > PAGE_H - CM.SAFE:
                bad.append("a cut tick reaches y %.1f-%.1f, outside the margin"
                           % (y0, y1))
        for yy, _a, _b in h:
            if yy < CM.SAFE or yy > PAGE_H - CM.SAFE:
                bad.append("a cut line at y %.1f breaks the safe margin" % yy)
        for ypos, what in ((LABEL_Y, "label"), (FOOT_Y, "footer")):
            if any(abs(ypos - yy) < 3.0 for yy, _a, _b in h):
                bad.append("the %s sits on a cut line" % what)
            for _xx, y0, y1 in v:
                if min(y0, y1) - 2.0 <= ypos <= max(y0, y1) + 2.0:
                    bad.append("the %s runs into a cut tick" % what)
                    break
    # ---- SIMULATE THE FLIP.  Every front card must be backed by exactly one
    # card of identical width in the mirrored position, and its mark centred.
    def rects(page):
        out = []
        for top, strip in page:
            x = X0
            for word, cls, cw in strip:
                out.append((round(x, 4), round(x + cw, 4),
                            round(top - CARD_H, 4), round(top, 4), word, cls))
                x += cw
        return out

    n_front = n_back = n_marked = 0
    worst_off = 0.0
    for i in range(0, len(plan), 2):
        (_t, _l, fpage, fface), (_t2, _l2, bpage, bface) = plan[i], plan[i + 1]
        if (fface, bface) != ("front", "back"):
            bad.append("page %d is not a front/back pair" % (i + 1))
            continue
        want = {(x0, x1, round(PAGE_H - y1, 4), round(PAGE_H - y0, 4), w, c)
                for x0, x1, y0, y1, w, c in rects(fpage)}
        got = set(rects(bpage))
        n_front += len(want)
        n_back += len(got)
        if want != got:
            bad.append("pp %d/%d: the back does not mirror the front — %d card(s) "
                       "land in the wrong place or at the wrong width"
                       % (i + 1, i + 2, len(want ^ got) // 2 or len(want ^ got)))
        for x0, x1, y0, y1, word, cls in got:
            box = mark_box(cls, x0, y0, x1 - x0)
            if box is None:
                continue
            n_marked += 1
            off = max(abs((box[0] + box[2]) / 2.0 - (x0 + x1) / 2.0),
                      abs((box[1] + box[3]) / 2.0 - (y0 + y1) / 2.0))
            worst_off = max(worst_off, off)
            if off > 0.2:
                bad.append("the %s mark on %r is %.3f mm off centre"
                           % (cls, word, off))
    notes["duplex"] = (n_front, n_back, n_marked, worst_off)

    if gaps:
        lo, hi = min(g[0] for g in gaps), max(g[0] for g in gaps)
        notes["gap"] = (lo, hi)
        notes["pairs"] = len(gaps)
        if abs(lo - word_space()) > 0.05 or abs(hi - word_space()) > 0.05:
            bad.append("butted ink sits %.3f-%.3f mm apart; G is %.3f"
                       % (lo, hi, word_space()))
    notes["widths"] = widths
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return notes


def check_source():
    """Sheet 14's guard, called through, plus the one this sheet adds.

    SB.check_source() proves sheet 14's table still matches
    SENTENCE_BUILDER_CARDS in writing-shelf-language.ts.  This sheet then proves
    that every word those sentences use has a compartment here — so a new card
    can never ship with a word the tin does not hold.
    """
    n = SB.check_source()
    missing = sorted({w for _s, _g, sentence, _a, _f in SB.CARDS
                      for w in sentence.split() if w not in CLASS_OF})
    if missing:
        raise SystemExit(
            "SPEC FAILURE: %d sentence word(s) have no compartment in this "
            "tin: %s\n  add them to CATEGORIES, classed as WORD_CLASSES in "
            "writing-shelf-language.ts classes them." % (len(missing), missing))
    return n


# -------------------------------------------------------------------- proof ----
PROOFS = {1: "tin-pink.png", 2: "tin-blue.png", 3: "tin-green.png",
          None: "tin-free.png"}


def proof(pdf, plan):
    """Rasterise the FIRST FRONT of each tin at ~130 dpi, plus one back sheet."""
    if not shutil.which("pdftoppm"):
        return None

    def shot(i, stem):
        subprocess.run(["pdftoppm", "-r", "130", "-png", "-f", str(i),
                        "-l", str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        return Path(str(stem) + ".png")

    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made, seen, back = [], set(), None
    for i, (tier, _label, _page, face) in enumerate(plan, start=1):
        if face == "back":
            if back is None:
                back = i
            continue
        if tier in seen:
            continue
        seen.add(tier)
        made.append(shot(i, PROOF_DIR / PROOFS[tier][:-4]))
    if back:
        made.append(shot(back, PROOF_DIR / "tin-back"))
    return made


# -------------------------------------------------------------------- build ----
def build():
    global SIZE, SIZE_FROM
    register_fonts()
    SIZE, SIZE_FROM = word_size()
    n_src = check_source()
    plan = layout()
    notes = check(plan)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    marks = lines = 0
    for tier, label, page, face in plan:
        rule_c = SB.TIER_C[tier] if tier else CHARCOAL_C
        for top, strip in page:
            x, y = X0, top - CARD_H
            for word, cls, cw in strip:
                if face == "front":
                    draw_card(c, x, y, word, cls, cw, rule_c)
                elif word is not None:
                    draw_mark(c, cls, x, y, cw)
                x += cw
        # Cut guides, caption and footer live on the FRONT only.  The cut is made
        # from the front, and a second set of hairlines on the back would print a
        # grey line a misregistration's width inside the finished card.
        if face == "front":
            v, h = cut_geometry(page)
            st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
            marks += st["marks"]
            lines += st["lines"]
            c.saveState()
            c.setFillColor(LABEL_C)
            c.setFont(ADULT_FONT, FOOT_SIZE)
            c.drawString(TEXT_X * mm, LABEL_Y * mm, page_label(tier, label, page))
            c.restoreState()
            n = sum(len(s) for _t, s in page)
            CM.footer(c, TEXT_X, FOOT_Y,
                      CM.cards_line(n, "card") + " · " + PRINT_NOTE,
                      ADULT_FONT, FOOT_SIZE)
        c.showPage()
    c.save()
    made = proof(out, plan)

    # ------------------------------------------------------------- report ----
    print("word-card tins -> %s" % OUT_DIR)
    n_front, n_back, n_marked, worst = notes["duplex"]
    print("  %-30s %d pp = %d front + %d back · %s · %d cut lines, %d "
          "triangles · %.0f KB"
          % (NAME, len(plan), len(plan) // 2, len(plan) // 2, PRINT_NOTE,
             lines, marks, out.stat().st_size / 1024.0))
    print("  flip simulated: %d front cards, %d backs, each mirrored to (x, H-y) "
          "at its own width · %d marks centred to %.3f mm"
          % (n_front, n_back, n_marked, worst))
    print("  source of truth %s: %d sentence cards, matched"
          % (SB.SOURCE_TS.name, n_src))
    print("  word %.4f pt %s from %s (%g/%g em) · x-height %.4f mm"
          % (SIZE, WORD_FONT, SIZE_FROM["how"], SIZE_FROM["sx"],
             SIZE_FROM["upm"], notes["nominal"]))
    if notes["probe"] is None:
        print("  NO RASTERISER (pdftoppm): the x-height was NOT measured off a "
              "rendered glyph and no proof PNG was written")
    else:
        measured, predicted = notes["probe"]
        print("  rendered 'x' measures %.3f mm at 1200 dpi (outline predicts "
              "%.3f: %.2f mm of drawn overshoot each terminal)"
              % (measured, predicted, (predicted - X_HEIGHT) / 2.0))
    lo, hi = notes["gap"]
    print("  word space G = %.3f mm = %.3f em (chosen by eye over the 'o' ink, "
          "%.3f); butted INK-TO-INK %.3f-%.3f mm over %d pairs"
          % (word_space(), word_space() / (SIZE / 72.0 * 25.4), ink_w("o"),
             lo, hi, notes["pairs"]))
    ws = notes["widths"]
    thin = min(ws.items(), key=lambda kv: kv[1])
    wide = max(ws.items(), key=lambda kv: kv[1])
    print("  narrowest card %r %.1f mm · widest %r %.1f mm · every card %.0f mm "
          "tall, baseline %.0f mm up, %.1f mm rule"
          % (thin[0], thin[1], wide[0], wide[1], CARD_H, BASELINE, RULE_H))
    for tier, label in TINS:
        cards = tin_cards(tier)
        st = strips(cards)
        per = "/".join(str(len(s)) for s in st)
        n_sheets = len(pages(cards))
        print("  %-18s %2d cards · %d strip%s (%s a strip) · %d sheet%s = %d pp"
              % (label, len(cards), len(st), "" if len(st) == 1 else "s", per,
                 n_sheets, "" if n_sheets == 1 else "s", n_sheets * 2))
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(p.name for p in made)))


if __name__ == "__main__":
    build()
