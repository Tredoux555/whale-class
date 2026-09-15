#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 24, THE SENTENCE STRIPS

The teacher worked Tray 5's sentence building in class and found the step before
the one the tray offers.  The child takes down the tin, he is asked to build `The
cat sat.`, and he has nothing to build it AGAINST: the sentence exists only as a
thing that was said to him.  He needs a WHOLE SENTENCE, printed, one piece, that
he can lay on the mat and match his cards to.

That is all this sheet is, and the whole of its design is one sentence:

    A STRIP IS THE ROW OF WORD CARDS FUSED INTO ONE PIECE.

Not a caption of the sentence, not a label, not a smaller or a larger setting of
it.  The same face, the same size, the same baseline, the same tier rule, and —
this is the part that does the teaching — the same WIDTH, because the strip is
28.0 mm tall (sheet 12's CARD_H) and exactly as long as the sum of sheet 12's
measured card widths for that sentence's words.  `The cat sat.` is 76.4 mm of
card and it is a 76.4 mm strip.  The child lays the strip down, butts his cards
up underneath it word under word, and when the last card lands the row ENDS where
the strip ends.  The control of error is LENGTH, and he reads it without being
told: a card too many and his row overhangs, a card missing and it falls short,
a wrong word and one column stops lining up.  Nothing on this sheet says any of
that; the measure says it.

WHERE EACH WORD SITS IS NOT A DECISION THIS SHEET MAKES.  The words are set at
the x where that word's CARD INK falls when the cards are butted from the strip's
left edge — build_16.card_run(), which sheets 16, 18 and 19 already print their
guide words off, imported and not re-derived.  A card is its word's ink plus G
with G/2 of clear paper each side, so the first word's ink starts G/2 in from the
left edge and every next word's ink starts G/2 past the previous card's right
edge.  Ink to ink across a word boundary is therefore G — 7.0 mm — on the strip
exactly as it is between two butted cards, which is the one number sheet 12 was
rebuilt around.

THE WORDS ARE BLACK, sheet 12's own INK, and this is the difference between a
STRIP and a MAT.  Sheets 18/19's guide words are the tin's charcoal because they
are a ghost the child COVERS with his cards; they are there to be hidden.  The
strip is never covered — it stays above his row for the whole work and it is the
sentence he is reading.  A sentence he reads is set in the ink a sentence is set
in.  (Owner, 2026-09-15, and not to be re-opened.)

THE TIER COLOUR IS THE BASELINE RULE, sheet 12's rule and sheet 12's reason: 0.5
mm, the FULL width of the piece, drawn BEFORE the words so the descenders cross
over it as they do on ruled paper.  On the strip it does a fourth thing the card
cannot do on its own — it is the same continuous coloured line the child's butted
cards make underneath, so the two lines run parallel at the same length and he can
see the join he is aiming at.  Colours are sheet 14's TIER_C, imported.

WHAT IS NOT ON THE STRIP, all of it decided and closed:
  · no frame and no tint — the strip is a piece of paper the size of the row.
  · no grammar symbols.  The symbol is the CARD's, it is where the Tray 8 token
    will be laid, and a second copy of it floating above the child's own card
    would make the strip a thing to copy instead of a thing to match.
  · no word-boundary ticks, no numbers, no dots under the words.  The printed
    SPACES are the boundaries; that is what G was chosen for and marking them
    again would be the sheet doubting its own measure.
  · no capital or full stop of this sheet's own devising.  Every sentence goes
    through build_14.display_words(), the set's one transform, so sheet 13's
    `cat on a mat` prints `Cat on a mat.` and asks the tin for the very cards the
    tin holds.  NO SENTENCE IS TYPED IN THIS FILE.

THE SCOPE IS THE TIN'S SCOPE — build_12.sentences(), the one place either deck is
read, which is sheet 13's fourteen story starters and sheet 14's eighteen
sentence cards, thirty-two in all: 16 pink, 6 blue, 10 green.  The strips run in
tray order, pink then blue then green.  If a sentence is in the tin it has a
strip, and check() proves every printed word of every strip is a card the tin
actually prints.

THE SHEET FILLS, AND IT FILLS ACROSS AS WELL AS DOWN.  The first cut of this
sheet put ONE strip on a 28 mm row and threw away the right half of every page:
the pink strips are 76 to 95 mm and the measure is 190, so two of them fit side
by side and one of them was printing two sheets where one would do.  A row now
takes strips LEFT TO RIGHT, butted with zero gutter, until the next one will not
fit, and then a new row starts — sheet 12's own packing, applied to strips
instead of cards.  It bought a page on the pink tier (two down to one) and two
on the whole run (four down to two).

THE ORDER IS THE ORDER AND IS NEVER SHUFFLED TO PACK TIGHTER.  A greedy
first-fit-DECREASING would squeeze another row or two out of the green tier and
would hand the teacher a sheet whose strips come in no order she can follow.  The
strips run in tray order, pink then blue then green, and within a tier in deck
order, and the packing takes them as they come.  Where one will not fit the row
is left SHORT — that white is the answer, not a gap to plug.

Rows stack from sheet 12's BAND_TOP with zero gutter, nine to a page, and a page
is FILLED before the next starts — the owner's standing rule, "fit as much as you
can on a page", and never a balanced last page.  A page may therefore end in one
tier and begin in another; that is a JUDGEMENT CALL and it is not sheet 12's.
Sheet 12 gives a tin a page of its own because the teacher prints each tin onto
its own colour of card stock and a mixed sheet must be cut in half and run twice.
A strip is not sorted by its stock — it carries its tier as a 0.5 mm rule along
its whole length, in the tier's own colour, which is the widest and plainest
colour signal anywhere in the tray — so the reason that splits sheet 12's pages
does not reach here, and the fill rule wins.  (As it falls out today no row
mixes two tiers at all: each tier's count happens to close a row.)

CUTTING IS cutmarks.py's CUT ONCE, with the one departure sheet 12 already makes.
The rows butt, so row N's bottom edge IS row N+1's top edge and ONE full-width
hairline is drawn on it: one stroke of the blade frees both and every piece comes
off a true 28.0 mm.  The LEFT edge is shared by every row on the page — they all
start at X0 — so it is a full-height hairline edge to edge with a triangle at
each end, the standard in full.  No other vertical can be: rows break at
different x, so a full-height line would saw through the strips above and below.
Every vertical inside the block is sheet 12's TICK — the same grey hairline,
2.0 mm down from that row's top edge and 2.0 mm up from its bottom.  A tick sits
on every strip's right edge, which inside a row is the SHARED edge of two strips,
so one stroke frees both, and at the row's end is the trim.

Run:   python3 scripts/curriculum/writing-shelf/build_24_sentence_strips.py
       [--example]          (pink only, to .build/proof, not to public/)
Needs: reportlab, pikepdf, numpy, Pillow, fontTools; pdftoppm and pdftotext.
"""

import re
import shutil
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

import build_12_word_card_tin as W12          # noqa: E402  the card measure, the tin
import build_14_sentence_builder_cards as SB  # noqa: E402  the sentences, TIER_C
import build_16_sentence_mats as M16          # noqa: E402  the butted-card run
import build_20_sentence_frames as F20        # noqa: E402  page_marks(), rgb()
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
BUILD_DIR = HERE / ".build"
PROOF_DIR = BUILD_DIR / "proof"
SCRATCH = BUILD_DIR / "scratch"

NAME = "24-sentence-strips.pdf"
EXAMPLE_NAME = "24-example.pdf"
PDF_TITLE = "Dark Phonics · Writing Shelf · sentence strips"
PDF_AUTHOR = W12.PDF_AUTHOR             # the set's, never re-typed
PRINT_NOTE = (
    "One strip is one whole sentence, and it is the row of word cards fused into "
    "one piece: 28 mm tall and exactly as long as that sentence's cards butted "
    "up. The child lays the strip on the mat and builds it underneath out of the "
    "tin, word under word. Print on card; the tier colour is the baseline rule."
)

# ------------------------------------------------------- sheet 12's measure ----
# Every one of these is imported and not one is re-typed: a strip that did not
# share the card's height, baseline, rule, margin or band would not be the row
# of cards, which is the entire claim of the sheet.
PAGE_W, PAGE_H = W12.PAGE_W, W12.PAGE_H         # 210 x 297, A4 portrait
X0 = W12.X0                                     # 10.0 — every strip starts here
MEASURE = W12.STRIP_MAX_W                       # 190.0 — the longest a strip may be
STRIP_H = W12.CARD_H                            # 28.0
BASELINE = W12.BASELINE                         # 9.0 mm up from the strip's foot
RULE_H = W12.RULE_H                             # 0.5 mm — the tier rule
GUTTER = W12.GUTTER                             # 0.0 — the strips BUTT
TICK_IN = W12.TICK_IN                           # 2.0 mm — the right-end tick
BAND_TOP = W12.BAND_TOP                         # 285.0 — the top strip's top edge
MAX_ROWS = W12.MAX_STRIPS                       # 9 rows a page, sheet 12's
INK = W12.INK                                   # #141110 — the cards' own black

ADULT_FONT = W12.ADULT_FONT
FOOT_SIZE = W12.FOOT_SIZE                       # 5.5
FOOT_C = W12.LABEL_C                            # #5F594F, the set's adult grey
FOOT_Y = W12.LABEL_Y                            # 20.0 — below the last cut
TEXT_X = W12.TEXT_X                             # 15.0
SAFE = CM.SAFE                                  # 5.5 mm — the printer-safe margin

# ------------------------------------------------------------- tolerances ----
INK_TOL = 0.02          # mm — printed word vs where its card's ink lands
GEOM_TOL = 0.02         # mm — a rule read back off the content stream
CLEAR_DPI = 300         # the raster the clearance is measured on
CLEAR_MIN = 0.5         # mm — the least WORD-ink-to-cut gap allowed
PROOF_DPI = 150


# ------------------------------------------------------------- the strips ----
class Strip:
    """One sentence, as the piece of paper it is printed on."""

    __slots__ = ("tier", "plain", "sentence", "words", "run", "w")

    def __init__(self, tier, plain_sentence):
        self.tier = tier
        self.plain = plain_sentence
        self.words = SB.display_words(plain_sentence)
        self.sentence = " ".join(self.words)
        # THE PLACEMENT, IMPORTED.  card_run lays the cards butted from x and
        # hands back (word, card_x0, card_x1, ink_x0, ink_x1); sheets 16, 18 and
        # 19 print their guide words off this very call.  Run it from 0.0 so the
        # numbers are strip-relative and the page offset is added once, at draw.
        self.run = M16.card_run(self.sentence, 0.0)
        self.w = round(self.run[-1][2], 6) if self.run else 0.0

    def card_ws(self):
        return [W12.card_w(w) for w in self.words]


def strips():
    """Every Tray 5 sentence as a strip, in tray order: pink, blue, green.

    THE SCOPE IS THE TIN'S.  W12.sentences() is the one place either deck is
    read — sheet 13's fourteen story starters then sheet 14's eighteen sentence
    cards — and the sort is STABLE, so within a tier the story starters keep
    their deck order and sheet 14's follow.  Nothing is typed here.
    """
    return sorted((Strip(tier, sent) for tier, sent in W12.sentences()),
                  key=lambda s: s.tier)


def rows(all_=None):
    """Strips PACKED ACROSS, left to right, until the next will not fit.

    Sheet 12's own packing, applied to strips instead of cards, and with sheet
    12's rule about order: the list is taken AS IT COMES, tray order then deck
    order, and is never sorted to pack tighter.  A row that cannot take the next
    strip is left short.  Returns [[(x_from_X0, strip), ...], ...].
    """
    all_ = strips() if all_ is None else all_
    out, row, x = [], [], 0.0
    for s in all_:
        if row and x + s.w > MEASURE + 1e-9:
            out.append(row)
            row, x = [], 0.0
        row.append((x, s))
        x += s.w
    if row:
        out.append(row)
    return out


def pages(all_=None):
    """FILLED pages of MAX_ROWS rows, never balanced.  The standing rule."""
    rs = rows(all_)
    return [rs[i:i + MAX_ROWS] for i in range(0, len(rs), MAX_ROWS)]


def row_tops(n):
    """Top edge y of each row on a page.  The block HANGS FROM THE TOP, as 12."""
    return [BAND_TOP - i * (STRIP_H + GUTTER) for i in range(n)]


def layout(all_=None):
    """Every page as [(top_y, row), ...], a row being [(x_from_X0, strip), ...]."""
    return [list(zip(row_tops(len(pg)), pg)) for pg in pages(all_)]


def page_strips(page):
    """Every strip on a page, with its top edge and its left x, in reading order."""
    return [(top, X0 + dx, s) for top, row in page for dx, s in row]


# ------------------------------------------------------------ the caption ----
def captions(plan):
    """One adult line a page, on the foot, below the last cut.  House voice."""
    total = len(plan)
    out = []
    for i, page in enumerate(plan, start=1):
        names = []
        for _top, _x, s in page_strips(page):
            nm = SB.TIER_NAME[s.tier]
            if nm not in names:
                names.append(nm)
        part = ["sentence strips", " + ".join(names)]
        if total > 1:
            part.append("sheet %d of %d" % (i, total))
        part.append("one strip is one whole sentence — build it underneath out "
                    "of the tin, word under word")
        part.append("cut every grey line; the ticks are each strip's right end")
        out.append(" · ".join(part))
    return out


def caption_ink(text):
    """The caption's REAL ink above and below its baseline, in mm.

    Sheet 18's measurement, for sheet 18's reason: getAscentDescent hands back
    the FACE's nominal line, not the room these particular glyphs use, and the
    window between the printer-safe margin and the last cut is small enough that
    the difference decides whether the line fits.
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


def caption_w(text):
    return pdfmetrics.stringWidth(text, ADULT_FONT, FOOT_SIZE) / 72.0 * 25.4


# ----------------------------------------------------------- cut geometry ----
def cut_geometry(page):
    """(vlines, hlines) for one page.

    hlines: one full-width hairline on every ROW boundary, the top edge of the
    first and the bottom edge of the last included — row N's bottom IS row N+1's
    top, so ONE line frees both and every piece comes off a true 28.0 mm.

    vlines: the LEFT edge full height, edge to edge, because every row starts at
    X0 and one stroke trims them all.  Every other vertical is sheet 12's TICK,
    TICK_IN inside its own row's top and bottom, because the rows break at
    different x and a full-height line would run through the strips above and
    below.  A tick sits on EVERY strip's right edge: inside a row that edge is
    SHARED by two strips and one stroke frees both, and at the end of a row it is
    the trim.
    """
    tops = [t for t, _r in page]
    h = [(tops[0], 0.0, PAGE_W)]
    v = [(X0, 0.0, PAGE_H)]
    for top, row in page:
        bot = top - STRIP_H
        h.append((bot, 0.0, PAGE_W))
        for dx, s in row:
            xr = X0 + dx + s.w
            v.append((xr, top - TICK_IN, top))
            v.append((xr, bot, bot + TICK_IN))
    return v, h


def cut_ys(page):
    return [y for y, _x0, _x1 in cut_geometry(page)[1]]


# ------------------------------------------------------------------ check ----
def check(plan, all_):
    """Every claim the sheet makes, before a single mark is put on paper."""
    bad = []
    caps = captions(plan)
    seen = [s for page in plan for _t, _x, s in page_strips(page)]

    # ---- THE STRIP IS THE ROW OF CARDS.  Its width is the SUM of sheet 12's
    # card widths, re-summed here from card_w() rather than read off card_run,
    # so the two arithmetics have to agree or the build stops.
    for s in seen:
        want = sum(s.card_ws())
        if abs(s.w - want) > 1e-9:
            bad.append("%r is a %.6f mm strip over %.6f mm of card"
                       % (s.sentence, s.w, want))
        # ...and every card lands butted, in order, from the strip's left edge.
        x = 0.0
        for (word, c0, c1, i0, _i1), cw in zip(s.run, s.card_ws()):
            if abs(c0 - x) > 1e-9 or abs(c1 - (x + cw)) > 1e-9:
                bad.append("%r: card %r is not butted at %.4f" % (s.sentence, word, x))
            if abs(i0 - (c0 + W12.ink_left(word, cw))) > 1e-9:
                bad.append("%r: %r's ink is not G/2 inside its card" % (s.sentence, word))
            x += cw
        if s.w > MEASURE + 1e-9:
            bad.append("%r is %.1f mm of card and the measure is %.1f"
                       % (s.sentence, s.w, MEASURE))

    # ---- EVERY WORD IS A CARD THE TIN PRINTS, in the form the strip prints it.
    for s in seen:
        tin = {w for w, _cls in W12.tin_cards(s.tier) if w is not None}
        for word in s.words:
            if SB.plain(word) not in W12.CLASS_OF:
                bad.append("%r sets %r and the tin has no class for %r"
                           % (s.sentence, word, SB.plain(word)))
            elif word not in tin:
                bad.append("%r sets %r and the %s tin prints no such card"
                           % (s.sentence, word, SB.TIER_NAME[s.tier]))

    # ---- THE PACKING.  No strip may overlap the measure or its neighbour.
    for i, page in enumerate(plan, start=1):
        for j, (top, row) in enumerate(page, start=1):
            x = 0.0
            for dx, s in row:
                if abs(dx - x) > 1e-9:
                    bad.append("page %d row %d: %r is not butted against its "
                               "neighbour (%.6f, not %.6f)"
                               % (i, j, s.sentence, dx, x))
                x += s.w
            if x > MEASURE + 1e-9:
                bad.append("page %d row %d runs %.3f mm over the %.1f mm measure"
                           % (i, j, x, MEASURE))
            spans = [(X0 + dx, X0 + dx + s.w) for dx, s in row]
            for (_a0, a1), (b0, _b1) in zip(spans, spans[1:]):
                if b0 < a1 - 1e-9:
                    bad.append("page %d row %d: two strips overlap at %.3f" % (i, j, b0))
    # ...and the packing is FIRST FIT IN ORDER: a row is left short only when the
    # next strip in the run genuinely will not fit, never to tidy the page.
    flat = [s for page in plan for _t, _x, s in page_strips(page)]
    k = 0
    for page in plan:
        for _top, row in page:
            used = sum(s.w for _dx, s in row)
            nxt = flat[k + len(row)] if k + len(row) < len(flat) else None
            if nxt is not None and used + nxt.w <= MEASURE + 1e-9:
                bad.append("%r would still fit the row above it" % nxt.sentence)
            k += len(row)

    # ---- THE PAGE ARITHMETIC
    n = len(flat)
    if n != len(all_) or [s.sentence for s in flat] != [s.sentence for s in all_]:
        bad.append("%d strips laid out, %d in the run" % (n, len(all_)))
    if [s.tier for s in seen] != sorted(s.tier for s in seen):
        bad.append("the strips are not in tray order, pink then blue then green")
    for i, page in enumerate(plan, start=1):
        if len(page) > MAX_ROWS:
            bad.append("page %d carries %d rows, over the %d" % (i, len(page), MAX_ROWS))
        if i < len(plan) and len(page) != MAX_ROWS:
            bad.append("page %d is not FILLED: %d rows, not %d"
                       % (i, len(page), MAX_ROWS))
        tops = [t for t, _r in page]
        for a, b in zip(tops, tops[1:]):
            if abs((a - b) - STRIP_H) > 1e-9:
                bad.append("page %d: the rows do not butt" % i)
        floor = tops[-1] - STRIP_H
        if floor < FOOT_Y + 1.0:
            bad.append("page %d's last cut is at %.2f mm, on top of the caption"
                       % (i, floor))

    # ---- THE CAPTION FITS THE MEASURE AND THE WINDOW UNDER THE LAST CUT
    down, up = 0.0, 0.0
    for i, (page, cap) in enumerate(zip(plan, caps), start=1):
        cw = caption_w(cap)
        if cw > MEASURE - (TEXT_X - X0) + 1e-9:
            bad.append("page %d's caption is %.1f mm wide, over the %.1f mm left "
                       "of the measure" % (i, cw, MEASURE - (TEXT_X - X0)))
        d, u = caption_ink(cap)
        down, up = min(down, d), max(up, u)
        if FOOT_Y + d < SAFE:
            bad.append("page %d's caption drops below the %.1f mm safe margin" % (i, SAFE))
        if FOOT_Y + u > min(cut_ys(page)) - 0.5:
            bad.append("page %d's caption touches the last cut" % i)

    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return dict(n=n, rows=sum(len(pg) for pg in plan),
                caption_ink=(FOOT_Y + down, FOOT_Y + up),
                caption_w=max(caption_w(c) for c in caps))


# ---------------------------------------------------------------- drawing ----
def draw_strip(c, top, x0, s, rules=True):
    """One strip: the tier rule edge to edge, then the words standing on it.

    THE RULE FIRST AND THE WORDS AFTER, sheet 12's order, so the descenders cross
    OVER the rule exactly as they do on the card and on ruled paper.
    """
    y = top - STRIP_H
    if rules:
        c.saveState()
        c.setFillColor(SB.TIER_C[s.tier])
        c.rect(x0 * mm, (y + BASELINE - RULE_H) * mm, s.w * mm, RULE_H * mm,
               stroke=0, fill=1)
        c.restoreState()
    c.saveState()
    c.setFillColor(INK)
    c.setFont(W12.WORD_FONT, W12.SIZE)
    for word, _c0, _c1, i0, _i1 in s.run:
        # drawString takes the PEN origin and the ink starts one left side
        # bearing further right, so the bearing comes off the card's ink x.
        c.drawString((x0 + i0 - W12.glyph_box(word)[0]) * mm, (y + BASELINE) * mm,
                     word)
    c.restoreState()


def draw_page(c, page, caption, cuts=True, rules=True):
    for top, x0, s in page_strips(page):
        draw_strip(c, top, x0, s, rules=rules)
    st = CM.cut_lines(c, *cut_geometry(page), PAGE_W, PAGE_H) if cuts else None
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(TEXT_X * mm, FOOT_Y * mm, caption)
    c.restoreState()
    return st


def write_pdf(path, plan, caps, cuts=True, rules=True):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    tot = dict(lines=0, marks=0)
    for page, cap in zip(plan, caps):
        st = draw_page(c, page, cap, cuts=cuts, rules=rules)
        if st:
            tot["lines"] += st["lines"]
            tot["marks"] += st["marks"]
        c.showPage()
    c.save()
    return tot


# ----------------------------------------------------------------- verify ----
def verify(pdf, clean, plan, caps):
    """Read the FINISHED PDF back and prove every claim this file makes."""
    bad = []
    want_pt = (PAGE_W / 25.4 * 72.0, PAGE_H / 25.4 * 72.0)
    worst_rule, worst_ink = (0.0, None), (0.0, None)
    rgb = F20.rgb

    with pikepdf.open(pdf) as doc, pikepdf.open(clean) as cdoc:
        if len(doc.pages) != len(plan):
            bad.append("%d pages, not %d" % (len(doc.pages), len(plan)))
        for pno, page in enumerate(plan, start=1):
            pg, cpg = doc.pages[pno - 1], cdoc.pages[pno - 1]
            mb = [float(v) for v in pg.MediaBox]
            if (abs(mb[2] - mb[0] - want_pt[0]) > 0.01
                    or abs(mb[3] - mb[1] - want_pt[1]) > 0.01):
                bad.append("page %d is not A4 portrait %.0f x %.0f mm"
                           % (pno, PAGE_W, PAGE_H))
            M, C = F20.page_marks(pg), F20.page_marks(cpg)

            # ---- THE TIER RULES: one a strip, the strip's own width, nothing else
            want = []
            for top, x0, s in page_strips(page):
                y = top - STRIP_H + BASELINE - RULE_H
                want.append((rgb(SB.TIER_C[s.tier]), x0, y, x0 + s.w, y + RULE_H,
                             s.sentence))
            got = sorted(C["fills"], key=lambda f: (-round(f[2], 1), f[1]))
            want.sort(key=lambda t: (-round(t[2], 1), t[1]))
            if len(got) != len(want):
                bad.append("page %d fills %d shapes, not the %d tier rules its "
                           "strips ask for" % (pno, len(got), len(want)))
            else:
                for (gc, gx0, gy0, gx1, gy1), (wc, wx0, wy0, wx1, wy1, sent) in zip(got, want):
                    if gc != wc:
                        bad.append("page %d: %r is ruled %s, not its tier's %s"
                                   % (pno, sent, gc, wc))
                    d = max(abs(gx0 - wx0), abs(gy0 - wy0), abs(gx1 - wx1), abs(gy1 - wy1))
                    worst_rule = max(worst_rule, (d, "%r, page %d" % (sent, pno)))
                    if d > GEOM_TOL:
                        bad.append("page %d: %r's rule reads back %.4f mm off"
                                   % (pno, sent, d))
                    if abs((gx1 - gx0) - (wx1 - wx0)) > GEOM_TOL:
                        bad.append("page %d: %r's rule is %.3f mm, not the %.3f mm "
                                   "its cards measure"
                                   % (pno, sent, gx1 - gx0, wx1 - wx0))

            # ---- EVERY WORD AT ITS CARD'S INK X, to INK_TOL
            wanted = []
            for top, x0, s in page_strips(page):
                y = top - STRIP_H + BASELINE
                for word, _c0, _c1, i0, _i1 in s.run:
                    wanted.append((x0 + i0 - W12.glyph_box(word)[0], y, word,
                                   s.sentence))
            words = [t for t in C["text"] if t[0] == rgb(INK)]
            adults = [t for t in C["text"] if t[0] == rgb(FOOT_C)]
            if len(words) != len(wanted):
                bad.append("page %d sets %d black strings, not the %d words its "
                           "strips carry" % (pno, len(words), len(wanted)))
            else:
                words.sort(key=lambda t: (-round(t[2], 1), t[1]))
                wanted.sort(key=lambda t: (-round(t[1], 1), t[0]))
                for (_c, gx, gy, _n), (wx, wy, word, sent) in zip(words, wanted):
                    d = max(abs(gx - wx), abs(gy - wy))
                    worst_ink = max(worst_ink, (d, "%r in %r, page %d"
                                                % (word, sent, pno)))
                    if d > INK_TOL:
                        bad.append("page %d: %r in %r is set %.4f mm off the x its "
                                   "card's ink lands on" % (pno, word, sent, d))
            if len(adults) != 1:
                bad.append("page %d sets %d adult strings, not the one caption"
                           % (pno, len(adults)))

            # ---- THE CUT LINES: cutmarks' hairline, on every strip boundary
            v, h = cut_geometry(page)
            hairs = [st for st in M["strokes"]
                     if st[0] == rgb(CM.HAIR_C)]
            if len(hairs) != len(v) + len(h):
                bad.append("page %d strokes %d hairlines, not the %d cuts its %d "
                           "rows ask for" % (pno, len(hairs), len(v) + len(h),
                                             len(page)))
            for col, wmm, pts in hairs:
                if abs(wmm - CM.HAIR_W) > 0.01:
                    bad.append("page %d cuts at %.3f mm, not the house %.2f"
                               % (pno, wmm, CM.HAIR_W))
            got_h = sorted(round(p[0][1], 3) for _c, _w, p in hairs
                           if abs(p[0][1] - p[1][1]) < 1e-6)
            want_h = sorted(round(y, 3) for y, _a, _b in h)
            if got_h != want_h:
                bad.append("page %d's cuts across are at %s, not the strip "
                           "boundaries %s" % (pno, got_h, want_h))
            got_v = sorted((round(p[0][0], 3), round(min(p[0][1], p[1][1]), 3))
                           for _c, _w, p in hairs if abs(p[0][0] - p[1][0]) < 1e-6)
            want_v = sorted((round(x, 3), round(min(y0, y1), 3)) for x, y0, y1 in v)
            if got_v != want_v:
                bad.append("page %d's verticals are not the left trim and one "
                           "tick a strip boundary" % pno)
            # ...and said the other way round, off the LAYOUT rather than off
            # cut_geometry, so a bug in cut_geometry cannot agree with itself:
            # every strip's right edge carries a pair of ticks, and no x that is
            # not a strip's right edge carries any.
            edges = sorted({round(x0 + s.w, 3) for _t, x0, s in page_strips(page)})
            ticks = sorted({x for x, _y0, _y1 in v if x != X0})
            if [round(x, 3) for x in ticks] != edges:
                bad.append("page %d ticks at %s; its strips end at %s"
                           % (pno, [round(x, 3) for x in ticks], edges))
            for top, row in page:
                bot = top - STRIP_H
                for dx, s in row:
                    xr = X0 + dx + s.w
                    pair = [(x, y0, y1) for x, y0, y1 in v
                            if abs(x - xr) < 1e-6 and y0 >= bot - 1e-6
                            and y1 <= top + 1e-6]
                    if len(pair) != 2:
                        bad.append("page %d: %r's right edge carries %d ticks, "
                                   "not the 2" % (pno, s.sentence, len(pair)))

        meta = " ".join(str(x) for x in doc.docinfo.values()) if doc.docinfo else ""
        if str(doc.docinfo.get("/Title", "")) != PDF_TITLE:
            bad.append("the PDF Title is not the sheet's")
        if str(doc.docinfo.get("/Author", "")) != PDF_AUTHOR:
            bad.append("the PDF Author is not the set's")
        if "word under word" not in meta:
            bad.append("the print note no longer says how the strip is used")

    # ---- THE TEXT LAYER IS THE SENTENCES AND THE CAPTION AND NOTHING ELSE
    if shutil.which("pdftotext"):
        for pno, (page, cap) in enumerate(zip(plan, caps), start=1):
            txt = subprocess.run(["pdftotext", "-f", str(pno), "-l", str(pno),
                                  str(pdf), "-"], check=True,
                                 capture_output=True, text=True).stdout
            got = " ".join(txt.split())
            want = " ".join((" ".join(s.sentence for _t, _x, s in page_strips(page))
                             + " " + cap).split())
            if got != want:
                bad.append("page %d's text layer reads %r; it should read %r"
                           % (pno, got[:110], want[:110]))
    else:
        bad.append("no pdftotext: the text-layer assertion did NOT run")

    if bad:
        raise SystemExit("VERIFY FAILURE:\n  " + "\n  ".join(bad))
    return worst_rule, worst_ink


# -------------------------------------------------------------- clearance ----
def clearance(bare, plan):
    """NOTHING A BLADE CAN SPOIL MAY SIT NEAR A CUT.

    Measured on a raster of the pages drawn with the WORDS ONLY — no cut marks
    and NO TIER RULE.  The rule is excluded by construction and not by a
    threshold, because the rule is SUPPOSED to run edge to edge: it is the card's
    own rule and the cut takes it off flush, exactly as sheet 12's does.  The
    descenders that cross it are inside the strip and are not near a cut either.
    What is checked is the WORD ink, strip by strip, against that strip's own
    four cuts — the row boundaries above and below it, and the verticals at its
    own left and right edges (the left trim or its neighbour's tick, and its own
    tick) — which is the only place a wandering blade can eat a letter.  The
    band is narrowed to the strip's own x span first, so a neighbour's ink in the
    same row is never measured against this strip's cuts.
    """
    if not shutil.which("pdftoppm"):
        return None
    px = 25.4 / CLEAR_DPI
    tight = (1e9, None)
    for pno, page in enumerate(plan, start=1):
        stem = SCRATCH / ("strips-clear-%s-%d" % (bare.stem, pno))
        subprocess.run(["pdftoppm", "-r", str(CLEAR_DPI), "-gray", "-png",
                        "-f", str(pno), "-l", str(pno), "-singlefile",
                        str(bare), str(stem)], check=True, capture_output=True)
        a = np.asarray(Image.open(str(stem) + ".png").convert("L"))
        ink = a < 250
        rows = PAGE_H - (np.arange(a.shape[0]) + 0.5) * px
        cols = (np.arange(a.shape[1]) + 0.5) * px
        for top, x0, s in page_strips(page):
            bot = top - STRIP_H
            band = (rows <= top) & (rows >= bot)
            sub = ink[band]
            if not sub.any():
                tight = min(tight, (0.0, "%r sets no ink at all" % s.sentence))
                continue
            span = (cols >= x0) & (cols <= x0 + s.w)
            sub = sub[:, span]
            if not sub.any():
                tight = min(tight, (0.0, "%r sets no ink at all" % s.sentence))
                continue
            ys = rows[band][sub.any(axis=1)]
            xs = cols[span][sub.any(axis=0)]
            for cy in (top, bot):
                tight = min(tight, (float(np.abs(ys - cy).min()),
                                    "%r to the cut at %.1f mm, page %d"
                                    % (s.sentence, cy, pno)))
            for cx in (x0, x0 + s.w):
                tight = min(tight, (float(np.abs(xs - cx).min()),
                                    "%r to the cut at x %.1f mm, page %d"
                                    % (s.sentence, cx, pno)))
    if tight[0] < CLEAR_MIN:
        raise SystemExit("VERIFY FAILURE: word ink comes within %.3f mm of a cut "
                         "(%s); %.2f mm is the floor" % (tight[0], tight[1], CLEAR_MIN))
    return tight


# ------------------------------------------------------------------ proof ----
def proof(pdf, n_pages, stem_name):
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(1, n_pages + 1):
        stem = PROOF_DIR / ("%s-p%d" % (stem_name, i))
        subprocess.run(["pdftoppm", "-r", str(PROOF_DPI), "-png", "-f", str(i),
                        "-l", str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------ build ----
def build(example=False):
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()   # before a single card_w() is right

    all_ = strips()
    if example:
        all_ = [s for s in all_ if s.tier == 1]
    plan = layout(all_)
    caps = captions(plan)
    notes = check(plan, all_)

    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    if example:
        out = PROOF_DIR / EXAMPLE_NAME
        stem_name = "24-example"
    else:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        out = OUT_DIR / NAME
        stem_name = "24-sentence-strips"

    tot = write_pdf(out, plan, caps)
    clean = SCRATCH / ("%s-nomarks.pdf" % stem_name)
    bare = SCRATCH / ("%s-wordsonly.pdf" % stem_name)
    write_pdf(clean, plan, caps, cuts=False)
    write_pdf(bare, plan, caps, cuts=False, rules=False)

    worst_rule, worst_ink = verify(out, clean, plan, caps)
    tight = clearance(bare, plan)
    made = proof(out, len(plan), stem_name)

    # ------------------------------------------------------------- report ----
    ws = [s.w for s in all_]
    n_pink = sum(1 for s in all_ if s.tier == 1)
    n_blue = sum(1 for s in all_ if s.tier == 2)
    n_green = sum(1 for s in all_ if s.tier == 3)
    print("sentence strips%s -> %s"
          % (" · EXAMPLE, pink only" if example else "", out.parent))
    print("  %-26s %d pp · A4 portrait · %d strips (%d pink, %d blue, %d green) "
          "· %d bytes" % (out.name, len(plan), len(all_), n_pink, n_blue, n_green,
                          out.stat().st_size))
    print("  a strip IS the row of cards: %.0f mm tall, baseline %.0f mm up, "
          "%.1f mm tier rule edge to edge, word %.4f pt %s at %.1f mm x-height, "
          "G = %.1f mm" % (STRIP_H, BASELINE, RULE_H, W12.SIZE, W12.WORD_FONT,
                           W12.X_HEIGHT, W12.word_space()))
    print("  widths %.1f - %.1f mm in a %.1f mm measure · the longest, %r, "
          "leaves %.1f mm spare"
          % (min(ws), max(ws), MEASURE, max(all_, key=lambda s: s.w).sentence,
             MEASURE - max(ws)))
    rws = rows(all_)
    used = [sum(s.w for _dx, s in r) for r in rws]
    print("  PACKED ACROSS, order never shuffled: %d rows of %s strips · "
          "row fill %.1f - %.1f mm of the %.1f, %.1f mm mean waste"
          % (len(rws), "/".join(str(len(r)) for r in rws), min(used), max(used),
             MEASURE, MEASURE - sum(used) / len(used)))
    print("  pages: %s rows · %d rows fill a page, last page %d, never balanced"
          % (" + ".join(str(len(p)) for p in plan), MAX_ROWS, len(plan[-1])))
    print("  %d cut lines, %d triangles · one full-width hairline a row "
          "boundary, one full-height left trim, a %.1f mm tick on every strip's "
          "right edge — shared inside a row, the trim at its end"
          % (tot["lines"], tot["marks"], TICK_IN))
    print("  rules read back off the finished file, worst %.4f mm (%s)"
          % (worst_rule[0], worst_rule[1]))
    print("  every word at its card's ink x, worst %.4f mm (%s); floor %.2f"
          % (worst_ink[0], worst_ink[1], INK_TOL))
    print("  text layer is the page's sentences and its one caption, nothing else")
    if tight:
        print("  word ink to cut: tightest %.2f mm (%s) on a %d dpi raster; "
              "floor %.2f" % (tight[0], tight[1], CLEAR_DPI, CLEAR_MIN))
    else:
        print("  ! no pdftoppm: the cut clearance was NOT measured")
    print("  caption: Andika %.1f pt, one line at y %.1f — ink %.2f to %.2f mm, "
          "widest %.1f mm" % (FOOT_SIZE, FOOT_Y, notes["caption_ink"][0],
                              notes["caption_ink"][1], notes["caption_w"]))
    print("  the strips, in tray order, row by row:")
    for i, r in enumerate(rws, start=1):
        for j, (dx, s) in enumerate(r):
            print("    row %2d%s %-6s %6.2f mm  %-30s %s"
                  % (i, " " if j == 0 else "·", SB.TIER_NAME[s.tier], s.w,
                     s.sentence, " + ".join("%.1f" % w for w in s.card_ws())))
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(p.name for p in made)))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a.startswith("--")]
    if [a for a in args if a != "--example"]:
        raise SystemExit("usage: build_24_sentence_strips.py [--example]")
    build(example="--example" in args)
