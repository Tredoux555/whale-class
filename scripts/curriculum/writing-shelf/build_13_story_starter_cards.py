#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 13, the Tray 5 STORY STARTER CARDS

Tray 5 hands a child a tin of word cards and a blank sentence line and asks him
to invent a sentence.  For a Chinese ESL child of four who has never been asked
to make anything up in English, that is one leap too many: he can read every
card in the tin and still sit in front of an empty line.  These fourteen cards
are the thing he reacts to.  He pulls one, looks at it, says what he sees, and
builds THAT out of the tin.  The invention comes later, once the work is known.

CONTROL OF ERROR IS ON THE CARD ITSELF.  The front is the picture and nothing
else; the back is the one decodable sentence the picture is of.  He builds his
sentence on the line, then TURNS THE CARD OVER and reads what is there.  No
teacher is needed for that check, which is the whole Montessori point — and the
physical turn is why these are flip cards and not story cards (sheet 06's
70 x 70 squares are looked at, not turned).

SIZE IS THE FLIP-CARD SIZE, NOT A NEW ONE.  80 x 120 mm printed, mounted by
hand on a coloured backing card with a 1 cm border, finishing at 100 x 140 —
the same card as sheets 02 and 03, the same card his 100 mm stands take
(CLAUDE.md, "WRITING SHELF PRINT RULES — LOCKED", rule 2).  Four cards butt
into a 160 x 240 block centred on A4: 25 mm side margins, 28.5 mm head and
foot.  Geometry, margins, footer and clearances are build_flip_cards.py's,
constant for constant.

THE PICTURE IS TRIMMED TO ITS OWN INK and then fills the 60 x 100 mm content
box — the 80 x 120 card less the 10 mm the frame and its hairline take on every
side.  Teacher review of the second round of proofs, 2026-09-12: the drawings
sat small in the middle of the card with dead white round them, and on a couple
of cards with more white below than above, so they printed low.  build_14's
trim() measures the ink bounding box of the white-grounded picture, crops to it,
gives back an even 2 % breathing margin, and the result is FITTED into the whole
content box with its aspect preserved and centred ON THE INK.  The source PNGs
in phonics-images/ are never written to; the trim happens on the copy in
.build/.  Every card now reaches the full 60 mm width.

THE SENTENCE is set in COMIC NEUE and written ALL IN LOWER CASE.  Both are the
teacher's, off the printed proofs (2026-09-12).  Lower case because these are
the literal words a four-year-old says when he looks at the picture — "hen in a
pen", not "Hen in a pen" — and the capital and the full stop are his to add, not
the card's.  Comic Neue because Andika, the house literacy face, read as a
formal printed sentence: Comic Neue is the free SIL-OFL face that is metrically
similar to Comic Sans MS (which is Microsoft-licensed and cannot be embedded in
a PDF this shelf ships), and its single-storey a and g are the letterforms the
infant room writes in.  ADULT TEXT IN THE MARGIN IS STILL ANDIKA.  THE SIZE IS
NOT THIS SHEET'S TO CHOOSE: build_14.STD_EM_MM is ONE em for both Tray 5 decks,
every card set at it, so two cards of the same shape can never come out
different sizes.  A sentence of three words or fewer sets on one line wherever
it fits at that em; anything that does not takes the fewest lines that do.

EVERY CARD IS FRAMED, and that is the change of 2026-09-12 (round 2).  Until
now exactly ONE of the fourteen — "hen in a pen" — carried a thin pink rule and
the other thirteen carried nothing, and a deck in which one card is designed and
thirteen are bare does not read as a one-off highlight, it reads as unfinished.
So the frame is now the deck rule, IMPORTED constant for constant from build_14
so the two Tray 5 decks are cut to one standard: a ROUNDED double frame, 2.6 mm
of stroke with a 5 mm outer corner radius, its outer edge 4 mm off the cut line
on all four sides, and a 0.4 mm hairline of the same colour 2.2 mm inside it.
Content sits 0.8 mm inside the hairline, square on all four sides.

THE COLOUR IS THE TIER, exactly as it is on sheet 14, and that is the change of
2026-09-13.  The deck used to be framed in a neutral warm charcoal with one card
in pink, and a neutral says nothing: a child cannot sort the tray by it and the
teacher cannot hand out a level with it.  The classroom already has a three
colour difficulty code — the Montessori PINK, BLUE and GREEN reading series —
established on sheet 14, so this deck is read against the same code, card by
card, on the phonetics of the words actually printed on the back:

  tier 1 · PINK   every content word is a pure three-letter CVC     cat on a mat
  tier 2 · BLUE   four letters or more, but no consonant blend      (none yet)
  tier 3 · GREEN  a consonant blend anywhere on the card            frog in a bog

The three hexes are IMPORTED from build_14 (TIER_C), never re-typed, so the two
Tray 5 decks cannot drift apart.  BLUE IS WIRED UP THOUGH NO CARD USES IT: every
card on this deck that steps past three-letter CVC steps straight into a blend,
so tier 2 is empty today — give a future card tier 2 and it frames, paginates and
labels itself with no further change.  "ant on a pan" and "fox in a box" are the
teacher's own calls: he files ant with the three-letter short-vowel words and fox
and box with them too, the x notwithstanding.

