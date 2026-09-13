#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 14, the Tray 5 ILLUSTRATED SENTENCE CARDS

Sheet 12 gave Tray 5 its tin of loose words.  Sheet 13 gave it a picture to
react to, with the sentence hidden on the back as the control of error.  This
sheet is the step BETWEEN the two: the same picture-then-words card, but graded
into three reading tiers so a child picks his own level off the tray.  He meets
the PICTURE, says what he sees, builds that out of the tin — and then TURNS THE
CARD OVER and reads the line printed on the back, which is the control of error.
Three works, one card.

THE SENTENCE IS ON THE BACK, NOT UNDER THE PICTURE.  It used to be on the same
face, and that is what the teacher sent the proofs back for (2026-09-12): a
picture with its words beside it is a LABEL, and a child reads the words and
stops looking.  Front = the picture and nothing else; back = the sentence and
nothing else.  That is the Montessori three-part card, and it is sheet 13's
structure exactly, which is why the registration below is sheet 13's too.

THREE TIERS, AND THE COLOUR IS THE TIER.  This is not a new invention — it is
the Montessori Pink, Blue and Green reading series, which is what the tiers ARE:

  tier 1 · PINK    pure three-letter CVC         the cat sat / a pig in a wig
  tier 2 · BLUE    four-letter words             the ant naps / the cat digs
  tier 3 · GREEN   consonant blends              the star sat / the crab sat

THE COLOUR IS THE DIFFICULTY OF THE WORDS, NOT THE GROUP THE CARD SITS IN, and
on one card those differ.  "a fox in a box" is a THREE-LETTER CVC sentence — it
is pink work — but the teacher asked for one already-known card at the head of
the harder tray, for familiarity, and fox-in-a-box is that card.  So it keeps
its POSITION in the blue group and its PINK FRAME (2026-09-13).  A pink card at
the head of the blue tray says "you already know this one"; painting it blue
would claim a difficulty the words do not have, and would print the same two
words in two different colours across the two Tray 5 decks, since sheet 13
frames fox/box pink.  The carry is meant to be VISIBLE, not disguised.  It is
recorded in the DATA, as the fifth field of the card and as `carriedFrom` in
writing-shelf-language.ts, so no later session "corrects" it back.

So the card carries NO written difficulty label, in the same way a pink-series
card has never had "pink series" printed on it.  ONE EVEN COLOUR FRAME round
the content, the SAME on both faces and the same width on all four sides, is the
whole signal.  There is no colour bar any more: the 8 mm solid bar that used to
run along the top of the card was the top of the border, and on the printed
proof it read — correctly — as a border thicker on one side than the others.

THE FRAME IS A DESIGNED FRAME, NOT A LINE SOMEONE DREW.  Teacher review of the
second round of proofs, 2026-09-12: the 1.5 mm square-cornered rule read as
cheap — "a line someone drew", a thin rectangle floating in a large white
margin.  It is now a ROUNDED frame: 5 mm outer corner radius, 2.6 mm of stroke,
its OUTER edge 4 mm off the cut line on all four sides so the bleed the blade
works into is even the whole way round.  2.2 mm inside it runs a 0.4 mm HAIRLINE
of the same colour, cornered to match.  The double rule is the playing-card and
certificate cue and it is the whole of the premium; it is deliberately faint,
and at this scale it must stay faint or the card goes muddy.  Content sits
0.8 mm inside the hairline, square on all four sides, in a 60 x 100 mm box.
The backing card matters here more than anywhere else in the set: mount tier 1
on PINK, tier 2 on BLUE and tier 3 on GREEN card and the tray sorts itself —
BY THE FRAME COLOUR, so the one carried card is mounted on PINK and sits at the
front of the blue stack.

TIER 3 IS ONE BLEND A CARD, and the blend is the whole reason the card exists:
st (star), sp (spat), bl (blob), cr (crab), nd (sand), mp (jump).  All six are
drawn; the tier is complete.

ADULT TEXT STAYS OFF THE CARD, per the set's rule.  The tier, the sheet number
and the cutting line all live in the margin, outside every cut line.

SIZE IS THE FLIP-CARD SIZE, NOT A NEW ONE.  80 x 120 mm printed, mounted on a
coloured backing card with a 1 cm border, finishing at 100 x 140 — sheets 02,
03 and 13's card and his 100 mm card stands (CLAUDE.md, "WRITING SHELF PRINT
RULES — LOCKED", rule 2).  Four butt into a 160 x 240 block centred on A4:
25 mm side margins, 28.5 mm head and foot, exactly build_13's.

DUPLEX: SHORT EDGE, and the registration is build_13's, constant for constant.
Short-edge flip of a portrait sheet is (x, y) -> (x, H - y): top and bottom
swap, left and right do not.  So the card printed at front (col c, row r) is
backed by the card printed at back (col c, ROWS - 1 - r) — the back grid is the
front grid mirrored top to bottom — and because the flip turns the sheet about
a horizontal axis, each back is drawn ROTATED 180 degrees in the back page's
own frame so that it reads upright once flipped.  The block is centred on the
page and check() refuses to build if it is not, because that centring is what
makes the front and back grids land on each other.  ONE GROUP TO A PRINTED PAGE (2026-09-13).  Tiers used to run straight on
through the sheets — sheet 2 carried tier 1's last two and tier 2's first two —
on the reasoning that a colour sorts the cards after cutting better than a page
break does before it.  That was wrong about how the sheet is USED: the teacher
prints each tier onto its own colour of card stock, so a page carrying two
groups has to be cut in half and run twice, which is not a printable page.  Each
group now starts a fresh sheet and its last sheet is left SHORT rather than
topped up from the next.  Six cards a group is 4 + 2, so eighteen cards are SIX
sheets = twelve pages, each group taking two, with two blank slots at the end of
each group — six blanks, all deliberate.  build_13 imposes identically.

THE ART IS ALMOST ALL REUSED.  Fifteen of the eighteen come from work the repo
already holds: the Dark Phonics picture books (the-sat's flashcard tiles, the-
sad, the-hot, the-nap, the-dig, the-spat), the satpin-v2 story starters, the
satpin-v2 CVC set (w08-sand), and fox-box, which is the same drawing sheet 13
already prints.  The only three drawn for the set are tier 3's blob, crab and
jump, in phonics-images/satpin-v2/blends/.  Sources are always the FULL-
RESOLUTION originals (1024 px square, or the 1344 x 896 SAT and CVC tiles),
never the downscaled web copies under public/ — those are 700 px and are the
app's, not the printer's.

THE ART IS TRIMMED TO ITS OWN INK AND THEN FILLS THE BOX.  Teacher review of
the second round of proofs, 2026-09-12: the pictures sat as small squares
floating in the middle of the card with dead white above and below them.  Two
things were shrinking the subject at once — the art was fitted into a 60 mm
SQUARE inside a 60 x 100 portrait box, and the source PNGs carry generous white
margins of their own, so the drawing shrank twice.  trim() now measures the ink
bounding box of the white-grounded picture, crops to it, gives back an even
BREATHE margin of white on all four sides, and the result is FITTED into the
whole 60 x 100 content box, aspect preserved, and centred.  The source files are
never touched: the trim happens at build time on the copy in .build/.

Centring is on the INK, not on the file, which is the other half of the same
fix: art with more white below it than above used to print visibly low in the
card, and after the trim there is no margin left to be lopsided.

