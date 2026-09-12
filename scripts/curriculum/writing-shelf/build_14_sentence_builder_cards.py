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

So the card carries NO written difficulty label, in the same way a pink-series
card has never had "pink series" printed on it.  ONE EVEN COLOUR RULE round the
content, the SAME on both faces and the same width on all four sides, is the
whole signal.  There is no colour bar any more: the 8 mm solid bar that used to
run along the top of the card was the top of the border, and on the printed
proof it read — correctly — as a border thicker on one side than the others.
The backing card matters here more than anywhere else in the set: mount tier 1
on PINK, tier 2 on BLUE and tier 3 on GREEN card and the tray sorts itself.

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
makes the front and back grids land on each other.  Eighteen cards at four a
sheet is five sheets = ten pages; the last sheet carries TWO cards and two
blank slots.  Tiers run on through the sheets rather than each starting a fresh
one — sheet 2 carries tier 1's last two and tier 2's first two — because a
colour sorts the cards after cutting far better than a page break does before
it.

THE ART IS ALMOST ALL REUSED.  Fifteen of the eighteen come from work the repo
already holds: the Dark Phonics picture books (the-sat's flashcard tiles, the-
sad, the-hot, the-nap, the-dig, the-spat), the satpin-v2 story starters, the
satpin-v2 CVC set (w08-sand), and fox-box, which is the same drawing sheet 13
already prints.  The only three drawn for the set are tier 3's blob, crab and
jump, in phonics-images/satpin-v2/blends/.  Sources are always the FULL-
RESOLUTION originals (1024 px square, or the 1344 x 896 SAT and CVC tiles),
never the downscaled web copies under public/ — those are 700 px and are the
app's, not the printer's.

ASPECT RATIO IS PRESERVED, which build_13 did not have to do.  Its fourteen
story starters are all square; these eighteen are not — the four SAT tiles are
3:2 landscape.  Centre-cropping a 1344 x 896 tile to a square would cut the
mound out from under the sun, so instead every picture is FITTED inside the
64 mm box and centred, letterboxed on white.  The ground is white, so the
letterboxing is invisible.

BACKGROUNDS ARE LIFTED TO PAPER WHITE by ground()/whiten(), build_13's, constant
for constant: a tinted square on a white card prints as a visible rectangle
with a visible edge, which is the one thing a picture card must not have.

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

# The tier furniture, all of it inside the 4 mm content clearance.  There is
# ONE piece of it and it is the same on all four sides: a RULE.  The solid
# 8 mm colour bar that used to run along the top of the card is gone — teacher
# review of the printed proofs, 2026-09-12: "the border is thicker on some
# sides than others", which it was, because the bar WAS the top of the border.
# A rule of one width all the way round is the tier signal now, and the backing
# card the cutting mounts on repeats it, as it always did.
RING_W = 1.5                           # mm — the colour rule round the content
PAD = 2.5                              # mm — clear air inside the rule

INNER_W = FIT_W - 2 * (RING_W + PAD)                   # 64 mm
# THE INNER BOX, and it is the SAME box on both faces of the card.  One inset —
# the rule plus its air — off all four edges of the 72 x 112 content area, so
# the border reads as one even frame however the card is turned.
INNER_INSET = RING_W + PAD                             # 4.0 mm, all four sides
# Content coordinates are card-local, from the card's bottom-left corner.
INNER_X = CM.CONTENT_CLEAR + INNER_INSET               # 8.0
INNER_Y = CM.CONTENT_CLEAR + INNER_INSET               # 8.0
INNER_W = FIT_W - 2 * INNER_INSET                      # 64.0
INNER_H = FIT_H - 2 * INNER_INSET                      # 104.0

# THE PICTURE NOW HAS THE WHOLE FACE.  It used to share the card with the
# sentence and was squeezed to 58 mm to leave the words 30.5 mm; the sentence
# has moved to the back, so the picture gets the full 64 mm inner width and is
# fitted inside a 64 x 64 box centred in the inner height.
PICTURE = INNER_W                                      # 64.0 mm box, fitted

