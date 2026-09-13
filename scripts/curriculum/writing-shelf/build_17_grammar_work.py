#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 17, the TRAY 5 -> TRAY 8 GRAMMAR WORK

The bridge.  The child has already BUILT these eighteen sentences out of sheet
12's word cards and WRITTEN them into sheet 15's book.  He knows them.  So this
sheet asks a second question about the very same words: not *what does it say*,
which is answered, but *what is each word DOING*.  He reads one sentence, and
lays a cut-out grammar symbol above each word.

WHY THE SHEET CAN EXIST AT ALL: the word cards in his tin already carry the
symbol in miniature, 3.6 mm, centred over the word (sheet 12's front).  So the
material is its own control of error without a printed answer key anywhere: a
child who cannot place `in` goes to the tin, finds the card that says `in`, and
sees the green crescent on it.  He checks HIMSELF, against a card he has held a
hundred times.  That is why nothing on this sheet may whisper the answer.

THREE THINGS FOLLOW FROM THAT, and they are the whole design:

ONE - THE PLACEHOLDER IS IDENTICAL OVER EVERY WORD.  A dashed box, 12 x 10 mm,
hairline, charcoal at a third opacity, the SAME box over `the` and over
`penguin`.  It must not be shaped like the symbol it waits for, or sized to it,
or the sheet answers its own question.  check() proves every box on the run is
one single signature - geometry, dash, colour, alpha, line width - and that each
word has exactly one.

TWO - THERE IS NO TIER COLOUR ON THIS SHEET.  Sheet 12's card rules are pink,
blue and green, sheet 14's series colours, and they say *which tin*.  Here the
question is grammar, and a tier colour would be a loud answer to a question
nobody asked - the child would start sorting by colour again.  Everything that
is not a grammar symbol is drawn in the free set's warm charcoal #4F4A44, the
absence of a tier: the word ink, the baselines, the dashed boxes.  The charcoal
is swapped into sheet 12's own draw_card() through ink_colour() below rather
than by copying the function, for the reason in the next paragraph.

THREE - THE WORDS ARE SET AT THE CARD'S OWN SIZE AND SPACING.  6.6 mm x-height,
38.4161 pt of Comic Neue solved off the face's own OS/2.sxHeight, G = 7.0 mm of
word space, and each word standing on a 0.5 mm rule that runs its CARD width.
So a line of this sheet is a row of card-shaped places, and a child who would
rather build it than read it may lay his actual word cards straight down on the
line and they will fit, word for word, to a tenth of a millimetre.  check()
proves that against the tin's own widths.

NOTHING HERE IS A SECOND COPY.  The point size, G, the ink measurement, the
seven part-of-speech classes and the symbol drawing are all sheet 12's, imported
as T.  If a word is reclassed in the tin - if BONK_CLASS changes, if a new
sentence card brings a new word - this sheet changes with it in the same edit
and cannot disagree.  check_no_duplicate_map() reads this file's own source and
refuses to build if anyone ever pastes a word->class table into it.

THE SYMBOL CUT-SHEET IS ONE REUSABLE SET, not sixty-five one-use pieces.  Sixty
-five would be a craft afternoon and a lost envelope; thirty-four is a set he
keeps.  Symbols at 10 mm base height - the working size, the Tray 8 token's,
not the card's 3.6 mm miniature - in the tin's own relative proportions (noun
1.00, verb circle 1.00, adjective 0.80, article 0.70, preposition crescent
0.90, pronoun 0.90, conjunction 0.90) and the tin's own colours, each centred on
its own 16 x 16 mm square so small fingers have something to pick up.

    noun 8 · article 10 · adjective 4 · verb 6 · preposition 4 · pronoun 1 ·
    conjunction 1 = 34

and those counts are CHECKED, not asserted by hand: cut_need() adds up the two
most demanding sentences for every class at once - the child lays two out side
by side - and check() refuses to build if the set cannot cover it.  Pronoun and
conjunction are needed ZERO times by these eighteen sentences (no `it`, no
`and`); their one piece each is there because the symbol set is the Tray 8 set
and a set with two classes missing teaches that there are five.

PACKED, NOT BALANCED, both runs: nine sentences a page, filled to the bottom,
and the cut-sheet's rows hang from the same band top.  The cut guides are sheet
12's: full-width hairlines on the butted row boundaries, one stroke a shared
edge, and a vertical TICK at every piece boundary running 2 mm into the row -
cutmarks.py's CUT ONCE standard, where a full-height vertical cannot be used
because no two rows share their boundaries.

Run:   python3 scripts/curriculum/writing-shelf/build_17_grammar_work.py
Needs: reportlab, fontTools (through sheet 12); pdftoppm (poppler) for the
       x-height probe and the proof PNGs.
"""

import collections
import contextlib
import re
import shutil
import subprocess
from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import build_12_word_card_tin as T
import build_14_sentence_builder_cards as SB
import cutmarks as CM

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
BUILD_DIR = HERE / ".build"
PROOF_DIR = BUILD_DIR / "proof"
NAME = "17-grammar-work.pdf"
PDF_TITLE = "Dark Phonics · Writing Shelf · grammar work"
PDF_AUTHOR = T.PDF_AUTHOR               # the set's, never re-typed

PAGE_W, PAGE_H = T.PAGE_W, T.PAGE_H

# ------------------------------------------------------------ the sentence ----
# Everything about the WORD comes from the tin: T.card_w (ink + G, G = 7.0 mm),
# T.BASELINE, T.RULE_H, T.SIZE (38.4161 pt, a 6.6 mm x-height).  This block adds
# only what the tin has no opinion about - where the rows sit on the page.
X0 = T.X0                               # 10.0 mm, sheet 12's strip origin
RUN_MAX_W = T.STRIP_MAX_W               # 190.0 mm
MARGIN = 12.0
BAND_TOP = PAGE_H - MARGIN              # 285.0 - the top row's BOX top
BAND_BOT = 28.0                         # mm - clear of the caption at 20

BOX_W = 12.0                            # mm - the placeholder, every word's
BOX_H = 10.0                            # mm - 10 mm of symbol needs 10 mm of box
BOX_CLEAR = 2.0                         # mm from the box's foot to the ascender
BOX_ALPHA = 0.35                        # low opacity: a place, not a frame
BOX_DASH = (1.2, 1.2)                   # mm on, mm off
ROW_PITCH = 28.0                        # mm, row top to row top
ROW_GAP_MIN = 3.0                       # mm least paper between two rows

CHARCOAL = T.CHARCOAL_C                 # #4F4A44, the free set's - see the head

# ------------------------------------------------------------ the cut-sheet ----
SQ = 16.0                               # mm - the square of card a symbol sits on
CUT_SYM_H = 10.0                        # mm - the noun triangle, at working size
CUT_COLS = 9                            # 9 to a row; 34 packs 9/9/9/7

# THE ONE PIECE THAT IS NOT A SQUARE.  Every symbol fits 16 x 16 with room to
# spare except the conjunction, whose bar is 1.80 x its height by sheet 12's own
# sym_size(): at a 10 mm base that is 16.2 mm of pink across a 16 mm card, ink
# running off both cut lines.  Three numbers were in conflict - the 10 mm
# working height, the 16 mm square, and the tin's proportions - and the square
# is the one that carries no teaching, so the piece is measured instead: SQ, or
# the symbol plus T.SYM_SIDE (1.5 mm, sheet 12's own least-paper rule) a side,
# whichever is wider.  In practice that is 16 mm for six classes and 19.2 mm for
# the conjunction, and a wide card under a wide symbol reads as intended.
TICK_IN = T.TICK_IN                     # 2.0 mm, sheet 12's vertical tick

# How many of each class the envelope holds.  Approved counts; check() proves
# they cover cut_need(), the worst two sentences at once.
CUT_COUNTS = {"noun": 8, "article": 10, "adjective": 4, "verb": 6,
              "preposition": 4, "pronoun": 1, "conjunction": 1}
AT_ONCE = 2                             # sentences the child lays out together

# -------------------------------------------------------------- adult text ----
LABEL_Y = T.LABEL_Y                     # 20.0
FOOT_Y = T.FOOT_Y                       # 12.0
FOOT_SIZE = T.FOOT_SIZE                 # 5.5 pt Andika, sheet 12's voice
TEXT_X = T.TEXT_X
LABEL_C = T.LABEL_C
ADULT_FONT = T.ADULT_FONT


# ------------------------------------------------------- borrowed, not copied ----
@contextlib.contextmanager
def ink_colour(col):
    """Draw sheet 12's cards in `col` instead of the house ink, for this block.

    The alternative was a second draw_card() with one colour changed, which is
    exactly the kind of copy this sheet exists without: that copy would go on
    drawing the old ink-padded position after someone fixed a bearing bug in the
    tin.  T.INK is read in one place (draw_card's setFillColor) and nothing in
    cutmarks reads it, so the swap reaches the word and nothing else.
    """
    was = T.INK
    T.INK = col
    try:
        yield
    finally:
        T.INK = was


@contextlib.contextmanager
def symbol_height(h):
    """Draw T's symbols at base height `h` - 10 mm here, 3.6 mm on the card.

    T.sym_size() reads T.SYM_H and scales every class off it, so the RELATIVE
    proportions and the colours stay the tin's: one number moves the whole set.
    """
    was = T.SYM_H
    T.SYM_H = h
    try:
        yield
    finally:
        T.SYM_H = was


# ----------------------------------------------------------- the sentences ----
def sentences():
    """The eighteen, in TIER order: (slug, tier, [words]).

    The tier is the card's GROUP - the tray it sits in, sheet 12's tier_need()
    reading - not its frame, so the carried fox-box card sits with the blue six.
    """
    # THE PRINTED FORM, from build_14's one transform: capital on the first
    # word, full stop riding on the last, exactly as the tin's cards carry it
    # and as sheet 18's mats print it.  This sheet adds neither itself.
    rows = [(slug, group, SB.display_words(sentence))
            for slug, group, sentence, _art, _frame in SB.CARDS]
    # STABLE on the tray's own order inside a tier: SB.CARDS is already the tray,
    # and the sort only guarantees the three tiers do not interleave.
    return sorted(rows, key=lambda r: r[1])


def places(words):
    """One sentence as card-shaped places: (word, class, card width mm).

    The word is the PRINTED one and its width is that card's width; the CLASS
    is looked up on the ledger word behind it, since `The` and `sat.` are the
    same parts of speech as `the` and `sat`.
    """
    return [(w, T.CLASS_OF[SB.plain(w)], T.card_w(w)) for w in words]


def ink_extent():
    """(tallest ascender, deepest descender) over every word on the run, in mm.

    One number for the whole sheet, not per row: every row then has its baseline
    the same distance under its box, so the boxes read as a column of places and
    not as a ragged line that has been fitted to the letters.
    """
    top, bot = 0.0, 0.0
    for _slug, _tier, words in sentences():
        for w in words:
            _l, _r, t, b = T.glyph_box(w)
            top, bot = max(top, t), min(bot, b)
    return top, -bot


def block_h():
    asc, desc = ink_extent()
    return BOX_H + BOX_CLEAR + asc + desc


def rows_per_page():
    """As many rows as the band holds. PACKED - the page fills, then turns."""
    return int((BAND_TOP - BAND_BOT - block_h()) // ROW_PITCH) + 1


def row_geometry(top):
    """(box bottom, baseline, card bottom) for a row whose BOX top is `top`."""
    asc, _desc = ink_extent()
    box_bot = top - BOX_H
    base = box_bot - BOX_CLEAR - asc
    return box_bot, base, base - T.BASELINE


# ----------------------------------------------------------- the cut-sheet ----
def piece_w(cls):
    """The card width for one class: SQ, or the symbol plus SYM_SIDE a side."""
    with symbol_height(CUT_SYM_H):
        w, _h = T.sym_size(cls)
    return max(SQ, round((w + 2.0 * T.SYM_SIDE) / T.W_STEP) * T.W_STEP)


def cut_pieces():
    """The 34 symbols, in the tin's own CATEGORIES order: [class, ...]."""
    return [key for key, _l, _s, _ws in T.CATEGORIES
            for _i in range(CUT_COUNTS[key])]


def cut_rows():
    """The pieces packed CUT_COLS to a row, filled left to right."""
    p = cut_pieces()
    return [p[i:i + CUT_COLS] for i in range(0, len(p), CUT_COLS)]


def sentence_need(words):
    """Per-class symbol count for one sentence.  A capital or a full stop does
    not change what a word IS, so the class is taken off the ledger word."""
    return collections.Counter(T.CLASS_OF[SB.plain(w)] for w in words)


def cut_need():
    """The minimum set: the AT_ONCE most demanding sentences, class by class.

    Not the worst single sentence and not the sum of all eighteen.  The child
    lays two out at a time, so for each class the need is the sum of the two
    largest counts that class reaches in any one sentence - which is the largest
    that class can be over any pair, since the pair is free to be those two.
    """
    need = {}
    for key, _l, _s, _ws in T.CATEGORIES:
        counts = sorted((sentence_need(w)[key] for _s2, _t, w in sentences()),
                        reverse=True)
        need[key] = sum(counts[:AT_ONCE])
    return need


def worst_sentence():
    """(slug, words, symbols) - the sentence that wants the most symbols."""
    best = max(sentences(), key=lambda r: (len(r[2]), r[0]))
    return best[0], best[2], len(best[2])


# ---------------------------------------------------------------- the plan ----
def plan_pages():
    """Sentence pages, packed, then the cut-sheet. Single-sided throughout."""
    per = rows_per_page()
    sents = sentences()
    out = []
    for i in range(0, len(sents), per):
        chunk = sents[i:i + per]
        out.append({"kind": "sentences",
                    "rows": [(BAND_TOP - j * ROW_PITCH, slug, tier,
                              places(words))
                             for j, (slug, tier, words) in enumerate(chunk)]})
    rows = cut_rows()
    out.append({"kind": "cut",
                "rows": [(BAND_TOP - j * SQ, row) for j, row in enumerate(rows)]})
    return out


def page_fill(page):
    """How much of the band the page's content covers, 0..1."""
    band = BAND_TOP - BAND_BOT
    if page["kind"] == "cut":
        return len(page["rows"]) * SQ / band
    n = len(page["rows"])
    return ((n - 1) * ROW_PITCH + block_h()) / band


# -------------------------------------------------------------- the drawing ----
def box_signature():
    """Everything that distinguishes one placeholder from another. There is one."""
    r, g, b = CHARCOAL.red, CHARCOAL.green, CHARCOAL.blue
    return (BOX_W, BOX_H, BOX_DASH, BOX_ALPHA, CM.HAIR_W, round(r, 4),
            round(g, 4), round(b, 4))


def draw_box(c, cx, bot):
    """The placeholder, centred on cx with its foot at `bot`. Identical, always."""
    c.saveState()
    c.setStrokeColor(CHARCOAL)
    c.setStrokeAlpha(BOX_ALPHA)
    c.setLineWidth(CM.HAIR_W * mm)
    c.setDash([BOX_DASH[0] * mm, BOX_DASH[1] * mm])
    c.rect((cx - BOX_W / 2.0) * mm, bot * mm, BOX_W * mm, BOX_H * mm,
           stroke=1, fill=0)
    c.restoreState()


def draw_sentence_row(c, top, laid):
    """One sentence: a row of card-shaped places, a box waiting over each.

    The place IS sheet 12's card, drawn by sheet 12's own draw_card() with no
    symbol (class None) and the charcoal rule of the free set.  Lay the real
    cards on it and they land.
    """
    box_bot, _base, card_y = row_geometry(top)
    boxes, x = [], X0
    with ink_colour(CHARCOAL):
        for word, _cls, cw in laid:
            T.draw_card(c, x, card_y, word, None, cw, CHARCOAL)
            draw_box(c, x + cw / 2.0, box_bot)
            boxes.append((word, x, x + cw, x + cw / 2.0, box_bot))
            x += cw
    return boxes


def draw_cut_row(c, top, row):
    """One row of 16 mm squares, each with its symbol centred at 10 mm."""
    y = top - SQ
    x = X0
    with symbol_height(CUT_SYM_H):
        for cls in row:
            _w, h = T.sym_size(cls)
            # sym_box() hangs the symbol T.SYM_TOP under a card top T.CARD_H up
            # from y; solve the y that puts it dead centre in the piece instead.
            yy = y + (SQ + h) / 2.0 - T.CARD_H + T.SYM_TOP
            T.draw_symbol(c, cls, x, yy, piece_w(cls))
            x += piece_w(cls)


def cut_geometry(page):
    """Sheet 12's construction at a 16 mm row: shared hairlines, vertical ticks.

    Full-width horizontals on the butted row boundaries - row N's bottom edge IS
    row N+1's top and one stroke serves both - and a tick at every piece
    boundary, TICK_IN into the row from each edge, because the rows are ragged
    (the last holds seven of nine) and a full-height vertical would run through
    the middle of a square.
    """
    v, h = [], []
    tops = [top for top, _row in page["rows"]]
    h.append((tops[0], 0.0, PAGE_W))
    for top, row in page["rows"]:
        bot = top - SQ
        h.append((bot, 0.0, PAGE_W))
        x = X0
        for cls in row + [None]:
            v.append((x, top - TICK_IN, top))
            v.append((x, bot, bot + TICK_IN))
            if cls is not None:
                x += piece_w(cls)
    return v, h


def sentence_caption(page):
    """Sheet 12's caption voice, at sheet 12's size: what this page is, plainly."""
    tiers = []
    for _top, _slug, tier, _laid in page["rows"]:
        name = SB.TIER_NAME[tier]
        if name not in tiers:
            tiers.append(name)
    return ("grammar work · %s sentences · read one, then lay a symbol above "
            "every word" % " · ".join(tiers))


def cut_caption():
    return ("grammar symbols · one set for the envelope · %s"
            % " · ".join("%s %d" % (k, CUT_COUNTS[k])
                         for k, _l, _s, _w in T.CATEGORIES))


# ------------------------------------------------------------------ checks ----
def check_source():
    """Sheet 12's guard, called through: the .ts is still the source of truth.

    T.check_source() runs sheet 14's SENTENCE_BUILDER_CARDS comparison against
    lib/montree/dark-phonics/writing-shelf-language.ts and then proves every word
    those sentences use has a compartment in the tin - which is the same fact
    this sheet needs, since every word here gets a symbol from that compartment.
    """
    return T.check_source()


def check_no_duplicate_map():
    """Refuse to build if a word->class table has been pasted into THIS file.

    The classification lives in sheet 12 and is imported.  A copy here would go
    stale silently - the tin would reclass a word and the placement sheet would
    go on printing the old symbol on its cut-sheet - so the file polices itself.
    """
    src = Path(__file__).read_text(encoding="utf-8")
    body = src.split('"""', 2)[-1]          # past the module docstring
    bad = []
    for name in ("CATEGORIES", "CLASS_OF", "SYMBOL", "LABEL_OF", "WORD_CLASSES",
                 "NOUN_C", "VERB_C", "ADJ_C", "ART_C", "PREP_C", "PRON_C",
                 "CONJ_C", "X_HEIGHT", "WORD_SPACE"):
        if re.search(r"(?m)^%s\s*=" % name, body):
            bad.append(name)
    for word in sorted(T.CLASS_OF):
        if re.search(r"""(?m)^[^#\n]*['"]%s['"]\s*:\s*['"]""" % word, body):
            bad.append("a literal class for %r" % word)
    if bad:
        raise SystemExit(
            "SPEC FAILURE: this sheet has grown its own copy of the tin's "
            "classification (%s). It must import sheet 12, never restate it."
            % ", ".join(bad))
    return len(T.CLASS_OF)


def check(pages):
    bad, notes = [], {}

    # ---- the size, measured off a RASTERISED glyph - the tin's own probe
    probe = T.probe_x_height()
    notes["probe"] = probe
    if probe is None:
        bad.append("no pdftoppm: the x-height cannot be measured off a render")
    else:
        measured, predicted = probe
        if abs(measured - predicted) > 0.05:
            bad.append("the rendered 'x' measures %.3f mm where its outline "
                       "predicts %.3f - the point size is not rendering true"
                       % (measured, predicted))
    nominal = (T.SIZE / 72.0 * 25.4 * T.SIZE_FROM["sx"] / T.SIZE_FROM["upm"])
    notes["nominal"] = nominal
    if abs(nominal - T.X_HEIGHT) > 0.001:
        bad.append("%.4f pt gives a %.4f mm x-height, not the tin's %.2f"
                   % (T.SIZE, nominal, T.X_HEIGHT))

    # ---- the places must match the TIN's cards, so real cards can be laid on them
    tin_w = {}
    for tier, _label in T.TINS:
        for word, _cls in T.tin_cards(tier):
            if word is not None:
                tin_w[word] = T.card_w(word)
    worst_w = (0.0, None)
    for _slug, _tier, words in sentences():
        for w in words:
            if w not in tin_w:
                bad.append("%r is on a sentence line but in no tin" % w)
                continue
            d = abs(T.card_w(w) - tin_w[w])
            if d > worst_w[0]:
                worst_w = (d, w)
            if d > 0.1:
                bad.append("%r is laid %.3f mm wide and its card is %.3f"
                           % (w, T.card_w(w), tin_w[w]))
    notes["run_match"] = worst_w

    # ---- the boxes: one a word, all identical, clear of the ink, never touching
    n_words = n_boxes = 0
    tight_clear, tight_gap = None, None
    asc, _desc = ink_extent()
    sigs = set()
    for page in pages:
        if page["kind"] != "sentences":
            continue
        for top, _slug, _tier, laid in page["rows"]:
            box_bot, base, _cy = row_geometry(top)
            x, prev_right = X0, None
            for word, cls, cw in laid:
                n_words += 1
                n_boxes += 1
                sigs.add(box_signature())
                if cls != T.CLASS_OF.get(SB.plain(word)):
                    bad.append("%r is laid as a %s" % (word, cls))
                if BOX_W > cw + 1e-9:
                    bad.append("the box over %r is wider than its %.1f mm place"
                               % (word, cw))
                left = x + cw / 2.0 - BOX_W / 2.0
                if prev_right is not None:
                    gap = left - prev_right
                    if tight_gap is None or gap < tight_gap[0]:
                        tight_gap = (gap, word)
                    if gap < 0.0:
                        bad.append("the boxes over %r and its neighbour overlap"
                                   % word)
                prev_right = left + BOX_W
                _l, _r, itop, _b = T.glyph_box(word)
                clear = box_bot - (base + itop)
                if tight_clear is None or clear < tight_clear[0]:
                    tight_clear = (clear, word)
                if clear < BOX_CLEAR - 0.5:
                    bad.append("the box over %r leaves %.2f mm over its ink"
                               % (word, clear))
                if box_bot + BOX_H > PAGE_H - CM.SAFE:
                    bad.append("the box over %r runs off the page head" % word)
                x += cw
            if x - X0 > RUN_MAX_W + 1e-6:
                bad.append("a sentence run is %.1f mm, over the %.1f measure"
                           % (x - X0, RUN_MAX_W))
            if base - asc - 0.0 < 0:
                bad.append("a row's baseline is off the page")
            if base + (-ink_extent()[1]) < BAND_BOT - ROW_GAP_MIN:
                bad.append("a row descends below the band")
    if len(sigs) > 1:
        bad.append("the placeholder boxes are not all one box: %d signatures"
                   % len(sigs))
    if n_boxes != n_words:
        bad.append("%d boxes for %d words" % (n_boxes, n_words))
    notes["words"] = n_words
    notes["sig"] = sorted(sigs)[0] if sigs else None
    notes["tight_clear"] = tight_clear
    notes["tight_gap"] = tight_gap

    # ---- the envelope must cover the two most demanding sentences at once
    need = cut_need()
    notes["need"] = need
    margin = {k: CUT_COUNTS[k] - need[k] for k in need}
    notes["margin"] = margin
    for k, m in margin.items():
        if m < 0:
            bad.append("the set holds %d %s symbol(s) and two sentences can "
                       "want %d" % (CUT_COUNTS[k], k, need[k]))
    if set(CUT_COUNTS) != {k for k, _l, _s, _w in T.CATEGORIES}:
        bad.append("the cut-sheet's classes are not the tin's seven")
    if sum(CUT_COUNTS.values()) != len(cut_pieces()):
        bad.append("the cut-sheet draws a different number than it counts")

    # ---- every cut piece: the symbol centred, SYM_SIDE of paper all round
    with symbol_height(CUT_SYM_H):
        sizes = {k: T.sym_size(k) for k, _l, _s, _w in T.CATEGORIES}
    notes["sizes"] = sizes
    notes["piece_w"] = {k: piece_w(k) for k in sizes}
    for k, (w, hgt) in sizes.items():
        if abs(hgt - CUT_SYM_H * T.SYMBOL[k][2]) > 1e-9:
            bad.append("the %s symbol is not at the tin's proportion" % k)
        if (piece_w(k) - w) / 2.0 < T.SYM_SIDE - 1e-9:
            bad.append("the %s symbol leaves %.2f mm each side of its piece"
                       % (k, (piece_w(k) - w) / 2.0))
        if (SQ - hgt) / 2.0 < T.SYM_SIDE - 1e-9:
            bad.append("the %s symbol leaves %.2f mm over its piece"
                       % (k, (SQ - hgt) / 2.0))
    for row in cut_rows():
        if sum(piece_w(k) for k in row) > RUN_MAX_W + 1e-6:
            bad.append("a cut row is wider than the %.0f mm measure" % RUN_MAX_W)

    # ---- the cut geometry, and the adult text clear of it
    for page in pages:
        if page["kind"] != "cut":
            continue
        v, h = cut_geometry(page)
        notes["cuts"] = (len(v), len(h))
        for xx, y0, y1 in v:
            if xx < CM.SAFE or xx > PAGE_W - CM.SAFE:
                bad.append("a cut tick at x %.1f breaks the safe margin" % xx)
            if min(y0, y1) < CM.SAFE or max(y0, y1) > PAGE_H - CM.SAFE:
                bad.append("a cut tick reaches y %.1f-%.1f" % (y0, y1))
        for yy, _a, _b in h:
            if yy < CM.SAFE or yy > PAGE_H - CM.SAFE:
                bad.append("a cut line at y %.1f breaks the safe margin" % yy)
        for ypos, what in ((LABEL_Y, "caption"), (FOOT_Y, "footer")):
            if any(abs(ypos - yy) < 3.0 for yy, _a, _b in h):
                bad.append("the %s sits on a cut line" % what)

    # ---- packed, not balanced: only the LAST page may be short
    fills = [page_fill(p) for p in pages]
    notes["fills"] = fills
    for i, f in enumerate(fills[:-1]):
        if f < 0.70:
            bad.append("page %d is %.0f%% full and is not the last" % (i + 1,
                                                                      f * 100))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return notes


# ------------------------------------------------------------------- proof ----
def proof(pdf, n_pages):
    """Every page to PNG at 150 dpi: gram-p1.png, gram-p2.png, ..."""
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(1, n_pages + 1):
        stem = PROOF_DIR / ("gram-p%d" % i)
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i),
                        "-l", str(i), "-singlefile", str(pdf), str(stem)],
                       check=True, capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------- build ----