ASPECT RATIO IS PRESERVED, which matters more now that the box is portrait: the
four SAT tiles are 3:2 landscape and centre-cropping one to a square would cut
the mound out from under the sun.  The ground is white, so what letterboxing is
left is invisible.

BACKGROUNDS ARE LIFTED TO PAPER WHITE by ground()/whiten(), build_13's, constant
for constant: a tinted square on a white card prints as a visible rectangle
with a visible edge, which is the one thing a picture card must not have.

ONE EM FOR THE WHOLE DECK, AND SHORT SENTENCES NEVER WRAP.  Teacher review of
the second proofs again: "the cat sat" and "the ant sat" set on one line and
"the sun sat" — the same eleven characters — wrapped to two and came out
visibly smaller, because the old wrap took whatever size each sentence happened
to be able to reach.  Cards of the same shape must look the same, so the size is
no longer a per-card result: STD_EM_MM is the deck's ONE em and every sentence
on both Tray 5 sheets is set at it.  A sentence of SHORT_WORDS words or fewer
always sets on ONE line; a longer one takes the fewest lines that fit AT THAT
SAME SIZE, so it steps down in line count and never by a hair of type size.
The em is the largest at which every card in both decks still fits, and check()
refuses to build if a card overflows it.

THE SENTENCE is set in COMIC NEUE and written ALL IN LOWER CASE, both off the
same teacher review.  Lower case because these are the literal words a child
says about the picture — "the cat sat", not "The cat sat" — and the capital and
the full stop are his to add with a punctuation tile.  Comic Neue because it is
the free SIL-OFL face metrically similar to Comic Sans MS, which is Microsoft-
licensed and cannot be embedded in a PDF this shelf ships.  Adult text in the
margin is still Andika.  The line is wrapped by build_13's lay_out() to
whichever number of lines lets it be biggest in the 64 x 104 mm back.

THE CARDS ARE NOT LISTED TWICE.  lib/montree/dark-phonics/writing-shelf-
language.ts is the one source: its SENTENCE_BUILDER_CARDS carries the slug, the
tier, the sentence and the print-art path, and check_source() below parses that
file and refuses to build if this script has drifted from it.