# The sentence has the whole BACK: 64 x 104, which is sheet 13's back in all
# but the 4 mm the rule takes.  13 mm of em is an 8.7 mm cap height in Comic
# Neue — four times the cap height of a reading book — and it is sheet 13's
# ceiling, so the two Tray 5 card sets read at the same size.
MAX_EM_MM = 13.0
LINE_H = 1.25
MAX_LINES = 3

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
TARGET_PX = 900                        # 900 px across 58 mm is 394 dpi
WHITE_AT = 249                         # at or above this, it is paper
GROUND_BAND = 8                        # px of border measured for the ground
GROUND_WHITE = 252                     # border median at or above this: already paper
GROUND_PCT = 5                         # white point percentile of the border band
GROUND_FLOOR = 200                     # never white-point below this


# ---------------------------------------------------------------- cards ----
# slug, tier, sentence, print art (repo-relative).  MUST match
# SENTENCE_BUILDER_CARDS in writing-shelf-language.ts — check_source() enforces
# it, so edit the TypeScript and then mirror it here, never the other way.
TILES = "scripts/curriculum/flashcards/tiles"
BOOKS = "phonics-images/dark-phonics-books"
STARTERS = "phonics-images/satpin-v2/story-starters"
SPAT = "phonics-images/satpin-v2/books/the-spat"
BLENDS = "phonics-images/satpin-v2/blends"
CVC = "phonics-images/satpin-v2/cvc/w08"

CARDS = [
    ("cat-sat",  1, "the cat sat",    "%s/SAT-p6.png" % TILES),
    ("ant-sat",  1, "the ant sat",    "%s/SAT-p1.png" % TILES),
    ("sun-sat",  1, "the sun sat",    "%s/SAT-p4.png" % TILES),
    ("ant-sad",  1, "the ant is sad", "%s/the-sad/p1-ant.png" % BOOKS),
    ("ant-hot",  1, "the ant is hot", "%s/the-hot/p1-ant.png" % BOOKS),
    ("pig-wig",  1, "a pig in a wig", "%s/pig-wig.png" % STARTERS),
    ("fox-box",  2, "a fox in a box", "%s/fox-box.png" % STARTERS),
    ("ant-naps", 2, "the ant naps",   "%s/the-nap/p1-ant.png" % BOOKS),
    ("ant-digs", 2, "the ant digs",   "%s/the-dig/p1-ant.png" % BOOKS),
    ("cat-naps", 2, "the cat naps",   "%s/the-nap/p6-cat.png" % BOOKS),
    ("cat-digs", 2, "the cat digs",   "%s/the-dig/p6-cat.png" % BOOKS),
    ("sun-naps", 2, "the sun naps",   "%s/the-nap/p3-sun.png" % BOOKS),
    # tier 3 · green · consonant blends, one blend a card.  COMPLETE at six:
    # the sixth (mp, "the cat can jump") landed with its drawing 2026-09-12.
    ("star-sat",     3, "the star sat",     "%s/SAT-p5.png" % TILES),
    ("penguin-spat", 3, "the penguin spat", "%s/spat-p2.png" % SPAT),
    ("blob-sat",     3, "the blob sat",     "%s/blob.png" % BLENDS),
    ("crab-sat",     3, "the crab sat",     "%s/crab.png" % BLENDS),
    ("dad-sand",     3, "the sad dad sat in the sand", "%s/w08-sand.png" % CVC),
    ("cat-jump",     3, "the cat can jump", "%s/jump.png" % BLENDS),
]


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
    for m in re.finditer(
        r"card\(\s*'([\w-]+)'\s*,\s*(\d)\s*,\s*'([^']*)'\s*,\s*[`']([^`']*)[`']\s*,\s*[`']([^`']*)[`']\s*\)",
        block,
    ):
        slug, tier, sentence, _web, art = m.groups()
        for k, v in subs.items():
            art = art.replace(k, v)
        found.append((slug, int(tier), sentence, art))
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


