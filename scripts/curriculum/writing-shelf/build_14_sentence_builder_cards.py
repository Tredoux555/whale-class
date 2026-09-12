#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 14, the Tray 5 ILLUSTRATED SENTENCE CARDS

Sheet 12 gave Tray 5 its tin of loose words.  Sheet 13 gave it a picture to
react to, with the sentence hidden on the back as the control of error.  This
sheet is the step BETWEEN the two, and it is the one a child who cannot yet
read a sentence off a blank line actually needs: the picture and its sentence
TOGETHER, on one face, so there is nothing to turn over and nothing to guess.
He reads the line with his finger under it, builds the same line out of the
tin, and copies it onto a strip off sheet 05.  Three works, one card.

TWO TIERS, AND THE COLOUR IS THE TIER.  This is not a new invention — it is the
Montessori Pink and Blue reading series, which is what the two tiers ARE:

  tier 1 · PINK   pure three-letter CVC          The cat sat / a pig in a wig
  tier 2 · BLUE   four-letter words and blends   The ant naps / The cat digs

So the card carries NO written difficulty label, in the same way a pink-series
card has never had "pink series" printed on it.  A solid colour bar across the
top of the card and a colour rule around its content are the whole signal, and
a four-year-old sorts the tray by them without being able to read a word.  It
is also why the backing card matters here more than anywhere else in the set:
mount tier 1 on PINK card and tier 2 on BLUE card and the tray sorts itself.

ADULT TEXT STAYS OFF THE CARD, per the set's rule.  The tier, the sheet number
and the cutting line all live in the margin, outside every cut line.

SIZE IS THE FLIP-CARD SIZE, NOT A NEW ONE.  80 x 120 mm printed, mounted on a
coloured backing card with a 1 cm border, finishing at 100 x 140 — sheets 02,
03 and 13's card and his 100 mm card stands (CLAUDE.md, "WRITING SHELF PRINT
RULES — LOCKED", rule 2).  Four butt into a 160 x 240 block centred on A4:
25 mm side margins, 28.5 mm head and foot, exactly build_13's.

SINGLE-SIDED, which is the one thing here that is NOT build_13.  There is no
back, so there is no duplex, no short-edge flip, no 180-degree rotation and no
registration risk — the three cards' worth of sheets print on any printer in
the building.  Twelve cards at four a sheet is three sheets with NO blanks, so
tier 1's last two cards share sheet 2 with tier 2's first two.  That is
deliberate: blank cards are the point on sheet 12, where the tin is meant to
grow, and pure waste here, where the set is closed at twelve.

THE ART IS ALL REUSED — not one new drawing.  Nine come from the Dark Phonics
picture books (the-sat's flashcard tiles, the-sad, the-hot, the-nap, the-dig),
two from the satpin-v2 story starters, and the twelfth, fox-box, is the same
drawing sheet 13 already prints.  Sources are the FULL-RESOLUTION originals
(1024 px square, or the 1344 x 896 SAT tiles), never the downscaled web copies
under public/ — those are 700 px and are the app's, not the printer's.

ASPECT RATIO IS PRESERVED, which build_13 did not have to do.  Its fourteen
story starters are all square; these twelve are not — the three SAT tiles are
3:2 landscape.  Centre-cropping a 1344 x 896 tile to a square would cut the
mound out from under the sun, so instead every picture is FITTED inside the
64 mm box and centred, letterboxed on white.  The ground is white, so the
letterboxing is invisible.

BACKGROUNDS ARE LIFTED TO PAPER WHITE by ground()/whiten(), build_13's, constant
for constant: a tinted square on a white card prints as a visible rectangle
with a visible edge, which is the one thing a picture card must not have.

THE SENTENCE is set in Andika, the house literacy face, wrapped by build_13's
lay_out() to whichever number of lines lets it be biggest in the 64 x 30.5 mm
box under the picture.

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

# The tier furniture, all of it inside the 4 mm content clearance.
RING_W = 1.5                           # mm — the colour rule round the content
TAB_H = 8.0                            # mm — the solid colour bar along the top
PAD = 2.5                              # mm — clear air inside the rule

INNER_W = FIT_W - 2 * (RING_W + PAD)                   # 64 mm
# The picture is NARROWER than the inner width on purpose.  At the full 64 mm
# it leaves 30.5 mm for the sentence, and 30.5 mm will not hold two lines of
# Andika at a size a beginning reader reads across a table — Andika's ascent is
# a very tall 1.22 em (it reserves room for diacritics), and check() measures
# against that ascent, not against the ink.  58 mm buys the sentence box 6 mm
# and is still the largest picture on any card in the set bar the flip cards.
PICTURE = 58.0                                         # mm box, fitted, centred
GAP = 3.0                              # mm between picture and sentence
# Content coordinates are card-local, from the card's bottom-left corner.
INNER_X = CM.CONTENT_CLEAR + RING_W + PAD              # 8.0
INNER_TOP = CM.CONTENT_CLEAR + FIT_H - TAB_H - PAD     # 105.5
INNER_BOT = CM.CONTENT_CLEAR + RING_W + PAD            # 8.0
TEXT_H = INNER_TOP - PICTURE - GAP - INNER_BOT         # 30.5 mm

# 11.5 mm of em is a 7.9 mm cap height — three times a reading book's, and the
# size at which EVERY sentence here either fits on one line or breaks into two
# at the SAME size.  A card set whose type changes size card to card reads as
# twelve different works; this one reads as one.
MAX_EM_MM = 11.5
LINE_H = 1.25
MAX_LINES = 2

FOOT_SIZE = 5.5
FOOT_X, FOOT_Y = 30.0, 13.0            # build_flip_cards.py's footer, exactly
LABEL_Y = 277.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)               # #5F594F, adult-text grey
INK = CM.MARK_C                                        # #141110