ONE TIER TO A PRINTED PAGE, WHICH IS WHY THE DECK IS REORDERED.  The cards are
grouped pink, then blue, then green, and a page is filled from ONE tier only and
then left short rather than topped up from the next.  The teacher prints each
tier onto matching coloured card stock, so a page carrying two tiers is a page he
cannot print.  Ten pink cards at four a page is three pink pages, the last
carrying two cards and two blank slots — that gap is correct and must not be
padded by pulling a green card forward — and the four green cards fill one page.
Every page header names its tier, on the picture side and on the sentence side,
in sheet 14's wording.

DUPLEX: SHORT EDGE, like every other card sheet on this shelf.  Short-edge flip
of a portrait sheet is (x, y) -> (x, H - y): top and bottom swap, left and right
do not.  So the card printed at front (col c, row r) is backed by the card
printed at back (col c, ROWS - 1 - r) — the back grid is the front grid mirrored
top to bottom — and because the flip turns the sheet about a horizontal axis,
each back is drawn ROTATED 180 degrees in the back page's own frame so that it
reads upright once flipped.  Both halves of that are read off the shipped
03-dictation-photo-cards.pdf, and are what lib/montree/writing-shelf/generator/
flip-cards.ts encodes as frontSlot()/backSlot().

THE ART lands in phonics-images/satpin-v2/story-starters/<slug>.png (gitignored,
Mac only, the same place and the same rule as satpin-v2/sequences/ and
satpin-v2/cvc-photos/).  One square PNG a card, >= 1024 px, named for its slug.

Two of the fourteen carry a small (c) glyph baked into the white below the
drawing by the image generator.  PATCHES whites out exactly those two boxes and
nothing else; each box was measured to be clear of every stroke of the art by
at least 2 px, and the check below refuses to run if a patch box has moved onto
ink.  Everything else about the art is left alone.

BACKGROUNDS ARE LIFTED TO PAPER WHITE BY build_14's paper(), IMPORTED.  Two of
the fourteen came off the generator on a cream or grey ground; a tinted panel on
a white card prints as a visible rectangle with a visible edge, which is the one
thing a picture card must not have.  This sheet used to do it with a whiten() of
its own that scaled the border by its MEDIAN, and on flat generated art that is
right.  "bee on a tree" is not flat: it is on a scanned textured sheet whose
grain runs 226-245 in one picture, and scaling that by its median 235 puts the
middle of the grain at paper white and leaves the dark half of it below, so the
card printed as exactly the soft grey box a picture card must never have
(teacher review, 2026-09-13).  build_14 already had the answer, written for the
three scanned sources on that deck: take the white point BELOW the grain, at the
5th percentile of the border band, floored so art touching the border cannot
drag it down, and clip everything above it to paper.  So the local copy is gone
and B14.paper() does both decks — one implementation, like every other constant
on this sheet.  Art whose border is already paper is left completely alone.