def prepare(slug, rel):
    """White-grounded JPEG for one card, ASPECT PRESERVED.  Returns its path."""
    src = REPO / rel
    if not src.exists():
        raise SystemExit("missing art: %s" % src)
    im = Image.open(src).convert("RGB")
    if min(im.size) < MIN_PX:
        print("  ! %s is only %d x %d (want >= %d on the short side) — it will "
              "print soft" % (src.name, im.size[0], im.size[1], MIN_PX))
    if max(im.size) > TARGET_PX:
        s = TARGET_PX / float(max(im.size))
        im = im.resize((max(1, int(im.size[0] * s + 0.5)),
                        max(1, int(im.size[1] * s + 0.5))), Image.LANCZOS)
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
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    out = BUILD_DIR / ("%s.jpg" % slug)
    im.save(str(out), "JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0)
    return out, wp, edge, im.size


# ----------------------------------------------------------------- type ----
def em(text):
    """Width of `text` in ems of the sentence face — size-independent."""
    return pdfmetrics.stringWidth(text, SENTENCE_FONT, 1000.0) / 1000.0


def splits(words, n):
    k = len(words)
    if n > k:
        return
    for cuts in combinations(range(1, k), n - 1):
        idx = (0,) + cuts + (k,)
        yield [" ".join(words[idx[i]:idx[i + 1]]) for i in range(n)]


def lay_out(sentence):
    """build_13's wrap: the most balanced split, at the fewest lines that still
    reach the full MAX_EM_MM; if none does, the one that gets biggest."""
    words = sentence.split()
    per_n = {}
    for n in range(1, MAX_LINES + 1):
        cands = list(splits(words, n))
        if not cands:
            continue

        def shape(ls):
            w = [em(l) for l in ls]
            return (round(max(w), 6), round(max(w) - min(w), 6))

        lines = sorted(cands, key=shape)[0]
        widest = max(em(l) for l in lines)
        per_n[n] = (lines, min(MAX_EM_MM, INNER_W / widest, max_size_for(n)))
    for n in sorted(per_n):
        if per_n[n][1] >= MAX_EM_MM - 1e-9:
            return per_n[n]
    return per_n[max(per_n, key=lambda k: per_n[k][1])]


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


def draw_ring(c, col, row, tier):
    """The tier rule — the SAME rectangle on the front and on the back.

    reportlab strokes a rectangle CENTRED on its path, so the path is inset by
    half the line width from the 4 mm content line: the rule's OUTER edge lands
    exactly on that line and the ink is RING_W wide on all four sides.  It was
    not even before — an 8 mm solid bar ran along the top of the card and the
    rule ran round the other three — and a teacher looking at the printed proof
    read that, correctly, as a border that was thicker on one side.  There is
    no bar now.  Draw this the same way on both faces and the two borders sit
    exactly on top of each other after the duplex flip.
    """
    x, y = card_xy(col, row)
    h = RING_W / 2.0
    c.saveState()
    c.setStrokeColor(TIER_C[tier])
    c.setLineWidth(RING_W * mm)
    c.rect((x + CM.CONTENT_CLEAR + h) * mm, (y + CM.CONTENT_CLEAR + h) * mm,
           (FIT_W - RING_W) * mm, (FIT_H - RING_W) * mm, stroke=1, fill=0)
    c.restoreState()


def draw_front(c, col, row, tier, jpg, pic_px):
    """FRONT — the picture and nothing else, inside the tier rule.

    A child meets the picture first and says what he sees; the words are on the
    back, which makes this a Montessori three-part card and not a label.
    """
    x, y = card_xy(col, row)
    draw_ring(c, col, row, tier)
    pw, ph = pic_px
    sc = min(PICTURE / float(pw), PICTURE / float(ph))
    dw, dh = pw * sc, ph * sc
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
    draw_ring(c, col, row, tier)
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
    # Every scrap of card furniture must sit inside the 4 mm content clearance.
    if INNER_X < CM.CONTENT_CLEAR or INNER_Y < CM.CONTENT_CLEAR:
        bad.append("card content starts inside the 4 mm clearance")
    # THE BORDER MUST BE EVEN.  The inset from the content box is one number,
    # used on all four sides, and this is the assertion that keeps it one.
    left = INNER_X - CM.CONTENT_CLEAR
    right = (CM.CONTENT_CLEAR + FIT_W) - (INNER_X + INNER_W)
    bottom = INNER_Y - CM.CONTENT_CLEAR
    top_m = (CM.CONTENT_CLEAR + FIT_H) - (INNER_Y + INNER_H)
    if max(left, right, bottom, top_m) - min(left, right, bottom, top_m) > 1e-9:
        bad.append("the border is not even: margins are %.2f / %.2f / %.2f / "
                   "%.2f mm (left/right/bottom/top)" % (left, right, bottom, top_m))
    if min(left, right, bottom, top_m) < RING_W - 1e-9:
        bad.append("the inner box overlaps the rule")
    if PICTURE > INNER_W + 1e-9 or PICTURE > INNER_H + 1e-9:
        bad.append("the picture box is bigger than the inner box")
    if INNER_H <= 0 or INNER_W <= 0:
        bad.append("there is no room left for the sentence")
    for slug, _t, _s, lines, size in laid:
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

    laid = [(slug, tier, sent) + lay_out(sent) for slug, tier, sent, _a in CARDS]
    check(laid)

    art, lifts = {}, []
    for slug, _tier, _sent, rel in CARDS:
        jpg, wp, edge, px = prepare(slug, rel)
        art[slug] = (jpg, px)
        if wp is not None:
            lifts.append((slug, wp, edge))

    by_slug = {slug: (lines, size) for slug, _t, _s, lines, size in laid}
    pages = [CARDS[i:i + COLS * ROWS] for i in range(0, len(CARDS), COLS * ROWS)]
    n_sheets = len(pages)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Writing Shelf · illustrated sentence cards")
    stats = None
    for p, slice_ in enumerate(pages):
        tiers = sorted({t for _s, t, _x, _y in slice_})
        names = " and ".join(TIER_NAME[t] for t in tiers)
        # FRONT — the picture.  Index i sits at (col i % COLS, row i // COLS).
        for i, (slug, tier, _sent, _rel) in enumerate(slice_):
            jpg, px = art[slug]
            draw_front(c, i % COLS, i // COLS, tier, jpg, px)
        stats = chrome(c, "illustrated sentence cards · %s · picture side · "
                          "sheet %d of %d" % (names, p + 1, n_sheets), len(slice_))
        c.showPage()
        # BACK — the sentence, in the slot the short-edge flip puts behind it.
        # Short-edge flip of a portrait sheet is (x, y) -> (x, H - y): the card
        # printed at front (col c, row r) is backed by the card printed at back
        # (col c, ROWS - 1 - r), and each back is drawn rotated 180 degrees in
        # the back page's own frame.  build_13's registration, constant for
        # constant, on the same butted block centred on the same page.
        for i, (slug, tier, _sent, _rel) in enumerate(slice_):
            col, row = i % COLS, i // COLS
            lines, size = by_slug[slug]
            draw_back(c, col, ROWS - 1 - row, tier, lines, size)
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
          "head/foot; content area %.0f x %.0f"
          % (BLOCK_W, BLOCK_H, X0, Y0, FIT_W, FIT_H))
    n_blank = n_sheets * COLS * ROWS - len(CARDS)
    print("  %-32s %d pp (%d sheets duplex, SHORT edge) · %d cards + %d blank "
          "slots · %d cut lines, %d triangles · %.0f KB"
          % (NAME, n_sheets * 2, n_sheets, len(CARDS), n_blank,
             len(v) + len(h), stats["marks"], out.stat().st_size / 1024.0))
    print("      FRONT picture only, fitted in a %.0f x %.0f mm box, aspect "
          "preserved, centred on white; BACK sentence only, centred"
          % (PICTURE, PICTURE))
    print("      tier rule %.1f mm, EVEN on all four sides (%.1f mm inset off "
          "the content box), pink #D45B86 / blue #2F5FA6 / green #2F7D4F, no "
          "written label and no colour bar" % (RING_W, INNER_INSET))
    sizes = [size for _a, _b, _c, _l, size in laid]
    caps = [metrics(s)[0] for s in sizes]
    print("      sentence Comic Neue, %d-%d lines, %.2f-%.2f mm em (cap %.2f-%.2f mm)"
          % (min(len(l) for _a, _b, _c, l, _d in laid),
             max(len(l) for _a, _b, _c, l, _d in laid),
             min(sizes), max(sizes), min(caps), max(caps)))
    print("      ground: %d of %d already paper, %d white-pointed"
          % (len(CARDS) - len(lifts), len(CARDS), len(lifts)))
    for slug, wp, edge in lifts:
        print("      white point %s on %s -> border now %d-grey at worst quartile"
              % (tuple(int(w) for w in wp), slug, edge))
    for slug, tier, sent, lines, size in laid:
        _jpg, px = art[slug]
        print("      %-13s %-5s %-27s %-9s %s"
              % (slug, TIER_NAME[tier], sent, "%dx%d" % px, " / ".join(lines)))


if __name__ == "__main__":
    build()