# The two series colours.  Deep enough to read as pink and blue at a glance on
# white card under classroom light, and to be matched by ordinary craft card.
PINK_C = Color(0.8314, 0.3569, 0.5255)                # #D45B86
BLUE_C = Color(0.1843, 0.3725, 0.6510)                # #2F5FA6
TIER_C = {1: PINK_C, 2: BLUE_C}
TIER_NAME = {1: "pink", 2: "blue"}

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

CARDS = [
    ("cat-sat",  1, "The cat sat",    "%s/SAT-p6.png" % TILES),
    ("ant-sat",  1, "The ant sat",    "%s/SAT-p1.png" % TILES),
    ("sun-sat",  1, "The sun sat",    "%s/SAT-p4.png" % TILES),
    ("ant-sad",  1, "The ant is sad", "%s/the-sad/p1-ant.png" % BOOKS),
    ("ant-hot",  1, "The ant is hot", "%s/the-hot/p1-ant.png" % BOOKS),
    ("pig-wig",  1, "a pig in a wig", "%s/pig-wig.png" % STARTERS),
    ("fox-box",  2, "a fox in a box", "%s/fox-box.png" % STARTERS),
    ("ant-naps", 2, "The ant naps",   "%s/the-nap/p1-ant.png" % BOOKS),
    ("ant-digs", 2, "The ant digs",   "%s/the-dig/p1-ant.png" % BOOKS),
    ("cat-naps", 2, "The cat naps",   "%s/the-nap/p6-cat.png" % BOOKS),
    ("cat-digs", 2, "The cat digs",   "%s/the-dig/p6-cat.png" % BOOKS),
    ("sun-naps", 2, "The sun naps",   "%s/the-nap/p3-sun.png" % BOOKS),
]


def check_source():
    """Refuse to build if this table has drifted from the TypeScript one."""
    src = SOURCE_TS.read_text(encoding="utf-8")
    # Anchor on the DECLARATIONS, not the names: both are also mentioned in the
    # file's doc comments, which sit above the array and would slice it away.
    start = src.index("export const SENTENCE_BUILDER_CARDS")
    end = src.index("export const SENTENCE_BUILDER_GAPS", start)
    block = src[start:end]
    subs = {"${PAGES}": "", "${BOOKS}": BOOKS, "${STARTERS}": STARTERS}
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
    Three of the twelve here are not flat — the-nap's ant and sun are drawn on
    a SCANNED textured sheet whose grain runs 211-250 in a single picture.
    Scaling that by its median puts the middle of the grain at paper white and
    leaves the dark half of it below, and the picture prints as exactly the
    grey rectangle with a visible edge a picture card must never have.

    So the white point is taken BELOW the grain, at the 5th percentile of the
    border band, and everything above it clips to paper.  Art that reaches the
    border pulls that percentile down, so it is floored at GROUND_FLOOR and the
    build reports every white point it used.  A border that is already paper
    (median >= GROUND_WHITE) is left completely alone — nine of the twelve.
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
    """Width of `text` in ems of Andika — a font-size-independent measure."""
    return pdfmetrics.stringWidth(text, "Andika", 1000.0) / 1000.0


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
    face = pdfmetrics.getFont("Andika").face
    cap_r = face.capHeight / 1000.0
    asc_r = face.ascent / 1000.0
    desc_r = abs(face.descent) / 1000.0
    lead = ((n - 1) / 2.0) * LINE_H
    return (TEXT_H / 2.0) / max(lead + asc_r - cap_r / 2.0,
                                lead + desc_r + cap_r / 2.0)


def metrics(size_mm):
    face = pdfmetrics.getFont("Andika").face
    return (face.capHeight / 1000.0 * size_mm,
            face.ascent / 1000.0 * size_mm,
            abs(face.descent) / 1000.0 * size_mm)


# ----------------------------------------------------------------- draw ----
def card_xy(col, row):
    """Bottom-left of the card in grid slot (col, row); row 0 is the TOP row."""
    return X0 + col * CARD_W, Y0 + (ROWS - 1 - row) * CARD_H


