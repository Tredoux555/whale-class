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

THE PICTURE is 72 x 72 mm — the card less the 4 mm clearance on both sides,
exactly as on sheets 02 and 03 — centred in the card, on white.

THE SENTENCE is set in Andika, the house literacy face (lib/montree/print/
fonts.ts), and is wrapped to whichever number of lines lets it be BIGGEST
inside the 72 x 112 content box.  For these sentences that is two lines at a
9-10 mm cap height, which is a size a four-year-old reads across a table.

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

BACKGROUNDS ARE LIFTED TO PAPER WHITE.  Two of the fourteen came off the
generator on a cream or grey ground; a 72 mm tinted square on a white card
prints as a visible rectangle with a visible edge, which is the one thing a
picture card must not have.  ground() measures the border, white-points it, and
anything at or above WHITE_AT becomes paper.  On art that is already white this
is a no-op.

Run:   python3 scripts/curriculum/writing-shelf/build_13_story_starter_cards.py
Check: pdftoppm -png -r 60 public/dark-phonics-shelf/v2/13-story-starter-cards.pdf /tmp/s
Needs: reportlab, Pillow
"""

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
PICTURE = FIT_W                                        # 72 mm square, as 02/03

# Type on the back.  MAX_EM is both the ceiling and the target: the sentence is
# wrapped to the FEWEST lines that still reach it, so it never breaks into three
# ragged lines just to gain a millimetre it is not allowed to use.  13 mm of em
# is a 9.4 mm cap height in Andika — four times the cap height of a reading book.
MAX_EM_MM = 13.0
LINE_H = 1.25
MAX_LINES = 3

FOOT_SIZE = 5.5
FOOT_X, FOOT_Y = 30.0, 13.0            # build_flip_cards.py's footer, exactly
LABEL_Y = 277.0
LABEL_C = Color(0.3725, 0.3490, 0.3098)               # #5F594F, adult-text grey
INK = CM.MARK_C                                        # #141110

JPEG_QUALITY = 90
MIN_PX = 1024
# 900 px across a 72 mm picture is 317 dpi — over the 300 dpi a card is printed
# at, and half the file of the 1024 px original.  Nothing is resampled UP.
TARGET_PX = 900
WHITE_AT = 249                         # at or above this, it is paper
GROUND_BAND = 8                        # px of border measured for the ground


# ---------------------------------------------------------------- cards ----
# slug -> the one decodable sentence the picture is of.  Slug is also the art
# file name: phonics-images/satpin-v2/story-starters/<slug>.png
CARDS = [
    ("cat-mat",      "Cat on a mat"),
    ("pig-wig",      "Pig in a wig"),
    ("hen-pen",      "Hen in a pen"),
    ("dog-log",      "Dog on a log"),
    ("fox-box",      "Fox in a box"),
    ("bug-rug",      "Bug on a rug"),
    ("rat-hat",      "Rat in a hat"),
    ("duck-truck",   "Duck in a truck"),
    ("nut-hut",      "Nut in a hut"),
    ("ant-pan",      "Ant on a pan"),
    ("frog-bog",     "Frog in a bog"),
    ("cub-tub",      "Cub in a tub"),
    ("bee-tree",     "Bee on a tree"),
    ("sheep-asleep", "Sheep asleep"),
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


def ground(im, band=GROUND_BAND):
    """Median colour of the border band — the paper the art was drawn on."""
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
    return tuple(statistics.median(v) for v in vals)


def whiten(im, med):
    """White-point the ground, then flatten anything at paper level to paper."""
    lifted = min(med) < 252
    if lifted:
        chans = []
        for ch, m in zip(im.split(), med):
            s = 255.0 / max(m, 1.0)
            chans.append(ch.point(lambda v, s=s: min(255, int(v * s + 0.5))))
        im = Image.merge("RGB", chans)
    mask = im.convert("L").point(lambda v: 255 if v >= WHITE_AT else 0).convert("1")
    im.paste((255, 255, 255), mask=mask)
    return im, lifted


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
    """Square, patched, white-grounded JPEG for one card.  Returns its path."""
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
    if im.size[0] > TARGET_PX:
        im = im.resize((TARGET_PX, TARGET_PX), Image.LANCZOS)
    med = ground(im)
    im, lifted = whiten(im, med)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    out = BUILD_DIR / ("%s.jpg" % slug)
    im.save(str(out), "JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0)
    return out, med, lifted, im.size[0]


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
    """The wrap and the size for one sentence.

    For each number of lines, the most BALANCED split is taken — smallest widest
    line, then smallest spread between the lines — because a card whose first
    line is the word "The" reads as a mistake however big the type is.  The wrap
    chosen is then the FEWEST lines that still reach the full MAX_EM_MM; if none
    does, the one that gets biggest.
    """
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
        per_n[n] = (lines, min(MAX_EM_MM, FIT_W / widest, FIT_H / (n * LINE_H)))
    for n in sorted(per_n):
        if per_n[n][1] >= MAX_EM_MM - 1e-9:
            return per_n[n]
    return per_n[max(per_n, key=lambda k: per_n[k][1])]


def metrics(size_mm):
    face = pdfmetrics.getFont("Andika").face
    return (face.capHeight / 1000.0 * size_mm,
            face.ascent / 1000.0 * size_mm,
            abs(face.descent) / 1000.0 * size_mm)


# ----------------------------------------------------------------- draw ----
def card_xy(col, row):
    """Bottom-left of the card in grid slot (col, row); row 0 is the TOP row."""
    return X0 + col * CARD_W, Y0 + (ROWS - 1 - row) * CARD_H


def draw_front(c, col, row, jpg):
    x, y = card_xy(col, row)
    c.drawImage(str(jpg),
                (x + (CARD_W - PICTURE) / 2.0) * mm,
                (y + (CARD_H - PICTURE) / 2.0) * mm,
                PICTURE * mm, PICTURE * mm)


def draw_back(c, col, row, lines, size_mm):
    """The sentence, rotated 180 degrees about the card's centre.

    The rotation is what makes the back read upright once the sheet is flipped
    on its SHORT edge.  Do not remove it without re-reading the duplex note at
    the top of this file.
    """
    x, y = card_xy(col, row)
    cap, _asc, _desc = metrics(size_mm)
    n = len(lines)
    c.saveState()
    c.translate((x + CARD_W / 2.0) * mm, (y + CARD_H / 2.0) * mm)
    c.rotate(180)
    c.setFillColor(INK)
    c.setFont("Andika", size_mm * mm)
    for i, line in enumerate(lines):
        by = ((n - 1) / 2.0 - i) * LINE_H * size_mm - cap / 2.0
        c.drawCentredString(0, by * mm, line)
    c.restoreState()


def grid():
    return CM.grid_lines(X0, Y0, COLS, ROWS, CARD_W, CARD_H, PAGE_W, PAGE_H)


def chrome(c, label):
    v, h = grid()
    stats = CM.cut_lines(c, v, h, PAGE_W, PAGE_H)
    c.saveState()
    c.setFillColor(LABEL_C)
    c.setFont("Andika", FOOT_SIZE)
    c.drawString(FOOT_X * mm, LABEL_Y * mm, label)
    c.restoreState()
    CM.footer(c, FOOT_X, FOOT_Y, CM.cards_line(COLS * ROWS), "Andika", FOOT_SIZE)
    return stats


# ---------------------------------------------------------------- check ----
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
    if PICTURE > FIT_W + 1e-9 or PICTURE > FIT_H + 1e-9:
        bad.append("the picture is bigger than the content area")
    half_w, half_h = FIT_W / 2.0, FIT_H / 2.0
    for slug, _s, lines, size in laid:
        cap, asc, desc = metrics(size)
        n = len(lines)
        top = ((n - 1) / 2.0) * LINE_H * size - cap / 2.0 + asc
        bot = -((n - 1) / 2.0) * LINE_H * size - cap / 2.0 - desc
        wide = max(em(l) for l in lines) * size
        if wide / 2.0 > half_w + 1e-6:
            bad.append("%s: the sentence is %.2f mm wide, over the %.0f mm "
                       "content width" % (slug, wide, FIT_W))
        if top > half_h + 1e-6 or -bot > half_h + 1e-6:
            bad.append("%s: the sentence reaches %.2f mm of the card's centre, "
                       "over the %.0f mm half-height" % (slug, max(top, -bot), half_h))
    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))


# ---------------------------------------------------------------- build ----
def build():
    pdfmetrics.registerFont(TTFont("Andika", str(FONT_DIR / "Andika-Regular.ttf")))

    laid = [(slug, sent) + lay_out(sent) for slug, sent in CARDS]
    check(laid)

    art = {}
    lifts, patched = [], []
    for slug, _sent in CARDS:
        jpg, med, lifted, px = prepare(slug)
        art[slug] = jpg
        if lifted:
            lifts.append((slug, med))
        if slug in PATCHES:
            patched.append(slug)

    pages = [CARDS[i:i + COLS * ROWS] for i in range(0, len(CARDS), COLS * ROWS)]
    n_sheets = len(pages)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    c = canvas.Canvas(str(out), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle("Dark Phonics · Writing Shelf · story starter cards")
    by_slug = {slug: (lines, size) for slug, _s, lines, size in laid}
    stats = None
    for p, slice_ in enumerate(pages):
        # FRONT — the picture.  Index i sits at (col i % COLS, row i // COLS).
        for i, (slug, _sent) in enumerate(slice_):
            draw_front(c, i % COLS, i // COLS, art[slug])
        stats = chrome(c, "story starter cards · picture side · sheet %d of %d"
                       % (p + 1, n_sheets))
        c.showPage()
        # BACK — the sentence, in the slot the short-edge flip puts behind it.
        for i, (slug, _sent) in enumerate(slice_):
            col, row = i % COLS, i // COLS
            lines, size = by_slug[slug]
            draw_back(c, col, ROWS - 1 - row, lines, size)
        chrome(c, "story starter cards · sentence side · sheet %d of %d — print "
                  "duplex, flip on SHORT edge" % (p + 1, n_sheets))
        c.showPage()
    c.save()

    blanks = n_sheets * COLS * ROWS - len(CARDS)
    v, h = grid()
    print("story starter cards -> %s" % OUT_DIR)
    print("  printed card %.0f x %.0f mm  ->  mounted on backing card %.0f x %.0f mm"
          % (CARD_W, CARD_H, CARD_W + 20, CARD_H + 20))
    print("  block %.0f x %.0f butted, centred: margins %.1f mm side, %.1f mm "
          "head/foot; content area %.0f x %.0f"
          % (BLOCK_W, BLOCK_H, X0, Y0, FIT_W, FIT_H))
    print("  %-30s %d pp (%d sheets duplex, SHORT edge) · %d cards + %d blanks · "
          "%d cut lines, %d triangles · %.0f KB"
          % (NAME, n_sheets * 2, n_sheets, len(CARDS), blanks,
             len(v) + len(h), stats["marks"], out.stat().st_size / 1024.0))
    print("      picture %.0f x %.0f mm centred on every card" % (PICTURE, PICTURE))
    sizes = [size for _s, _t, _l, size in laid]
    caps = [metrics(s)[0] for s in sizes]
    print("      sentence Andika, %d-%d lines, %.2f-%.2f mm em (cap %.2f-%.2f mm)"
          % (min(len(l) for _a, _b, l, _c in laid),
             max(len(l) for _a, _b, l, _c in laid),
             min(sizes), max(sizes), min(caps), max(caps)))
    if patched:
        print("      generator glyph whited out on: %s" % ", ".join(patched))
    for slug, med in lifts:
        print("      ground lifted to paper white on %s (was %s)"
              % (slug, tuple(int(m) for m in med)))
    for slug, sent, lines, size in laid:
        print("      %-13s %-24s %s" % (slug, sent, " / ".join(lines)))


if __name__ == "__main__":
    build()