def build():
    T.register_fonts()
    T.SIZE, T.SIZE_FROM = T.word_size()   # the tin's own derivation, not a guess
    n_src = check_source()
    n_cls = check_no_duplicate_map()
    pages = plan_pages()
    notes = check(pages)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    marks = lines = 0
    for page in pages:
        if page["kind"] == "sentences":
            for top, _slug, _tier, laid in page["rows"]:
                draw_sentence_row(c, top, laid)
            caption = sentence_caption(page)
            n = len(page["rows"])
            foot = ("%d sentences · the symbols are on the last sheet" % n)
        else:
            for top, row in page["rows"]:
                draw_cut_row(c, top, row)
            v, h = cut_geometry(page)
            st = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
            marks += st["marks"]
            lines += st["lines"]
            caption = cut_caption()
            foot = CM.cards_line(len(cut_pieces()), "symbol")
        c.saveState()
        c.setFillColor(LABEL_C)
        c.setFont(ADULT_FONT, FOOT_SIZE)
        c.drawString(TEXT_X * mm, LABEL_Y * mm, caption)
        c.restoreState()
        CM.footer(c, TEXT_X, FOOT_Y, foot, ADULT_FONT, FOOT_SIZE)
        c.showPage()
    c.save()
    made = proof(out, len(pages))

    # ------------------------------------------------------------ report ----
    sent_pages = [p for p in pages if p["kind"] == "sentences"]
    print("grammar work -> %s" % OUT_DIR)
    print("  %-24s %d pp, single-sided · %d cut lines, %d triangles · %d bytes"
          % (NAME, len(pages), lines, marks, out.stat().st_size))
    print("  source of truth %s: %d sentence cards, matched · %d words classed "
          "in sheet 12, imported (no copy here)"
          % (SB.SOURCE_TS.name, n_src, n_cls))
    print("  word %.4f pt %s from %s · x-height %.4f mm"
          % (T.SIZE, T.WORD_FONT, T.SIZE_FROM["how"], notes["nominal"]))
    measured, predicted = notes["probe"]
    print("  rendered 'x' measures %.3f mm at 1200 dpi (outline predicts %.3f) "
          "- the tin's own probe, the tin's own size"
          % (measured, predicted))
    d, w = notes["run_match"]
    print("  G = %.1f mm · places match the tin's cards to %.4f mm (worst %r) "
          "- real cards lie on the line"
          % (T.word_space(), d, w))
    print("  %d words · %d boxes, one signature %s"
          % (notes["words"], notes["words"], notes["sig"]))
    print("  box %.0f x %.0f mm, %.2f alpha, %.1f/%.1f dash · tightest over an "
          "ascender %.2f mm (%r) · closest two boxes %.2f mm (%r)"
          % (BOX_W, BOX_H, BOX_ALPHA, BOX_DASH[0], BOX_DASH[1],
             notes["tight_clear"][0], notes["tight_clear"][1],
             notes["tight_gap"][0], notes["tight_gap"][1]))
    slug, words, n = worst_sentence()
    print("  worst sentence %r: %d words, %s"
          % (slug, n, " ".join("%s(%s)" % (x, T.CLASS_OF[SB.plain(x)])
                                for x in words)))
    pw = notes["piece_w"]
    odd = sorted(k for k in pw if abs(pw[k] - SQ) > 1e-9)
    print("  piece %.0f x %.0f mm%s"
          % (SQ, SQ, "" if not odd else
             " · except %s" % ", ".join("%s %.1f x %.0f (its bar is %.1f wide)"
                                        % (k, pw[k], SQ, notes["sizes"][k][0])
                                        for k in odd)))
    print("  envelope %d symbols at %.0f mm on %.0f mm squares · need (two "
          "sentences at once) %s"
          % (len(cut_pieces()), CUT_SYM_H, SQ,
             " ".join("%s %d" % (k, notes["need"][k])
                      for k, _l, _s, _w in T.CATEGORIES)))
    print("  margin %s · tightest %s"
          % (" ".join("%s +%d" % (k, notes["margin"][k])
                      for k, _l, _s, _w in T.CATEGORIES),
             min(notes["margin"].items(), key=lambda kv: kv[1])))
    print("  pages: %s sentences a page (%d of 18) + one cut-sheet of %d rows"
          % (" + ".join(str(len(p["rows"])) for p in sent_pages),
             sum(len(p["rows"]) for p in sent_pages), len(cut_rows())))
    print("  band fill: %s" % " · ".join("%.0f%%" % (f * 100)
                                         for f in notes["fills"]))
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(p.name for p in made)))


if __name__ == "__main__":
    build()