Run:   python3 scripts/curriculum/writing-shelf/build_14_sentence_builder_cards.py
Check: pdftoppm -png -r 60 public/dark-phonics-shelf/v2/14-sentence-builder-cards.pdf /tmp/s
Needs: reportlab, Pillow
"""

import re
import statistics
from itertools import combinations
from pathlib import Path

from PIL import Image
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
BUILD_DIR = HERE / ".build" / "sentence-builder"
SOURCE_TS = REPO / "lib" / "montree" / "dark-phonics" / "writing-shelf-language.ts"
NAME = "14-sentence-builder-cards.pdf"

PAGE_W, PAGE_H = 210.0, 297.0          # exact A4 portrait
CARD_W, CARD_H = 80.0, 120.0           # PRINTED; mounted it is 100 x 140
COLS, ROWS = 2, 2

BLOCK_W, BLOCK_H = COLS * CARD_W, ROWS * CARD_H        # 160 x 240
X0 = (PAGE_W - BLOCK_W) / 2.0                          # 25.0
Y0 = (PAGE_H - BLOCK_H) / 2.0                          # 28.5

FIT_W = CARD_W - 2 * CM.CONTENT_CLEAR                  # 72 mm
FIT_H = CARD_H - 2 * CM.CONTENT_CLEAR                  # 112 mm

# ------------------------------------------------------------- THE FRAME ----
# ONE piece of card furniture, the same on all four sides and on both faces: a
# ROUNDED DOUBLE FRAME in the tier colour.  Every number below is a millimetre
# measured inward from the CUT LINE, so "even on all four sides" is a property
# of the arithmetic and not of the drawing code, and check() re-derives it.
#
#   0.0   the cut line
#   4.0   FRAME_INSET   outer edge of the thick frame  — the bleed for the blade
#   6.6   FRAME_IN      inner edge of the thick frame  (4.0 + 2.6 of stroke)
#   8.8   HAIR_OUT      outer edge of the hairline     (6.6 + 2.2 of air)
#   9.2   HAIR_IN       inner edge of the hairline     (8.8 + 0.4 of stroke)
#  10.0   INNER_INSET   the content box                (9.2 + 0.8 of air)
#
# The thick frame is 2.6 mm because 1.5 mm printed as a timid line in a wide
# white margin; the corners are rounded because a square-cornered rectangle on
# a laminated card reads as a box drawn round the picture rather than as the
# edge of a designed card.  FRAME_R and HAIR_R are OUTER radii — the radius a
# ruler would measure on the printed sheet — and the drawing code takes half a
# stroke off each to get the path radius, because reportlab strokes centred.
FRAME_INSET = 4.0                      # mm — outer edge of the frame off the cut
FRAME_W = 2.6                          # mm — the frame stroke
FRAME_R = 5.0                          # mm — OUTER corner radius of the frame
HAIR_GAP = 2.2                         # mm — air between the frame and the hairline
HAIR_W = 0.4                           # mm — the inner rule: subtle, or it muddies
HAIR_R = FRAME_R - FRAME_W             # 2.4 mm — OUTER corner radius of the hairline
CONTENT_PAD = 0.8                      # mm — optical air inside the hairline

FRAME_IN = FRAME_INSET + FRAME_W                       # 6.6
HAIR_OUT = FRAME_IN + HAIR_GAP                         # 8.8
HAIR_IN = HAIR_OUT + HAIR_W                            # 9.2

# THE INNER BOX, and it is the SAME box on both faces of the card.  ONE inset,
# off all four edges of the card, so the frame reads as one even frame however
# the card is turned.  Content coordinates are card-local, from the card's
# bottom-left corner.
INNER_INSET = HAIR_IN + CONTENT_PAD                    # 10.0 mm, all four sides
INNER_X = INNER_INSET                                  # 10.0
INNER_Y = INNER_INSET                                  # 10.0
INNER_W = CARD_W - 2 * INNER_INSET                     # 60.0
INNER_H = CARD_H - 2 * INNER_INSET                     # 100.0

# THE PICTURE HAS THE WHOLE FACE.  It used to share the card with the sentence
# and was squeezed to 58 mm to leave the words 30.5 mm; the sentence is on the
# back, so the picture gets the full inner width and is fitted inside a
# 60 x 60 box centred in the inner height.  The thicker frame and the hairline
# cost it 4 mm off the 64 mm it had — 6 % of a dimension, which is under what
# the eye reads as a smaller picture, and the frame buys far more than it costs.
# THE PICTURE BOX IS THE WHOLE CONTENT BOX — 60 x 100, not a 60 mm square in
# it.  The art is trimmed to its ink first (see trim()) and then fitted into
# this box with its aspect preserved and centred, so a portrait drawing is
# allowed to be 100 mm tall and a landscape one 60 mm wide.

# The sentence has the whole BACK: 60 x 100.  13 mm of em is an 8.7 mm cap
# height in Comic Neue — four times the cap height of a reading book — and it
# is sheet 13's ceiling, so the two Tray 5 card sets read at the same size.
MAX_EM_MM = 13.0
LINE_H = 1.25
MAX_LINES = 3

# THE DECK EM.  One size for every sentence on sheets 13 and 14, so two cards of
# the same shape can never come out different sizes.
#
# A sentence of SHORT_WORDS words or fewer sets on ONE line WHEREVER IT FITS,
# and that "wherever it fits" is the whole of the second thought about this
# number.  Holding every three-word sentence to one line without exception
# means the deck em is whatever the longest of them allows, and the longest is
# "the penguin spat" at 8.40 mm — which put a small line of type in the middle
# of a large white card, too timid to be read at arm's length by the five-year-
# old it is for, and wasted the frame.  Letting that ONE card wrap to "the
# penguin / spat" costs one card on one green sheet and buys 30 % bigger
# letterforms on every other card in both decks.  So the em is 10.90 mm — a
# 7.30 mm cap height, three times the cap height of a reading book — which is
# what the next-longest one-liner ("sheep asleep", on sheet 13) allows, and
# every build prints both that ceiling and the em at which nothing would wrap.
# check() refuses to build if a card overflows, or if a short sentence wrapped
# when it did not have to.
SHORT_WORDS = 3                        # this many words or fewer stays on one line...
STD_EM_MM = 10.90                      # mm — ...unless it will not fit at THE deck em

# THE SENTENCE FACE IS COMIC NEUE — see build_13, which took the same note off
# the same printed proofs.  Free, SIL-OFL, metrically similar to Comic Sans MS
# (Microsoft-licensed, not embeddable in a PDF the shelf ships), single-storey
# a and g.  public/fonts/ComicNeue-Regular.ttf, licence beside it.  ADULT TEXT
# IN THE MARGIN STAYS ANDIKA.
SENTENCE_FONT = "ComicNeue"
ADULT_FONT = "Andika"

FOOT_SIZE = 5.5
FOOT_X, FOOT_Y = 30.0, 13.0            # build_flip_cards.py's footer, exactly
LABEL_Y = 277.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)               # #5F594F, adult-text grey
INK = CM.MARK_C                                        # #141110

# The three series colours.  Deep enough to read as pink, blue and green at a
# glance on white card under classroom light, and to be matched by ordinary
# craft card.  The green is the same value as the blue, a tone darker than the
# pink, so no one tier shouts across the tray.
PINK_C = Color(0.8314, 0.3569, 0.5255)                # #D45B86
BLUE_C = Color(0.1843, 0.3725, 0.6510)                # #2F5FA6
GREEN_C = Color(0.1843, 0.4902, 0.3098)               # #2F7D4F
TIER_C = {1: PINK_C, 2: BLUE_C, 3: GREEN_C}
TIER_NAME = {1: "pink", 2: "blue", 3: "green"}

JPEG_QUALITY = 90
MIN_PX = 896
PRINT_DPI = 300                        # resample so the art lands at 300 dpi
SOFT_DPI = 250                         # under this the build warns; it never upscales
WHITE_AT = 249                         # at or above this, it is paper
# TRIM.  whiten()/paper() flattens everything at or above WHITE_AT to pure
# paper, so a pixel BELOW it is, by construction, something the artist drew —
# soft pencil shading and a light watercolour wash included.  That is the
# threshold the ink bounding box is measured at: nothing that survived the
# white point is clipped by the trim.
INK_AT = WHITE_AT                      # below this it is drawing, not paper
BREATHE = 0.02                         # of the trimmed long side, given back
# ...and the box is taken by INK WEIGHT, not by the outermost stray pixel.  A
# plain bounding box is decided by whichever single faintest wisp reaches
# furthest out, and on the SAT tiles that is the far tip of a ground scribble
# that fades to nothing: the box came out 1225 px wide round a cat 810 px wide,
# and the cat printed small with the card's whole height empty under it.  So the
# box is the one holding all but TRIM_TAIL of the drawing's ink WEIGHT at each
# of the four edges.  Weight, not count, is what keeps soft pencil shading and a
# light wash: a wash carries real weight over its area and is inside the box,
# while the last 0.2 % at the tip of a fading scribble is not.
TRIM_TAIL = 0.002                      # of the ink weight let go at each edge
TRIM_BANDS = 32                        # rows/columns the profile is summed over
GROUND_BAND = 8                        # px of border measured for the ground
GROUND_WHITE = 252                     # border median at or above this: already paper
GROUND_PCT = 5                         # white point percentile of the border band
GROUND_FLOOR = 200                     # never white-point below this


# ---------------------------------------------------------------- cards ----
# slug, GROUP tier, sentence, print art (repo-relative), FRAME tier.  The frame
# tier is the difficulty of the WORDS and is the same as the group tier on every
# card but the one carried card — see the docstring.  MUST match
# SENTENCE_BUILDER_CARDS in writing-shelf-language.ts — check_source() enforces
# it, so edit the TypeScript and then mirror it here, never the other way.
TILES = "scripts/curriculum/flashcards/tiles"
BOOKS = "phonics-images/dark-phonics-books"
STARTERS = "phonics-images/satpin-v2/story-starters"
SPAT = "phonics-images/satpin-v2/books/the-spat"
BLENDS = "phonics-images/satpin-v2/blends"
CVC = "phonics-images/satpin-v2/cvc/w08"

CARDS = [
    ("cat-sat",  1, "the cat sat",    "%s/SAT-p6.png" % TILES, 1),
    ("ant-sat",  1, "the ant sat",    "%s/SAT-p1.png" % TILES, 1),
    ("sun-sat",  1, "the sun sat",    "%s/SAT-p4.png" % TILES, 1),
    ("ant-sad",  1, "the ant is sad", "%s/the-sad/p1-ant.png" % BOOKS, 1),
    ("ant-hot",  1, "the ant is hot", "%s/the-hot/p1-ant.png" % BOOKS, 1),
    ("pig-wig",  1, "a pig in a wig", "%s/pig-wig.png" % STARTERS, 1),
    # THE CARRIED CARD: pink words, blue position, PINK FRAME.  Deliberate —
    # do not "tidy" the 1 to a 2.  writing-shelf-language.ts carries the same
    # fact as card(..., carriedFrom: 1) and check_source() enforces the pair.
    ("fox-box",  2, "a fox in a box", "%s/fox-box.png" % STARTERS, 1),
    ("ant-naps", 2, "the ant naps",   "%s/the-nap/p1-ant.png" % BOOKS, 2),
    ("ant-digs", 2, "the ant digs",   "%s/the-dig/p1-ant.png" % BOOKS, 2),
    ("cat-naps", 2, "the cat naps",   "%s/the-nap/p6-cat.png" % BOOKS, 2),
    ("cat-digs", 2, "the cat digs",   "%s/the-dig/p6-cat.png" % BOOKS, 2),
    ("sun-naps", 2, "the sun naps",   "%s/the-nap/p3-sun.png" % BOOKS, 2),
    # tier 3 · green · consonant blends, one blend a card.  COMPLETE at six:
    # the sixth (mp, "the cat can jump") landed with its drawing 2026-09-12.
    ("star-sat",     3, "the star sat",     "%s/SAT-p5.png" % TILES, 3),
    ("penguin-spat", 3, "the penguin spat", "%s/spat-p2.png" % SPAT, 3),
    ("blob-sat",     3, "the blob sat",     "%s/blob.png" % BLENDS, 3),
    ("crab-sat",     3, "the crab sat",     "%s/crab.png" % BLENDS, 3),
    ("dad-sand",     3, "the sad dad sat in the sand", "%s/w08-sand.png" % CVC, 3),
    ("cat-jump",     3, "the cat can jump", "%s/jump.png" % BLENDS, 3),
]


# ----------------------------------------------------------- pagination ----
PER_PAGE = COLS * ROWS
TIER_ORDER = (1, 2, 3)                 # easiest first, on the tray and on the page


def paginate(cards):
    """Pages of at most PER_PAGE cards, ONE GROUP TO A PAGE.

    The teacher prints each tier onto its own colour of card stock, so a page
    carrying two groups is a page he has to cut in half and run twice.  Each
    group is therefore filled from its own cards only and its last page is left
    SHORT rather than topped up from the next: six cards a group is 4 + 2, so
    the deck is six pages of 4 + 2 + 4 + 2 + 4 + 2 with two blank slots at the
    end of each group.  Those six blanks are the correct answer, not a gap to
    plug with a card from the next group.  This is build_13's paginate(), and
    the two decks impose alike.
    """
    pages = []
    for tier in TIER_ORDER:
        group = [card for card in cards if card[1] == tier]
        for i in range(0, len(group), PER_PAGE):
            pages.append(group[i:i + PER_PAGE])
    return pages


def page_tier(slice_):
    """The one GROUP a page carries.  check_pages() guarantees the one."""
    return slice_[0][1]


# THE CARRIED CARDS, derived from the data and never hand-listed: a card whose
# FRAME tier is easier than the GROUP tier it sits in.  It is a deliberate,
# named exception — an already-known card at the head of a harder group, for
# familiarity — and check() below allows exactly these and nothing else.
CARRIED = {slug: (tier, frame) for slug, tier, _s, _a, frame in CARDS
           if frame != tier}


def check_pages(pages):
    """A page is one GROUP, no card is lost or printed twice, and the DUPLEX
    registration survives the grouping.

    The front of page p draws slot (i % COLS, i // COLS) for card i of the
    page, and the back draws (i % COLS, ROWS - 1 - i // COLS) for the SAME card
    i of the SAME page.  A short-edge flip of a portrait sheet is
    (x, y) -> (x, H - y), so the sheet printed at front slot (col, row) comes
    up behind back slot (col, ROWS - 1 - row).  Composing the two must be the
    identity, and that is re-derived below per page from the same expressions
    the drawing loops use rather than asserted.

    THE PAGE IS ONE GROUP, NOT ONE COLOUR.  A CARRIED card keeps its own,
    easier frame inside the group it sits in — that is the whole point of it —
    so exactly the slugs in CARRIED may show a frame that is not the page's
    group colour, and nothing else may.
    """
    bad = []
    flat = [card for page in pages for card in page]
    if [c[0] for c in flat] != [c[0] for c in CARDS]:
        bad.append("pagination lost, duplicated or re-ordered a card")
    for p, slice_ in enumerate(pages):
        groups = {tier for _s, tier, _x, _y, _f in slice_}
        if len(groups) != 1:
            bad.append("sheet %d carries %d groups (%s) — each group prints on "
                       "its own colour of card stock, so a page may carry only "
                       "one" % (p + 1, len(groups),
                                ", ".join(TIER_NAME[t] for t in sorted(groups))))
        if len(slice_) > PER_PAGE:
            bad.append("sheet %d carries %d cards, over the %d slots"
                       % (p + 1, len(slice_), PER_PAGE))
        for slug, tier, _sent, _rel, frame in slice_:
            if frame != tier and slug not in CARRIED:
                bad.append("sheet %d: %s is framed %s on a %s page and is not a "
                           "declared carry" % (p + 1, slug, TIER_NAME.get(frame),
                                               TIER_NAME[tier]))
        front = {(i % COLS, i // COLS): slug
                 for i, (slug, _t, _s, _r, _f) in enumerate(slice_)}
        back = {(i % COLS, ROWS - 1 - i // COLS): slug
                for i, (slug, _t, _s, _r, _f) in enumerate(slice_)}
        for (col, row), slug in front.items():
            landed = back.get((col, ROWS - 1 - row))
            if landed != slug:
                bad.append("sheet %d: the picture of %s at slot (%d, %d) is "
                           "backed by %s after the short-edge flip"
                           % (p + 1, slug, col, row, landed or "a blank"))
    seen = []
    for slice_ in pages:
        t = page_tier(slice_)
        if not seen or seen[-1] != t:
            seen.append(t)
    if len(seen) != len(set(seen)):
        bad.append("a group's pages are not consecutive — the deck is not grouped")
    if seen != [t for t in TIER_ORDER if t in seen]:
        bad.append("the groups are not in tray order, easiest first")
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def check_art_fit(art):
    """No picture may reach the hairline.

    Every picture is fitted into the content box, so this cannot fail by
    arithmetic — which is exactly why it is worth asserting: it is the one line
    that would catch a future change to the fitting.  The margin from the CARD
    EDGE to the drawn picture must be at least INNER_INSET on all four sides,
    and the hairline's inner edge is HAIR_IN, inside it.
    """
    bad = []
    for slug, (_jpg, px, _was) in sorted(art.items()):
        dw, dh = fitted_mm(px)
        if dw > INNER_W + 1e-6 or dh > INNER_H + 1e-6:
            bad.append("%s: the picture is drawn %.2f x %.2f mm, over the "
                       "%.0f x %.0f mm content box" % (slug, dw, dh, INNER_W, INNER_H))
        side = INNER_X + (INNER_W - dw) / 2.0
        head = INNER_Y + (INNER_H - dh) / 2.0
        if min(side, head) < HAIR_IN + 1e-9:
            bad.append("%s: the picture comes within %.2f mm of the card edge, "
                       "inside the hairline at %.2f mm" % (slug, min(side, head), HAIR_IN))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


def check_source():
    """Refuse to build if this table has drifted from the TypeScript one."""
    src = SOURCE_TS.read_text(encoding="utf-8")
    # Anchor on the DECLARATIONS, not the names: both are also mentioned in the
    # file's doc comments, which sit above the array and would slice it away.
    start = src.index("export const SENTENCE_BUILDER_CARDS")
    end = src.index("export const SENTENCE_BUILDER_GAPS", start)
    block = src[start:end]
    subs = {"${PAGES}": "", "${BOOKS}": BOOKS, "${STARTERS}": STARTERS,
            "${TILES}": TILES, "${SPAT}": SPAT, "${BLENDS}": BLENDS,
            "${CVC}": CVC}
    found = []
    # The optional SIXTH argument of card() is carriedFrom — the card's own,
    # easier tier when it has been carried up into a harder group.  Absent on
    # every ordinary card, where the frame tier IS the group tier.
    for m in re.finditer(
        r"card\(\s*'([\w-]+)'\s*,\s*(\d)\s*,\s*'([^']*)'\s*,\s*[`']([^`']*)[`']"
        r"\s*,\s*[`']([^`']*)[`'](?:\s*,\s*(\d))?\s*\)",
        block,
    ):
        slug, tier, sentence, _web, art, carried_from = m.groups()
        for k, v in subs.items():
            art = art.replace(k, v)
        found.append((slug, int(tier), sentence, art,
                      int(carried_from) if carried_from else int(tier)))
    if found != CARDS:
        only_ts = [c for c in found if c not in CARDS]
        only_py = [c for c in CARDS if c not in found]
        raise SystemExit(
            "SPEC FAILURE: this script and SENTENCE_BUILDER_CARDS disagree.\n"
            "  parsed %d card(s) from %s\n"
            "  only in the TypeScript: %s\n"
            "  only in this script:    %s"
            % (len(found), SOURCE_TS.name, only_ts or "none", only_py or "none")
        )
    return len(found)


# ------------------------------------------------------------------ art ----
def band_values(im, band=GROUND_BAND):
    """Every pixel of the border ring, per channel, sorted. This is the paper."""
    w, h = im.size
    px = im.load()
    step = max(1, w // 256)
    vals = ([], [], [])
    edge_y = list(range(band)) + list(range(h - band, h))
    edge_x = list(range(band)) + list(range(w - band, w))
    for x in range(0, w, step):
        for y in edge_y:
            p = px[x, y]
            for k in range(3):
                vals[k].append(p[k])
    for y in range(0, h, step):
        for x in edge_x:
            p = px[x, y]
            for k in range(3):
                vals[k].append(p[k])
    return [sorted(v) for v in vals]


def pct(sorted_vals, t):
    return sorted_vals[min(len(sorted_vals) - 1, int(len(sorted_vals) * t / 100.0))]


def paper(im):
    """Put this drawing on paper white, measuring the white point off its own
    border.  Returns (image, white point per channel or None if already paper).

    THIS IS NOT build_13's whiten(), and the difference is the whole reason the
    sheet needed its own.  build_13 scales by the MEDIAN of the border: right
    for its fourteen story starters, which are generated art on a flat ground.
    Three of the eighteen here are not flat — the-nap's ant and sun are drawn on
    a SCANNED textured sheet whose grain runs 211-250 in a single picture.
    Scaling that by its median puts the middle of the grain at paper white and
    leaves the dark half of it below, and the picture prints as exactly the
    grey rectangle with a visible edge a picture card must never have.

    So the white point is taken BELOW the grain, at the 5th percentile of the
    border band, and everything above it clips to paper.  Art that reaches the
    border pulls that percentile down, so it is floored at GROUND_FLOOR and the
    build reports every white point it used.  A border that is already paper
    (median >= GROUND_WHITE) is left completely alone — most of them.
    """
    bands = band_values(im)
    med = [pct(b, 50) for b in bands]
    if min(med) >= GROUND_WHITE:
        return im, None
    wp = [max(pct(b, GROUND_PCT), GROUND_FLOOR) for b in bands]
    chans = []
    for ch, w in zip(im.split(), wp):
        s = 255.0 / float(w)
        chans.append(ch.point(lambda v, s=s: min(255, int(v * s + 0.5))))
    im = Image.merge("RGB", chans)
    mask = im.convert("L").point(lambda v: 255 if v >= WHITE_AT else 0).convert("1")
    im.paste((255, 255, 255), mask=mask)
    return im, tuple(wp)


def ink_profiles(im):
    """Ink weight summed down each column and across each row, in mm of nothing.

    Weight is INK_AT - value, floored at zero, so paper contributes nothing and
    a dark stroke contributes more than a pale one.  The sums are taken off two
    BOX-filtered reductions rather than pixel by pixel — a 32-band mean down the
    columns and across the rows — which is the same profile to well within the
    precision this is used at, and fast enough to run on every card at full size.
    """
    ink = im.convert("L").point(lambda v: INK_AT - v if v < INK_AT else 0)
    w, h = ink.size
    cols = ink.resize((w, TRIM_BANDS), Image.BOX).tobytes()   # row-major bytes
    rows = ink.resize((TRIM_BANDS, h), Image.BOX).tobytes()
    cx = [sum(cols[b * w + x] for b in range(TRIM_BANDS)) for x in range(w)]
    ry = [sum(rows[y * TRIM_BANDS + b] for b in range(TRIM_BANDS)) for y in range(h)]
    return cx, ry


def weight_span(profile, tail):
    """First and last index holding all but `tail` of the profile's weight."""
    total = float(sum(profile))
    if total <= 0:
        return 0, len(profile) - 1
    want = total * tail
    lo, acc = 0, 0.0
    for i, v in enumerate(profile):
        acc += v
        if acc > want:
            lo = i
            break
    hi, acc = len(profile) - 1, 0.0
    for i in range(len(profile) - 1, -1, -1):
        acc += profile[i]
        if acc > want:
            hi = i
            break
    return (lo, hi) if hi >= lo else (0, len(profile) - 1)


def trim(im):
    """Crop to the drawing itself, then give back an even breathing margin.

    The source PNGs are drawn with whatever white margin the generator felt
    like, and that margin is dead space on a card: it shrinks the subject and,
    when it is lopsided, prints the drawing low or high in its box.  paper() has
    already flattened the ground to pure white, so anything below INK_AT is
    something the artist drew; the crop is the box holding all but TRIM_TAIL of
    that ink's WEIGHT at each edge (see the note beside TRIM_TAIL — a plain
    bounding box is decided by the single furthest wisp and is useless here).
    BREATHE of the trimmed long side is then added back as white on ALL FOUR
    sides — from a fresh white canvas, so the margin is exactly even even where
    the art ran to the edge of its own file, and the picture is therefore
    centred on its INK rather than on its file.  The source file is never
    written to; this is the copy on its way to .build/.
    """
    if im.convert("L").point(lambda v: 255 if v < INK_AT else 0).getbbox() is None:
        return im, None                # a blank picture; nothing to trim to
    cx, ry = ink_profiles(im)
    x0, x1 = weight_span(cx, TRIM_TAIL)
    y0, y1 = weight_span(ry, TRIM_TAIL)
    box = (x0, y0, x1 + 1, y1 + 1)
    art = im.crop(box)
    pad = int(round(BREATHE * max(art.size)))
    out = Image.new("RGB", (art.size[0] + 2 * pad, art.size[1] + 2 * pad),
                    (255, 255, 255))
    out.paste(art, (pad, pad))
    return out, box


def fitted_mm(px):
    """The drawn size in mm of a picture of `px` pixels, fitted in the box."""
    pw, ph = px
    sc = min(INNER_W / float(pw), INNER_H / float(ph))
    return pw * sc, ph * sc


def art_dpi(px):
    """The resolution the picture actually PRINTS at, once it is fitted.

    Trimming raises the size the subject is drawn at and therefore lowers the
    dots per millimetre it has to spend on it: art whose subject was a small
    part of its file can come out under SOFT_DPI, and the build says so rather
    than resampling UP, which would add pixels and no detail.
    """
    dw, dh = fitted_mm(px)
    return max(px) / max(dw, dh) * 25.4


def for_print(im):
    """Resample so the art lands on the card at about PRINT_DPI.  Never UP."""
    dw, dh = fitted_mm(im.size)
    want = max(dw, dh) * PRINT_DPI / 25.4
    if max(im.size) > want:
        s = want / float(max(im.size))
        im = im.resize((max(1, int(im.size[0] * s + 0.5)),
                        max(1, int(im.size[1] * s + 0.5))), Image.LANCZOS)
    return im


def prepare(slug, rel):
    """White-grounded, ink-trimmed JPEG for one card.  Returns its path.

    Order matters.  The ground is lifted and the "does it end on paper" check is
    made BEFORE the trim, because the trim removes the very border that check
    reads; and the resample is made AFTER it, because the resolution that counts
    is the resolution of the art that is actually printed, not of the white
    round it.
    """
    src = REPO / rel
    if not src.exists():
        raise SystemExit("missing art: %s" % src)
    im = Image.open(src).convert("RGB")
    if min(im.size) < MIN_PX:
        print("  ! %s is only %d x %d (want >= %d on the short side) — it will "
              "print soft" % (src.name, im.size[0], im.size[1], MIN_PX))
    im, wp = paper(im)
    # The picture must now END at paper white on all four sides, or it prints
    # as a rectangle.  A quarter of the border ring is allowed to be ink —
    # the-dig's flying dirt genuinely runs off the edge of the drawing — but
    # the other three quarters must be paper.
    edge = min(pct(b, 25) for b in band_values(im))
    if edge < GROUND_WHITE:
        raise SystemExit(
            "SPEC FAILURE: %s still ends on a %d-grey border after the white "
            "point (want >= %d) — it will print as a grey rectangle with a "
            "visible edge. Re-scan or hand-clean the source." % (slug, edge, GROUND_WHITE))
    was = im.size
    im, _box = trim(im)
    im = for_print(im)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    out = BUILD_DIR / ("%s.jpg" % slug)
    im.save(str(out), "JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0)
    return out, wp, edge, im.size, was


# ----------------------------------------------------------------- type ----
def em(text):
    """Width of `text` in ems of the sentence face — size-independent."""
    return pdfmetrics.stringWidth(text, SENTENCE_FONT, 1000.0) / 1000.0


# A LINE MAY NOT BE A LONE LITTLE WORD.  Teacher review of the second proofs,
# 2026-09-12: the balance metric below, left to itself, is happy to set "the /
# blob sat" and "the / penguin / spat", because a first line of one short word
# makes every OTHER line narrower and so scores well.  On the card it reads as a
# mistake: the article belongs to the noun it introduces and a child sounding
# the card out has to hold it across a line break for no reason.  So a split is
# rejected outright if any line is one little function word on its own, or if a
# line that is not the last ENDS on an article — "pig in a / wig" strands the
# "a" exactly as badly.  Rejected splits are never scored, so the balance metric
# picks the best of what is left.
TIGHT = {"a", "an", "the", "in", "on", "of", "is", "at", "to", "it"}
ARTICLE = {"a", "an", "the"}


def well_wrapped(lines):
    """False if this split strands a little word on a line of its own."""
    if len(lines) < 2:
        return True
    for line in lines:
        words = line.split()
        if len(words) == 1 and words[0].lower() in TIGHT:
            return False
    for line in lines[:-1]:
        if line.split()[-1].lower() in ARTICLE:
            return False
    return True


def splits(words, n):
    k = len(words)
    if n > k:
        return
    for cuts in combinations(range(1, k), n - 1):
        idx = (0,) + cuts + (k,)
        yield [" ".join(words[idx[i]:idx[i + 1]]) for i in range(n)]


def fits(lines, size_mm):
    """Does this set of lines sit inside the content box at this em?"""
    if max(em(l) for l in lines) * size_mm > INNER_W + 1e-6:
        return False
    return size_mm <= max_size_for(len(lines)) + 1e-9


def lay_out(sentence):
    """The lines for one sentence.  The SIZE is never in question: it is the
    deck em, the same on every card of both Tray 5 sheets.

    A sentence of SHORT_WORDS words or fewer sets on ONE line wherever it fits
    at that em — that is the rule that stops "the cat sat" and "the sun sat"
    coming out different sizes.  Anything that does not fit on one line, short
    or long, takes the FEWEST lines that do, at the same em, with the most
    balanced split at that line count (smallest widest line, then smallest
    spread) out of the splits that well_wrapped() allows.  So the deck steps
    down in LINE COUNT, which is visible and deliberate, and never in type size,
    which reads as a mistake.
    """
    words = sentence.split()
    if len(words) <= SHORT_WORDS and fits([sentence], STD_EM_MM):
        return [sentence], STD_EM_MM
    for n in range(1, MAX_LINES + 1):
        cands = [ls for ls in splits(words, n) if well_wrapped(ls)]
        if not cands:
            continue

        def shape(ls):
            w = [em(l) for l in ls]
            return (round(max(w), 6), round(max(w) - min(w), 6))

        lines = sorted(cands, key=shape)[0]
        if fits(lines, STD_EM_MM):
            return lines, STD_EM_MM
    raise SystemExit(
        "SPEC FAILURE: %r will not fit the %.0f x %.0f mm box at the %.2f mm "
        "deck em in %d lines or fewer — shorten it, or lower STD_EM_MM and "
        "re-read the note beside it." % (sentence, INNER_W, INNER_H,
                                         STD_EM_MM, MAX_LINES))


def ceiling(laid_lines):
    """The largest em the wraps as chosen still allow — the deck em's headroom.

    Printed at every build beside STD_EM_MM so the deck em cannot quietly stop
    being the biggest one these wraps permit: go past this and some card has to
    break differently.
    """
    top = MAX_EM_MM
    for lines in laid_lines:
        top = min(top, INNER_W / max(em(l) for l in lines),
                  max_size_for(len(lines)))
    return top


def no_wrap_em(sentences):
    """The em at which NOTHING short would have to wrap.

    The deck em is deliberately above this: holding every short sentence to one
    line costs more type size across every card than it is worth (see the note
    beside STD_EM_MM).  Printed so the size of that trade stays visible.
    """
    short = [s for s in sentences if len(s.split()) <= SHORT_WORDS]
    return min([MAX_EM_MM] + [INNER_W / em(s) for s in short])


def max_size_for(n):
    """The biggest em at which `n` lines still clear the sentence box.

    This is check()'s own inequality solved for the size, so lay_out() and
    check() cannot disagree: the text block is centred on the cap band, so it
    reaches `lead + asc - cap/2` above the box centre and `lead + desc + cap/2`
    below it, where lead is ((n - 1) / 2) * LINE_H.
    """
    face = pdfmetrics.getFont(SENTENCE_FONT).face
    cap_r = face.capHeight / 1000.0
    asc_r = face.ascent / 1000.0
    desc_r = abs(face.descent) / 1000.0
    lead = ((n - 1) / 2.0) * LINE_H
    return (INNER_H / 2.0) / max(lead + asc_r - cap_r / 2.0,
                                 lead + desc_r + cap_r / 2.0)


def metrics(size_mm):
    face = pdfmetrics.getFont(SENTENCE_FONT).face
    return (face.capHeight / 1000.0 * size_mm,
            face.ascent / 1000.0 * size_mm,
            abs(face.descent) / 1000.0 * size_mm)


# ----------------------------------------------------------------- draw ----
def card_xy(col, row):
    """Bottom-left of the card in grid slot (col, row); row 0 is the TOP row."""
    return X0 + col * CARD_W, Y0 + (ROWS - 1 - row) * CARD_H


def frame(c, x, y, colour):
    """The double rounded frame, on a card whose bottom-left corner is (x, y).

    reportlab strokes CENTRED on the path, so each rectangle's path is inset by
    half its own stroke and its path radius is the outer radius less that same
    half: what lands on the paper is a frame whose OUTER edge is exactly
    FRAME_INSET off the cut line with a FRAME_R corner, and a hairline whose
    outer edge is exactly HAIR_OUT off it.  Both are square about the card's
    centre, so drawing the identical pair on both faces puts the two frames on
    top of each other after the short-edge duplex flip.
    """
    c.saveState()
    c.setStrokeColor(colour)
    h = FRAME_W / 2.0
    c.setLineWidth(FRAME_W * mm)
    c.roundRect((x + FRAME_INSET + h) * mm, (y + FRAME_INSET + h) * mm,
                (CARD_W - 2 * (FRAME_INSET + h)) * mm,
                (CARD_H - 2 * (FRAME_INSET + h)) * mm,
                (FRAME_R - h) * mm, stroke=1, fill=0)
    g = HAIR_W / 2.0
    c.setLineWidth(HAIR_W * mm)
    c.roundRect((x + HAIR_OUT + g) * mm, (y + HAIR_OUT + g) * mm,
                (CARD_W - 2 * (HAIR_OUT + g)) * mm,
                (CARD_H - 2 * (HAIR_OUT + g)) * mm,
                (HAIR_R - g) * mm, stroke=1, fill=0)
    c.restoreState()


def draw_frame(c, col, row, tier):
    """The tier frame — the SAME pair of rectangles on the front and the back."""
    x, y = card_xy(col, row)
    frame(c, x, y, TIER_C[tier])


def draw_front(c, col, row, tier, jpg, pic_px):
    """FRONT — the picture and nothing else, inside the tier rule.

    A child meets the picture first and says what he sees; the words are on the
    back, which makes this a Montessori three-part card and not a label.
    """
    x, y = card_xy(col, row)
    draw_frame(c, col, row, tier)
    dw, dh = fitted_mm(pic_px)
    c.drawImage(str(jpg),
                (x + INNER_X + (INNER_W - dw) / 2.0) * mm,
                (y + INNER_Y + (INNER_H - dh) / 2.0) * mm,
                dw * mm, dh * mm)


def draw_back(c, col, row, tier, lines, size_mm):
    """BACK — the sentence and nothing else, centred, inside the same rule.

    ROTATED 180 DEGREES about the card's centre, exactly as build_13 does it:
    the sheet is flipped on its SHORT edge, which turns it about a horizontal
    axis, so a back drawn upright in the page's own frame would come out upside
    down on the card.  Do not remove the rotation without re-reading the duplex
    note at the top of this file.
    """
    draw_frame(c, col, row, tier)
    x, y = card_xy(col, row)
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


# ---------------------------------------------------------------- check ----
def check(laid):
    bad = []
    if abs(X0 * 2 + BLOCK_W - PAGE_W) > 1e-9 or abs(Y0 * 2 + BLOCK_H - PAGE_H) > 1e-9:
        bad.append("the block is not centred")
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
    # Every scrap of card furniture must sit inside the 4 mm content clearance,
    # and the frame's OUTER edge is the outermost scrap there is.
    if FRAME_INSET < CM.CONTENT_CLEAR - 1e-9:
        bad.append("the frame's outer edge breaks the %.1f mm cut clearance"
                   % CM.CONTENT_CLEAR)
    # THE FRAME MUST BE EVEN.  The inset from the CARD EDGE is one number, used
    # on all four sides at every ring of the frame, and this is the assertion
    # that keeps it one.  Content margins first — the original check, measured
    # against the new geometry.
    left = INNER_X
    right = CARD_W - (INNER_X + INNER_W)
    bottom = INNER_Y
    top_m = CARD_H - (INNER_Y + INNER_H)
    if max(left, right, bottom, top_m) - min(left, right, bottom, top_m) > 1e-9:
        bad.append("the border is not even: margins are %.2f / %.2f / %.2f / "
                   "%.2f mm (left/right/bottom/top)" % (left, right, bottom, top_m))
    # ...then the frame itself: content clears the hairline, the hairline clears
    # the thick frame, and neither corner radius eats its own stroke.
    if min(left, right, bottom, top_m) < HAIR_IN + CONTENT_PAD - 1e-9:
        bad.append("the content box is %.2f mm off the card edge — it overlaps "
                   "the hairline, which ends at %.2f mm"
                   % (min(left, right, bottom, top_m), HAIR_IN))
    if HAIR_GAP < HAIR_W:
        bad.append("the hairline sits closer to the frame than its own width")
    if CONTENT_PAD <= 0:
        bad.append("the content touches the hairline")
    if FRAME_R < FRAME_W or HAIR_R < HAIR_W:
        bad.append("a corner radius is smaller than the stroke it rounds")
    if 2 * (FRAME_R + FRAME_INSET) > min(CARD_W, CARD_H):
        bad.append("the corner radius is bigger than the card")
    if INNER_H <= 0 or INNER_W <= 0:
        bad.append("there is no room left for the sentence")
    if STD_EM_MM > MAX_EM_MM + 1e-9:
        bad.append("the deck em is over the %.1f mm ceiling" % MAX_EM_MM)
    # THE FRAME TIER IS THE DIFFICULTY OF THE WORDS and is normally the group
    # tier.  Where it is not, the card is CARRIED, and a carry is allowed only
    # in the one shape it is meant to have: an EASIER card placed at the HEAD
    # of a HARDER group, so the child meets something he already knows as he
    # steps up.  This is an explicit exception, not a relaxed rule — anything
    # else that disagrees with its group still fails here.
    first_of = {}
    for slug, tier, _sent, _art, _frame in CARDS:
        first_of.setdefault(tier, slug)
    for slug, tier, _sent, _art, frame in CARDS:
        if frame not in TIER_C:
            bad.append("%s: frame tier %r has no series colour" % (slug, frame))
        if frame == tier:
            continue
        if frame > tier:
            bad.append("%s: framed %s inside the %s group — a carry puts a "
                       "KNOWN card at the head of a HARDER group, never the "
                       "other way round"
                       % (slug, TIER_NAME.get(frame, frame), TIER_NAME[tier]))
        if first_of.get(tier) != slug:
            bad.append("%s is carried into the %s group but is not the first "
                       "card of it (%s is) — a carried card is the one the "
                       "child meets as he steps up, so it goes at the head"
                       % (slug, TIER_NAME[tier], first_of.get(tier)))
    for slug, _t, _f, sent, lines, size in laid:
        # ONE EM FOR THE DECK, and SHORT SENTENCES NEVER WRAP.  These two are
        # the whole of the typographic rule and they are asserted, not assumed.
        if abs(size - STD_EM_MM) > 1e-9:
            bad.append("%s: set at %.2f mm, not the %.2f mm deck em"
                       % (slug, size, STD_EM_MM))
        if (len(sent.split()) <= SHORT_WORDS and len(lines) != 1
                and fits([sent], STD_EM_MM)):
            bad.append("%s: a %d-word sentence that FITS on one line was set on "
                       "%d" % (slug, len(sent.split()), len(lines)))
        cap, asc, desc = metrics(size)
        n = len(lines)
        top = ((n - 1) / 2.0) * LINE_H * size - cap / 2.0 + asc
        bot = -((n - 1) / 2.0) * LINE_H * size - cap / 2.0 - desc
        wide = max(em(l) for l in lines) * size
        if wide > INNER_W + 1e-6:
            bad.append("%s: the sentence is %.2f mm wide, over the %.0f mm box"
                       % (slug, wide, INNER_W))
        if top > INNER_H / 2.0 + 1e-6 or -bot > INNER_H / 2.0 + 1e-6:
            bad.append("%s: the sentence reaches %.2f mm of its box centre, over "
                       "the %.2f mm half-height" % (slug, max(top, -bot), INNER_H / 2.0))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


# ---------------------------------------------------------------- build ----
def build():
    n_src = check_source()
    pdfmetrics.registerFont(TTFont(ADULT_FONT, str(FONT_DIR / "Andika-Regular.ttf")))
    pdfmetrics.registerFont(
        TTFont(SENTENCE_FONT, str(FONT_DIR / "ComicNeue-Regular.ttf")))

    laid = [(slug, tier, frame, sent) + lay_out(sent)
            for slug, tier, sent, _a, frame in CARDS]
    check(laid)

    art, lifts = {}, []
    for slug, _tier, _sent, rel, _frame in CARDS:
        jpg, wp, edge, px, was = prepare(slug, rel)
        art[slug] = (jpg, px, was)
        if wp is not None:
            lifts.append((slug, wp, edge))
    check_art_fit(art)

    by_slug = {slug: (lines, size) for slug, _t, _f, _s, lines, size in laid}
    # ONE GROUP TO A PAGE.  check_pages() re-derives, page by page, that the
    # page is single-group and that every sentence back still lands behind its
    # own picture front.
    pages = paginate(CARDS)
    check_pages(pages)
    n_sheets = len(pages)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Writing Shelf · illustrated sentence cards")
    stats = None
    for p, slice_ in enumerate(pages):
        # The page is ONE group and the header says which — the teacher prints
        # this page onto that colour of card stock.  A carried card's own
        # frame colour does not rename the page it sits on.
        names = TIER_NAME[page_tier(slice_)]
        # FRONT — the picture.  Index i sits at (col i % COLS, row i // COLS).
        for i, (slug, _tier, _sent, _rel, frame) in enumerate(slice_):
            jpg, px, _was = art[slug]
            draw_front(c, i % COLS, i // COLS, frame, jpg, px)
        stats = chrome(c, "illustrated sentence cards · %s · picture side · "
                          "sheet %d of %d" % (names, p + 1, n_sheets), len(slice_))
        c.showPage()
        # BACK — the sentence, in the slot the short-edge flip puts behind it.
        # Short-edge flip of a portrait sheet is (x, y) -> (x, H - y): the card
        # printed at front (col c, row r) is backed by the card printed at back
        # (col c, ROWS - 1 - r), and each back is drawn rotated 180 degrees in
        # the back page's own frame.  build_13's registration, constant for
        # constant, on the same butted block centred on the same page.
        for i, (slug, _tier, _sent, _rel, frame) in enumerate(slice_):
            col, row = i % COLS, i // COLS
            lines, size = by_slug[slug]
            draw_back(c, col, ROWS - 1 - row, frame, lines, size)
        chrome(c, "illustrated sentence cards · %s · sentence side · sheet %d of "
                  "%d — print duplex, flip on SHORT edge"
               % (names, p + 1, n_sheets), len(slice_))
        c.showPage()
    c.save()

    v, h = grid()
    print("illustrated sentence cards -> %s" % OUT_DIR)
    print("  source of truth %s: %d cards, matched" % (SOURCE_TS.name, n_src))
    print("  printed card %.0f x %.0f mm  ->  mounted on tier-coloured backing "
          "card %.0f x %.0f mm" % (CARD_W, CARD_H, CARD_W + 20, CARD_H + 20))
    print("  block %.0f x %.0f butted, centred: margins %.1f mm side, %.1f mm "
          "head/foot; frame area %.0f x %.0f, content box %.0f x %.0f"
          % (BLOCK_W, BLOCK_H, X0, Y0, FIT_W, FIT_H, INNER_W, INNER_H))
    n_blank = n_sheets * COLS * ROWS - len(CARDS)
    print("  %-32s %d pp (%d sheets duplex, SHORT edge) · %d cards + %d blank "
          "slots · %d cut lines, %d triangles · %.0f KB"
          % (NAME, n_sheets * 2, n_sheets, len(CARDS), n_blank,
             len(v) + len(h), stats["marks"], out.stat().st_size / 1024.0))
    print("      ONE GROUP TO A PAGE — %s; print each on its group's card stock"
          % "; ".join("sheet %d = %s x%d" % (i + 1, TIER_NAME[page_tier(sl)], len(sl))
                      for i, sl in enumerate(pages)))
    print("      FRONT picture only, TRIMMED to its ink (+%.0f%% breathing "
          "margin) and fitted in the whole %.0f x %.0f mm content box, aspect "
          "preserved, centred; BACK sentence only, centred"
          % (BREATHE * 100, INNER_W, INNER_H))
    print("      tier frame %.1f mm rounded (r %.1f mm outer), outer edge %.1f mm "
          "off the cut, + %.1f mm hairline %.1f mm inside it; EVEN on all four "
          "sides, content box %.0f x %.0f at %.1f mm inset"
          % (FRAME_W, FRAME_R, FRAME_INSET, HAIR_W, HAIR_GAP,
             INNER_W, INNER_H, INNER_INSET))
    print("      pink #D45B86 / blue #2F5FA6 / green #2F7D4F, no written label "
          "and no colour bar — the frame colour IS the difficulty of the words")
    for slug, (tier, frame) in sorted(CARRIED.items()):
        print("      CARRIED: %s keeps its %s frame at the head of the %s group "
              "— known words met again as the child steps up, so its page runs "
              "%s frames beside %s ones. Deliberate; see writing-shelf-"
              "language.ts card(..., carriedFrom)"
              % (slug, TIER_NAME[frame], TIER_NAME[tier],
                 TIER_NAME[frame], TIER_NAME[tier]))
    cap = metrics(STD_EM_MM)[0]
    wrapped = [(slug, lines) for slug, _t, _f, _s, lines, _d in laid if len(lines) > 1]
    print("      sentence Comic Neue at ONE deck em %.2f mm (cap %.2f mm) on "
          "every card, %d-%d lines; <= %d words stays on one line wherever it fits"
          % (STD_EM_MM, cap, min(len(l) for _a, _b, _c, _d, l, _e in laid),
             max(len(l) for _a, _b, _c, _d, l, _e in laid), SHORT_WORDS))
    print("      headroom %.2f mm on this sheet's wraps; %.2f mm is the em at "
          "which nothing short would wrap at all — the deck is deliberately "
          "above it, see the note beside STD_EM_MM"
          % (ceiling([l for _a, _b, _c, _d, l, _e in laid]),
             no_wrap_em([sent for _a, _b, _c, sent, _l, _d in laid])))
    print("      %d of %d wrap: %s" % (len(wrapped), len(laid),
          "; ".join("%s = %s" % (a, " / ".join(b)) for a, b in wrapped) or "none"))
    print("      ground: %d of %d already paper, %d white-pointed"
          % (len(CARDS) - len(lifts), len(CARDS), len(lifts)))
    for slug, wp, edge in lifts:
        print("      white point %s on %s -> border now %d-grey at worst quartile"
              % (tuple(int(w) for w in wp), slug, edge))
    soft = []
    for slug, tier, frame, sent, lines, size in laid:
        _jpg, px, was = art[slug]
        dw, dh = fitted_mm(px)
        dpi = art_dpi(px)
        if dpi < SOFT_DPI:
            soft.append((slug, dpi))
        group = TIER_NAME[tier] if frame == tier else (
            "%s/%s" % (TIER_NAME[tier], TIER_NAME[frame]))
        print("      %-13s %-11s %-27s %-9s %5.1f x %5.1f mm %4.0f dpi  %s"
              % (slug, group, sent, "%dx%d" % px, dw, dh, dpi,
                 " / ".join(lines)))
    if soft:
        print("  ! %d card(s) print under %d dpi because trimming enlarged a "
              "subject that was a small part of its file: %s — they will look "
              "a little soft; nothing is resampled UP to hide it"
              % (len(soft), SOFT_DPI,
                 ", ".join("%s %.0f" % (a, b) for a, b in soft)))


if __name__ == "__main__":
    build()