def draw_card(c, col, row, tier, jpg, pic_px, lines, size_mm):
    x, y = card_xy(col, row)
    col_c = TIER_C[tier]

    # --- the colour rule, its OUTER edge exactly on the 4 mm content line ---
    h = RING_W / 2.0
    c.saveState()
    c.setStrokeColor(col_c)
    c.setLineWidth(RING_W * mm)
    c.rect((x + CM.CONTENT_CLEAR + h) * mm, (y + CM.CONTENT_CLEAR + h) * mm,
           (FIT_W - RING_W) * mm, (FIT_H - RING_W) * mm, stroke=1, fill=0)
    # --- the solid tier bar along the top of the content box ---
    c.setFillColor(col_c)
    c.rect((x + CM.CONTENT_CLEAR) * mm,
           (y + CM.CONTENT_CLEAR + FIT_H - TAB_H) * mm,
           FIT_W * mm, TAB_H * mm, stroke=0, fill=1)
    c.restoreState()

    # --- the picture, FITTED inside the 64 mm box and centred on white ---
    pw, ph = pic_px
    s = min(PICTURE / float(pw), PICTURE / float(ph))
    dw, dh = pw * s, ph * s
    c.drawImage(str(jpg),
                (x + INNER_X + (INNER_W - dw) / 2.0) * mm,
                (y + INNER_TOP - PICTURE + (PICTURE - dh) / 2.0) * mm,
                dw * mm, dh * mm)

    # --- the sentence, centred in the box under the picture ---
    cap, _asc, _desc = metrics(size_mm)
    n = len(lines)
    mid = y + INNER_BOT + TEXT_H / 2.0
    c.saveState()
    c.setFillColor(INK)
    c.setFont("Andika", size_mm * mm)
    for i, line in enumerate(lines):
        by = mid + ((n - 1) / 2.0 - i) * LINE_H * size_mm - cap / 2.0
        c.drawCentredString((x + CARD_W / 2.0) * mm, by * mm, line)
    c.restoreState()


def grid():
    return CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)


def chrome(c, label, n_cards):
    v, h = grid()
    stats = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
    c.saveState()
    c.setFillColor(LABEL_C)
    c.setFont("Andika", FOOT_SIZE)
    c.drawString(FOOT_X * mm, LABEL_Y * mm, label)
    c.restoreState()
    CM.footer(c, FOOT_X, FOOT_Y, CM.cards_line(n_cards), "Andika", FOOT_SIZE)
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
    if INNER_X < CM.CONTENT_CLEAR or INNER_BOT < CM.CONTENT_CLEAR:
        bad.append("card content starts inside the 4 mm clearance")
    if INNER_TOP + PAD + TAB_H > CM.CONTENT_CLEAR + FIT_H + 1e-9:
        bad.append("the tier bar runs past the content box")
    if PICTURE + GAP + TEXT_H > INNER_TOP - INNER_BOT + 1e-9:
        bad.append("picture + gap + text is taller than the content box")
    if TEXT_H <= 0:
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
        if top > TEXT_H / 2.0 + 1e-6 or -bot > TEXT_H / 2.0 + 1e-6:
            bad.append("%s: the sentence reaches %.2f mm of its box centre, over "
                       "the %.2f mm half-height" % (slug, max(top, -bot), TEXT_H / 2.0))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


# ---------------------------------------------------------------- build ----
def build():
    n_src = check_source()
    pdfmetrics.registerFont(TTFont("Andika", str(FONT_DIR / "Andika-Regular.ttf")))

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
        for i, (slug, tier, _sent, _rel) in enumerate(slice_):
            jpg, px = art[slug]
            lines, size = by_slug[slug]
            draw_card(c, i % COLS, i // COLS, tier, jpg, px, lines, size)
        stats = chrome(c, "illustrated sentence cards · %s · sheet %d of %d"
                       % (" and ".join(TIER_NAME[t] for t in tiers), p + 1, n_sheets),
                       len(slice_))
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
    print("  %-32s %d pp (%d sheets SINGLE-SIDED) · %d cards, no blanks · "
          "%d cut lines, %d triangles · %.0f KB"
          % (NAME, n_sheets, n_sheets, len(CARDS),
             len(v) + len(h), stats["marks"], out.stat().st_size / 1024.0))
    print("      picture fitted in a %.0f x %.0f mm box, aspect preserved, "
          "centred on white in the %.0f mm inner width" % (PICTURE, PICTURE, INNER_W))
    print("      tier bar %.0f x %.0f mm + %.1f mm rule, pink #D45B86 / blue "
          "#2F5FA6, no written label" % (FIT_W, TAB_H, RING_W))
    sizes = [size for _a, _b, _c, _l, size in laid]
    caps = [metrics(s)[0] for s in sizes]
    print("      sentence Andika, %d-%d lines, %.2f-%.2f mm em (cap %.2f-%.2f mm)"
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
        print("      %-9s %-5s %-15s %-9s %s"
              % (slug, TIER_NAME[tier], sent, "%dx%d" % px, " / ".join(lines)))


if __name__ == "__main__":
    build()