Run:   python3 scripts/curriculum/writing-shelf/build_13_story_starter_cards.py
Check: pdftoppm -png -r 60 public/dark-phonics-shelf/v2/13-story-starter-cards.pdf /tmp/s
Needs: reportlab, Pillow
"""

from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import build_14_sentence_builder_cards as B14
import cutmarks as CM

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ART_DIR = REPO / "phonics-images" / "satpin-v2" / "story-starters"
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
FONT_DIR = REPO / "public" / "fonts"
BUILD_DIR = HERE / ".build" / "story-starters"
NAME = "13-story-starter-cards.pdf"

PAGE_W, PAGE_H = 210.0, 297.0          # exact A4 portrait
CARD_W, CARD_H = 80.0, 120.0           # PRINTED; mounted it is 100 x 140
COLS, ROWS = 2, 2

BLOCK_W, BLOCK_H = COLS * CARD_W, ROWS * CARD_H        # 160 x 240
X0 = (PAGE_W - BLOCK_W) / 2.0                          # 25.0
Y0 = (PAGE_H - BLOCK_H) / 2.0                          # 28.5

FIT_W = CARD_W - 2 * CM.CONTENT_CLEAR                  # 72 mm
FIT_H = CARD_H - 2 * CM.CONTENT_CLEAR                  # 112 mm
# THE FRAME IS SHEET 14's FRAME, constant for constant.  Nothing about it is
# re-typed here: if build_14's frame changes, this sheet's changes with it.
FRAME_INSET = B14.FRAME_INSET          # 4.0 mm — outer edge off the cut line
FRAME_W = B14.FRAME_W                  # 2.6 mm — the frame stroke
FRAME_R = B14.FRAME_R                  # 5.0 mm — outer corner radius
HAIR_GAP = B14.HAIR_GAP                # 2.2 mm — air inside the frame
HAIR_W = B14.HAIR_W                    # 0.4 mm — the inner rule
HAIR_R = B14.HAIR_R                    # 2.4 mm
HAIR_IN = B14.HAIR_IN                  # 9.2 mm — inner edge of the hairline
CONTENT_PAD = B14.CONTENT_PAD          # 0.8 mm — optical air inside it
INNER_INSET = B14.INNER_INSET          # 10.0 mm off the card edge, all four
INNER_W = B14.INNER_W                  # 60.0 mm
INNER_H = B14.INNER_H                  # 100.0 mm

# THE PICTURE BOX IS THE WHOLE CONTENT BOX, 60 x 100 — not a square in it.
# The art is trimmed to its ink and then fitted into this box, aspect preserved
# and centred, by build_14's fitted_mm(), so the two decks scale art alike.

# Type on the back, ALL OF IT build_14's, imported so the two Tray 5 decks are
# set to one standard: one em for both decks, and a sentence of SHORT_WORDS
# words or fewer never wraps.  See the note beside STD_EM_MM in build_14.
MAX_EM_MM = B14.MAX_EM_MM              # 13.0 mm — the absolute ceiling
LINE_H = B14.LINE_H                    # 1.25
MAX_LINES = B14.MAX_LINES              # 3
STD_EM_MM = B14.STD_EM_MM              # 10.90 mm — THE deck em, every card
SHORT_WORDS = B14.SHORT_WORDS          # 3 words or fewer, one line where it fits

# THE SENTENCE FACE IS COMIC NEUE, not Andika, and only for the SENTENCE.
# Teacher review of the printed proofs, 2026-09-12: the back read as a formal
# printed sentence rather than as the words the child had just said out loud.
# Comic Neue is the free, SIL-OFL, metrically-similar stand-in for Comic Sans MS
# (which is Microsoft-licensed and cannot be embedded in a PDF the shelf ships);
# its single-storey a and g and its looser, hand-drawn joins are what an infant
# classroom writes in. public/fonts/ComicNeue-Regular.ttf, licence beside it.
# ADULT TEXT IN THE MARGIN STAYS ANDIKA — the house face is unchanged, and the
# margin is not the child's to read.
SENTENCE_FONT = "ComicNeue"
ADULT_FONT = "Andika"

# EVERY CARD CARRIES THE FRAME and the COLOUR IS ITS TIER — the same three
# series colours as sheet 14, IMPORTED constant for constant so the hexes cannot
# drift.  Blue is bound here and carried through pagination and the page header
# even though no card on this deck is tier 2 today: a card given tier 2 tomorrow
# needs no other change.
PINK_C = B14.PINK_C                    # #D45B86, tier 1
BLUE_C = B14.BLUE_C                    # #2F5FA6, tier 2
GREEN_C = B14.GREEN_C                  # #2F7D4F, tier 3
TIER_C = B14.TIER_C                    # {1: pink, 2: blue, 3: green}
TIER_NAME = B14.TIER_NAME              # {1: "pink", 2: "blue", 3: "green"}
TIER_ORDER = (1, 2, 3)                 # easiest first, on the tray and on the page


def frame_colour(tier):
    """The tier's series colour — sheet 14's, imported, never re-typed."""
    return TIER_C[tier]

FOOT_SIZE = 5.5
FOOT_X, FOOT_Y = 30.0, 13.0            # build_flip_cards.py's footer, exactly
LABEL_Y = 277.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)               # #5F594F, adult-text grey
INK = CM.MARK_C                                        # #141110

JPEG_QUALITY = 90
MIN_PX = 1024
# Resolution is set by what is PRINTED, not by the file: build_14.for_print()
# resamples each trimmed picture to about 300 dpi at the size it lands on the
# card.  Nothing is resampled UP.
PRINT_DPI = B14.PRINT_DPI              # 300
WHITE_AT = B14.WHITE_AT                # 249 — at or above this, it is paper
GROUND_BAND = B14.GROUND_BAND          # 8 px of border measured for the ground
GROUND_PCT = B14.GROUND_PCT            # 5th percentile: the white point, BELOW
GROUND_FLOOR = B14.GROUND_FLOOR        #   the grain, floored here
GROUND_WHITE = B14.GROUND_WHITE        # a border at or above this is already paper


# ---------------------------------------------------------------- cards ----
# slug, TIER, and the one decodable sentence the picture is of.  Slug is also
# the art file name: phonics-images/satpin-v2/story-starters/<slug>.png
#
# THE ORDER IS THE TIER ORDER and it is load-bearing, not cosmetic: pages are
# filled from this list a tier at a time and a page never carries two tiers,
# because each tier is printed onto its own colour of card stock.  The tier of
# a card is read off the words on its BACK, the ones the child decodes:
#   1 pink   every content word a pure three-letter CVC, one sound a letter
#   2 blue   four letters or more, no consonant blend
#   3 green  a consonant blend anywhere on the card
CARDS = [
    # tier 1 · pink · pure three-letter CVC.  "ant" is filed here with the
    # three-letter short-vowel words, and so are "fox" and "box" — the
    # teacher's own calls, the x notwithstanding.
    ("cat-mat",      1, "cat on a mat"),
    ("pig-wig",      1, "pig in a wig"),
    ("hen-pen",      1, "hen in a pen"),
    ("dog-log",      1, "dog on a log"),
    ("fox-box",      1, "fox in a box"),
    ("bug-rug",      1, "bug on a rug"),
    ("rat-hat",      1, "rat in a hat"),
    ("nut-hut",      1, "nut in a hut"),
    ("ant-pan",      1, "ant on a pan"),
    ("cub-tub",      1, "cub in a tub"),
    # tier 2 · blue · four letters or more with no blend.  EMPTY BY FACT, not
    # by omission: every card on this deck that leaves three-letter CVC behind
    # leaves it for a blend.  The tier is wired all the way through anyway.
    # tier 3 · green · a consonant blend on the card.
    ("frog-bog",     3, "frog in a bog"),       # fr
    ("bee-tree",     3, "bee on a tree"),       # tr
    ("duck-truck",   3, "duck in a truck"),     # tr
    ("sheep-asleep", 3, "sheep asleep"),        # sl, over the sh digraph
]

# Generator glyphs to white out, as FRACTIONS of the square so they survive a
# re-render at another size.  Measured on the 1024 px originals; check_art()
# refuses to build if one has drifted onto a stroke of the drawing.
PATCHES = {
    "dog-log":  [(0.9180, 0.9277, 0.9863, 0.9863)],   # (c), bottom right
    "frog-bog": [(0.8408, 0.8145, 0.8799, 0.8516)],   # (c), below the lily pad
}
PATCH_RING_PX = 6                      # must be clear of ink this far out


# ------------------------------------------------------------------ art ----
def square(im):
    """Centre-crop to a square.  Already-square art is returned untouched."""
    w, h = im.size
    if w == h:
        return im
    s = min(w, h)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


# THE GROUND IS build_14's paper(), IMPORTED, NOT A SECOND COPY.  It measures
# the white point at the GROUND_PCT-th percentile of the border band rather than
# at its median, which is the only thing that flattens a scanned, textured
# ground (bee-tree) instead of leaving the dark half of its grain behind as a
# soft grey box.  See the note beside paper() in build_14 and the background
# paragraph at the top of this file.
paper = B14.paper


def patch_boxes(slug, size):
    w, h = size
    return [(int(a * w), int(b * h), int(c * w), int(d * h))
            for a, b, c, d in PATCHES.get(slug, [])]


def check_art(slug, im):
    """A patch box must cover ink and be ringed by paper, or it has drifted."""
    bad = []
    grey = im.convert("L")
    for box in patch_boxes(slug, im.size):
        x0, y0, x1, y1 = box
        if grey.crop(box).getextrema()[0] >= 200:
            bad.append("%s: patch box %s covers no ink — it has drifted" % (slug, box))
        p = PATCH_RING_PX
        ring = grey.crop((max(0, x0 - p), max(0, y0 - p),
                          min(im.size[0], x1 + p), min(im.size[1], y1 + p))).copy()
        ring.paste(255, (p, p, p + (x1 - x0), p + (y1 - y0)))
        if ring.getextrema()[0] < 200:
            bad.append("%s: patch box %s has ink within %d px of it — it would "
                       "white out part of the drawing" % (slug, box, p))
    return bad


def prepare(slug):
    """Square, patched, paper-white, ink-TRIMMED JPEG for one card.

    Returns (jpeg path, white point used or None if the border was already
    paper, printed pixel size, trimmed pixel size).
    """
    src = ART_DIR / ("%s.png" % slug)
    if not src.exists():
        raise SystemExit("missing art: %s" % src)
    im = square(Image.open(src).convert("RGB"))
    src_px = im.size[0]
    if src_px < MIN_PX:
        print("  ! %s is only %d px square (want >= %d) — it will print soft"
              % (src.name, src_px, MIN_PX))
    bad = check_art(slug, im)
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    for box in patch_boxes(slug, im.size):
        im.paste((255, 255, 255), box)
    im, wp = paper(im)
    # TRIM LAST, RESAMPLE AFTER THAT.  The ground has to be white before the ink
    # bounding box means anything, and the resolution that counts is the
    # resolution of the art that is printed, not of the white round it.
    was = im.size
    im, _box = B14.trim(im)
    im = B14.for_print(im)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    out = BUILD_DIR / ("%s.jpg" % slug)
    im.save(str(out), "JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0)
    return out, wp, im.size, was


# ----------------------------------------------------------------- type ----
def em(text):
    """Width of `text` in ems of the sentence face — size-independent."""
    return pdfmetrics.stringWidth(text, SENTENCE_FONT, 1000.0) / 1000.0


def content_box(_tier=None):
    """The (width, height) any card's content may use, in mm.

    ONE box for the whole deck now that the whole deck is framed: the card less
    the 10 mm the frame, its hairline and the air inside them take on every
    side.  The give-back is the SAME on all four sides, which is the point of
    it — check() re-derives that rather than trusting this comment.
    """
    return INNER_W, INNER_H


# THE WRAP AND THE SIZE ARE build_14's, imported WHOLE rather than copied: the
# content box is the same 60 x 100, the font is the same Comic Neue, and the two
# Tray 5 decks must set identically or a child moving between them sees two
# different typefaces' worth of difference.  lay_out() sets every sentence at
# the one deck em, puts anything of SHORT_WORDS words or fewer on ONE line, and
# refuses to strand a little word on a line of its own (well_wrapped()).
well_wrapped = B14.well_wrapped
lay_out = B14.lay_out


def metrics(size_mm):
    face = pdfmetrics.getFont(SENTENCE_FONT).face
    return (face.capHeight / 1000.0 * size_mm,
            face.ascent / 1000.0 * size_mm,
            abs(face.descent) / 1000.0 * size_mm)


# ----------------------------------------------------------------- draw ----
def card_xy(col, row):
    """Bottom-left of the card in grid slot (col, row); row 0 is the TOP row."""
    return X0 + col * CARD_W, Y0 + (ROWS - 1 - row) * CARD_H


def draw_frame(c, col, row, tier):
    """The tier frame, drawn identically on the front and on the back.

    It is build_14.frame() — the drawing code is not copied either, only the
    tier colour is chosen here.  Both faces get the same pair of rounded
    rectangles in the same card-local place, so after a short-edge duplex flip
    the two frames sit exactly on top of each other.
    """
    x, y = card_xy(col, row)
    B14.frame(c, x, y, frame_colour(tier))


def draw_front(c, col, row, tier, jpg, px):
    """The picture, trimmed to its ink, fitted in the content box and centred."""
    x, y = card_xy(col, row)
    bw, bh = content_box()
    dw, dh = B14.fitted_mm(px)
    c.drawImage(str(jpg),
                (x + (CARD_W - bw) / 2.0 + (bw - dw) / 2.0) * mm,
                (y + (CARD_H - bh) / 2.0 + (bh - dh) / 2.0) * mm,
                dw * mm, dh * mm)
    draw_frame(c, col, row, tier)


def draw_back(c, col, row, tier, lines, size_mm):
    """The sentence, rotated 180 degrees about the card's centre.

    The rotation is what makes the back read upright once the sheet is flipped
    on its SHORT edge.  Do not remove it without re-reading the duplex note at
    the top of this file.
    """
    x, y = card_xy(col, row)
    draw_frame(c, col, row, tier)
    cap, _asc, _desc = metrics(size_mm)
    n = len(lines)
    c.saveState()
    c.translate((x + CARD_W / 2.0) * mm, (y + CARD_H / 2.0) * mm)
    c.rotate(180)
    c.setFillColor(INK)
    c.setFont(SENTENCE_FONT, size_mm * mm)
    for i, line in enumerate(lines):
        by = ((n - 1) / 2.0 - i) * LINE_H * size_mm - cap / 2.0
        c.drawCentredString(0, by * mm, line)
    c.restoreState()


def grid():
    return CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)


def chrome(c, label, n_cards):
    v, h = grid()
    stats = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
    c.saveState()
    c.setFillColor(LABEL_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(FOOT_X * mm, LABEL_Y * mm, label)
    c.restoreState()
    CM.footer(c, FOOT_X, FOOT_Y, CM.cards_line(n_cards), ADULT_FONT, FOOT_SIZE)
    return stats


# ----------------------------------------------------------- pagination ----
PER_PAGE = COLS * ROWS


def paginate(cards):
    """Pages of at most PER_PAGE cards, ONE TIER TO A PAGE.

    The teacher prints each tier onto its own colour of card stock, so a page
    carrying two tiers is a page he cannot use.  Each tier is therefore filled
    from its own cards only and the last page of a tier is left SHORT rather
    than topped up from the next tier: ten pink cards give three pink pages of
    4 + 4 + 2, and the two blank slots on that third page are the correct
    answer, not a gap to be plugged with a green card.
    """
    pages = []
    for tier in TIER_ORDER:
        group = [card for card in cards if card[1] == tier]
        for i in range(0, len(group), PER_PAGE):
            pages.append(group[i:i + PER_PAGE])
    return pages


def page_tier(slice_):
    """The one tier a page carries.  check_pages() is what guarantees the one."""
    return slice_[0][1]


# ---------------------------------------------------------------- check ----
def check_pages(pages):
    """A page is one tier, no card is lost or printed twice, and the DUPLEX
    registration survives the regrouping.

    The front of page p draws slot (i % COLS, i // COLS) for card i of the
    page, and the back draws (i % COLS, ROWS - 1 - i // COLS) for the SAME
    card i of the SAME page.  A short-edge flip of a portrait sheet is
    (x, y) -> (x, H - y), so the sheet printed at front slot (col, row) comes
    up behind back slot (col, ROWS - 1 - row).  Composing the two must be the
    identity: back slot (col, ROWS - 1 - row) holds card i, which is exactly
    the card the front drew at (col, row).  That is re-derived below from the
    same expressions the drawing loops use, per page, rather than asserted.
    """
    bad = []
    flat = [card for page in pages for card in page]
    if [c[0] for c in flat] != [c[0] for c in CARDS]:
        bad.append("pagination lost, duplicated or re-ordered a card")
    for p, slice_ in enumerate(pages):
        tiers = {tier for _slug, tier, _sent in slice_}
        if len(tiers) != 1:
            bad.append("sheet %d carries %d tiers (%s) — each tier prints on its "
                       "own colour of card stock, so a page may carry only one"
                       % (p + 1, len(tiers),
                          ", ".join(TIER_NAME[t] for t in sorted(tiers))))
        if len(slice_) > PER_PAGE:
            bad.append("sheet %d carries %d cards, over the %d slots"
                       % (p + 1, len(slice_), PER_PAGE))
        # DUPLEX: front slot -> flipped slot -> back slot, and back to the card.
        front = {(i % COLS, i // COLS): slug for i, (slug, _t, _s) in enumerate(slice_)}
        back = {(i % COLS, ROWS - 1 - i // COLS): slug
                for i, (slug, _t, _s) in enumerate(slice_)}
        for (col, row), slug in front.items():
            landed = back.get((col, ROWS - 1 - row))
            if landed != slug:
                bad.append("sheet %d: the picture of %s at slot (%d, %d) is "
                           "backed by %s after the short-edge flip"
                           % (p + 1, slug, col, row, landed or "a blank"))
    # ...and a tier's pages must be consecutive, or the deck is not grouped.
    seen = []
    for slice_ in pages:
        t = page_tier(slice_)
        if not seen or seen[-1] != t:
            seen.append(t)
    if len(seen) != len(set(seen)):
        bad.append("a tier's pages are not consecutive — the deck is not grouped")
    if seen != [t for t in TIER_ORDER if t in seen]:
        bad.append("the tiers are not in tray order, easiest first")
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def check_art_fit(art):
    """No picture may reach the hairline — build_14's assertion, on this deck."""
    bad = []
    for slug, (_jpg, px, _was) in sorted(art.items()):
        dw, dh = B14.fitted_mm(px)
        if dw > INNER_W + 1e-6 or dh > INNER_H + 1e-6:
            bad.append("%s: the picture is drawn %.2f x %.2f mm, over the "
                       "%.0f x %.0f mm content box"
                       % (slug, dw, dh, INNER_W, INNER_H))
        side = (CARD_W - dw) / 2.0
        head = (CARD_H - dh) / 2.0
        if min(side, head) < HAIR_IN + 1e-9:
            bad.append("%s: the picture comes within %.2f mm of the card edge, "
                       "inside the hairline at %.2f mm"
                       % (slug, min(side, head), HAIR_IN))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def check(laid):
    bad = []
    if abs(X0 * 2 + BLOCK_W - PAGE_W) > 1e-9 or abs(Y0 * 2 + BLOCK_H - PAGE_H) > 1e-9:
        bad.append("the block is not centred — duplex registration depends on it")
    if X0 < CM.SAFE + CM.MARK_H or Y0 < CM.SAFE + CM.MARK_H:
        bad.append("the margin cannot hold a triangle outside the safe margin")
    if FOOT_X < CM.SAFE + 8.5:
        bad.append("the footer starts within 14 mm of the page edge")
    v, h = grid()
    for x, _a, _b in v:
        if abs(FOOT_X - x) < 3.0:
            bad.append("adult text starts on a vertical cut line")
    for yy, what in ((LABEL_Y, "label"), (FOOT_Y, "footer")):
        if yy < CM.SAFE or yy > PAGE_H - CM.SAFE:
            bad.append("the %s at y %.1f breaks the safe margin" % (what, yy))
        if any(abs(yy - y) < 3.0 for y, _a, _b in h):
            bad.append("the %s sits on a horizontal cut line" % what)
    if STD_EM_MM > MAX_EM_MM + 1e-9:
        bad.append("the deck em is over the %.1f mm ceiling" % MAX_EM_MM)
    # EVERY CARD HAS A TIER THE DECK KNOWS, and the deck is written in tier
    # order.  A tier with no cards is fine — blue is empty today by fact —
    # but a tier nobody has a colour for is not.
    for slug, tier, _sent in CARDS:
        if tier not in TIER_C:
            bad.append("%s is tier %r, which has no series colour" % (slug, tier))
    order = [tier for _slug, tier, _sent in CARDS]
    if order != sorted(order, key=TIER_ORDER.index):
        bad.append("the deck is not written in tier order, easiest first — "
                   "pagination fills a page from one tier and stops")
    if len({slug for slug, _t, _s in CARDS}) != len(CARDS):
        bad.append("two cards share a slug")
    # The frame's OUTER edge is the outermost scrap of card furniture and must
    # still sit inside the 4 mm the blade is allowed to wander into.
    if FRAME_INSET < CM.CONTENT_CLEAR - 1e-9:
        bad.append("the frame's outer edge breaks the %.1f mm cut clearance"
                   % CM.CONTENT_CLEAR)
    # THE FRAME MUST BE EVEN on all four sides, on every card, at every ring of
    # it — the content box, the hairline and the frame itself.  This is sheet
    # 14's assertion re-derived here rather than assumed from the import.
    for slug, _t, _s, _l, _z in laid:
        bw, bh = content_box()
        left, bottom = (CARD_W - bw) / 2.0, (CARD_H - bh) / 2.0
        right, top_m = CARD_W - bw - left, CARD_H - bh - bottom
        if max(left, right, bottom, top_m) - min(left, right, bottom, top_m) > 1e-9:
            bad.append("%s: the border is not even: margins are %.2f / %.2f / "
                       "%.2f / %.2f mm (left/right/bottom/top)"
                       % (slug, left, right, bottom, top_m))
        if min(left, right, bottom, top_m) < HAIR_IN + CONTENT_PAD - 1e-9:
            bad.append("%s: the content box is %.2f mm off the card edge — it "
                       "overlaps the hairline, which ends at %.2f mm"
                       % (slug, min(left, right, bottom, top_m), HAIR_IN))
        if bw <= 0 or bh <= 0:
            bad.append("%s: the frame leaves no room for content" % slug)
    if HAIR_GAP < HAIR_W:
        bad.append("the hairline sits closer to the frame than its own width")
    if CONTENT_PAD <= 0:
        bad.append("the content touches the hairline")
    if FRAME_R < FRAME_W or HAIR_R < HAIR_W:
        bad.append("a corner radius is smaller than the stroke it rounds")
    if 2 * (FRAME_R + FRAME_INSET) > min(CARD_W, CARD_H):
        bad.append("the corner radius is bigger than the card")
    for slug, _tier, sent, lines, size in laid:
        # ONE EM FOR BOTH DECKS, and SHORT SENTENCES NEVER WRAP.
        if abs(size - STD_EM_MM) > 1e-9:
            bad.append("%s: set at %.2f mm, not the %.2f mm deck em"
                       % (slug, size, STD_EM_MM))
        if (len(sent.split()) <= SHORT_WORDS and len(lines) != 1
                and B14.fits([sent], STD_EM_MM)):
            bad.append("%s: a %d-word sentence that FITS on one line was set on "
                       "%d" % (slug, len(sent.split()), len(lines)))
        box_w, box_h = content_box()
        half_w, half_h = box_w / 2.0, box_h / 2.0
        cap, asc, desc = metrics(size)
        n = len(lines)
        top = ((n - 1) / 2.0) * LINE_H * size - cap / 2.0 + asc
        bot = -((n - 1) / 2.0) * LINE_H * size - cap / 2.0 - desc
        wide = max(em(l) for l in lines) * size
        if wide / 2.0 > half_w + 1e-6:
            bad.append("%s: the sentence is %.2f mm wide, over the %.1f mm "
                       "content width" % (slug, wide, box_w))
        if top > half_h + 1e-6 or -bot > half_h + 1e-6:
            bad.append("%s: the sentence reaches %.2f mm of the card's centre, "
                       "over the %.1f mm half-height" % (slug, max(top, -bot), half_h))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


# ---------------------------------------------------------------- build ----
def build():
    pdfmetrics.registerFont(TTFont(ADULT_FONT, str(FONT_DIR / "Andika-Regular.ttf")))
    pdfmetrics.registerFont(
        TTFont(SENTENCE_FONT, str(FONT_DIR / "ComicNeue-Regular.ttf")))

    laid = [(slug, tier, sent) + lay_out(sent) for slug, tier, sent in CARDS]
    check(laid)

    art = {}
    lifts, patched = [], []
    for slug, _tier, _sent in CARDS:
        jpg, wp, px, was = prepare(slug)
        art[slug] = (jpg, px, was)
        if wp is not None:
            lifts.append((slug, wp))
        if slug in PATCHES:
            patched.append(slug)
    check_art_fit(art)

    # ONE TIER TO A PAGE.  check_pages() re-derives, page by page, both that
    # the page is single-tier and that every sentence back still lands behind
    # its own picture front after the regrouping.
    pages = paginate(CARDS)
    check_pages(pages)
    n_sheets = len(pages)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Writing Shelf · story starter cards")
    by_slug = {slug: (lines, size) for slug, _t, _s, lines, size in laid}
    stats = None
    for p, slice_ in enumerate(pages):
        # The page is ONE tier and the header says which, on both faces, in
        # sheet 14's wording — the teacher prints this page onto that colour.
        name = TIER_NAME[page_tier(slice_)]
        # FRONT — the picture.  Index i sits at (col i % COLS, row i // COLS).
        for i, (slug, tier, _sent) in enumerate(slice_):
            jpg, px, _was = art[slug]
            draw_front(c, i % COLS, i // COLS, tier, jpg, px)
        stats = chrome(c, "story starter cards · %s · picture side · sheet %d "
                          "of %d" % (name, p + 1, n_sheets), len(slice_))
        c.showPage()
        # BACK — the sentence, in the slot the short-edge flip puts behind it.
        for i, (slug, tier, _sent) in enumerate(slice_):
            col, row = i % COLS, i // COLS
            lines, size = by_slug[slug]
            draw_back(c, col, ROWS - 1 - row, tier, lines, size)
        chrome(c, "story starter cards · %s · sentence side · sheet %d of %d — "
                  "print duplex, flip on SHORT edge" % (name, p + 1, n_sheets),
               len(slice_))
        c.showPage()
    c.save()

    blanks = n_sheets * COLS * ROWS - len(CARDS)
    v, h = grid()
    print("story starter cards -> %s" % OUT_DIR)
    print("  printed card %.0f x %.0f mm  ->  mounted on backing card %.0f x %.0f mm"
          % (CARD_W, CARD_H, CARD_W + 20, CARD_H + 20))
    print("  block %.0f x %.0f butted, centred: margins %.1f mm side, %.1f mm "
          "head/foot; frame area %.0f x %.0f, content box %.0f x %.0f"
          % (BLOCK_W, BLOCK_H, X0, Y0, FIT_W, FIT_H, INNER_W, INNER_H))
    print("  %-30s %d pp (%d sheets duplex, SHORT edge) · %d cards + %d blanks · "
          "%d cut lines, %d triangles · %.0f KB"
          % (NAME, n_sheets * 2, n_sheets, len(CARDS), blanks,
             len(v) + len(h), stats["marks"], out.stat().st_size / 1024.0))
    print("      picture TRIMMED to its ink (+%.0f%% breathing margin), fitted "
          "in the whole %.0f x %.0f mm content box and centred on the ink"
          % (B14.BREATHE * 100, INNER_W, INNER_H))
    print("      EVERY card framed on BOTH faces: %.1f mm rounded frame (r %.1f mm "
          "outer) %.1f mm off the cut + %.1f mm hairline %.1f mm inside it; "
          "content box %.0f x %.0f at %.1f mm inset, even on all four sides"
          % (FRAME_W, FRAME_R, FRAME_INSET, HAIR_W, HAIR_GAP,
             INNER_W, INNER_H, INNER_INSET))
    counts = {t: sum(1 for _s, tier, _x in CARDS if tier == t) for t in TIER_ORDER}
    print("      frame colour IS the tier, sheet 14's three imported: pink "
          "#D45B86 x%d, blue #2F5FA6 x%d, green #2F7D4F x%d"
          % (counts[1], counts[2], counts[3]))
    print("      ONE TIER TO A PAGE — %s; print each on its tier's card stock"
          % "; ".join("sheet %d = %s x%d" % (i + 1, TIER_NAME[page_tier(sl)], len(sl))
                      for i, sl in enumerate(pages)))
    wrapped = [(slug, lines) for slug, _t, _s, lines, _z in laid if len(lines) > 1]
    print("      sentence Comic Neue at ONE deck em %.2f mm (cap %.2f mm) on "
          "every card, %d-%d lines; <= %d words stays on one line wherever it "
          "fits — build_14's STD_EM_MM, shared by both Tray 5 decks"
          % (STD_EM_MM, metrics(STD_EM_MM)[0],
             min(len(l) for _a, _b, _c, l, _d in laid),
             max(len(l) for _a, _b, _c, l, _d in laid), SHORT_WORDS))
    print("      headroom %.2f mm on this sheet's wraps; %d of %d wrap: %s"
          % (B14.ceiling([l for _a, _b, _c, l, _d in laid]), len(wrapped), len(laid),
             "; ".join("%s = %s" % (a, " / ".join(b)) for a, b in wrapped) or "none"))
    if patched:
        print("      generator glyph whited out on: %s" % ", ".join(patched))
    print("      ground: %d of %d already paper, %d white-pointed by build_14's "
          "paper() at the %dth percentile of the border (never the median — a "
          "scanned grain has to be clipped from BELOW)"
          % (len(CARDS) - len(lifts), len(CARDS), len(lifts), GROUND_PCT))
    for slug, wp in lifts:
        print("      white point %s on %s"
              % (tuple(int(w) for w in wp), slug))
    soft = []
    for slug, tier, sent, lines, size in laid:
        _jpg, px, was = art[slug]
        dw, dh = B14.fitted_mm(px)
        dpi = B14.art_dpi(px)
        if dpi < B14.SOFT_DPI:
            soft.append((slug, dpi))
        print("      %-13s %-6s %-16s %-9s %5.1f x %5.1f mm %4.0f dpi  %s"
              % (slug, TIER_NAME[tier], sent, "%dx%d" % px, dw, dh, dpi,
                 " / ".join(lines)))
    if soft:
        print("  ! %d card(s) print under %d dpi because trimming enlarged a "
              "subject that was a small part of its file: %s"
              % (len(soft), B14.SOFT_DPI,
                 ", ".join("%s %.0f" % (a, b) for a, b in soft)))


if __name__ == "__main__":
    build()
