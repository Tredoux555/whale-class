#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · sheet 23, THE PICTURE TILE BOX

Sheet 22 prints a dashed 44 mm square at the left of every sentence frame and
waits for something to land on it.  This is the something.  A box of 44 mm
picture tiles — ONE OBJECT A TILE, no word printed anywhere — that the child
chooses from before he builds.  He takes a tile, lays it on the landing, and the
sentence he then makes out of his word cards is a sentence ABOUT SOMETHING.  That
is the whole of the work: sheet 20 gave him a shape with nothing to say, sheet 21
lets him draw his own subject, and this box hands him one.

NO WORD IS PRINTED ON A TILE, AND THAT IS DELIBERATE.  A tile with `cat` under
the picture would hand him the noun card he is supposed to go and find, and the
work would collapse into matching.  The picture is the only thing on the tile.
verify() extracts the text layer of the page and refuses the build unless what
comes out is the adult caption at the foot and nothing else.

EVERY TILE IS A NOUN THE TIN HOLDS, and check() proves it against build_12's own
word list rather than against a second copy of it.  A picture of something he has
no card for is a dead end — he would choose it, go to the tin, and find nothing —
so the tin is the gate — AND THE GATE MOVES.  The tin was rebuilt on 2026-09-14
to cover sheets 13 and 14 together and went from thirty nouns to FORTY-EIGHT;
this sheet went with it, from twenty-two tiles to FORTY, because a tile box that
does not follow the tin is a box of subjects he cannot write about.

FORTY IS TEN FULL ROWS OF FOUR: sheet 1 is a full page of twenty-four and sheet 2
carries sixteen, and the paper under sheet 2's last row is trim.  See THE PAGE IS
A WHOLE NUMBER OF FULL ROWS below for why a short page is fine and a short row is
not.

THE EIGHT THAT ARE NOT HERE ARE NOT ONE PROBLEM BUT TWO, and HELD_BACK keeps them
apart, because the fix is different.  `cats` and `moths` have NO ARTWORK ANYWHERE
in the repo and need drawing.  `bog`, `cub`, `dad`, `hill`, `sand` and `tip` HAVE
artwork and are held back on STYLE: bog's picture is a snowy forest path — the
wrong thing entirely — cub's is a bear in a field, dad's a lifestyle photograph of
a man and a baby, hill's and sand's are landscapes, and tip's is a macro of a pen
nib so abstract a four-year-old would not name it.  (A second `tip` exists and
carries a stock-library watermark, which settles that one on its own.)  All eight
are named in the report every build, with the reason, and check() asserts the list
is EXACTLY the tin's nouns minus TILES, so it cannot quietly go stale when a tile
is added.

ONE SOURCE, ONE STYLE, WITH THREE NAMED EXCEPTIONS.  Thirty-seven photographs come
from docs/picture-bank/photos, whose house rule is a single object on a plain
ground, so the tiles laid out on a table look like one material and not like a
scrapbook.  `cot` and `rug` come from the satpin-v2 CVC studio set, which keeps
the same rule — a white cot, a jute rug, each on a plain ground — and `blob` from
the shelf's OWN blend artwork, because there is no photograph of a blob in the
world and the black blob of `The blob sat.` is the only blob this child has ever
met.  All three exceptions are in SOURCE by name.  Nothing is taken from the sentence art in
.build/sentence-builder: that art draws a whole SENTENCE — the cat SITTING, the
ant DIGGING — and a tile that already shows the verb is a tile that has answered
the question.  A tile shows a thing, and what the thing does is his to decide.

THE CROP IS TAKEN ROUND THE OBJECT AND THE TILE IS NEVER CROPPED TO SQUARE.  The
bank's photographs are mostly 3:2 and the tile is square, and the obvious move —
crop a square out of the middle — was measured and thrown away: the crab's own
ink is 1214 px across a frame 896 tall, the ant's 1148, the penguin's 1259, so a
square crop would take a blade to a third of the objects.  Instead
the DEAD MARGIN is cropped and nothing else.  The object's extent is read off the
IMAGE'S OWN INK — deviation from the ground, summed along each axis, cut at the
0.3% and 99.7% of mass so a soft vignette or a spread shadow cannot drag the box
out to the frame edge — padded a little, and that crop is then CONTAINED in the
tile's field at its own aspect.  Nothing is ever cut off, the object is as large
as a 44 mm tile can carry it, and the grounds mostly crop away with the margin,
which is the second reason to do it this way.

CONTENT STOPS 4 mm INSIDE EVERY TILE EDGE, which is this set's own rule for a cut
card, and here it does a second job.  The bank's grounds are not all the same
white; some are a light warm grey.  Butted edge to edge with no gutter, tile
grounds of slightly different tone would read as patchwork.  The 4 mm of paper
each side turns each photograph into a picture ON a card — the grounds never
touch — and it keeps a wandering blade off the photograph, which is what the rule
was for.  The photograph is therefore a 36 mm square field in a 44 mm tile.

THE PAGE IS FULL AND THERE ARE NO BLANKS.  Four tiles across A4 and six down is
twenty-four cells, and twenty-four nouns fill them, so nothing on this sheet is
printed for the bin.  When `cats`, `moths` or a house-style `dad`, `hill`, `sand`
or `tip` arrives, it does not go in a spare cell — there are none — it goes on a
second page, and PAGES below is the one number that changes.

Run:   python3 scripts/curriculum/writing-shelf/build_23_picture_tiles.py
Needs: reportlab, pikepdf, numpy, Pillow; pdftoppm and pdftotext (poppler).
"""

import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pikepdf
from PIL import Image
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import build_12_word_card_tin as W12          # noqa: E402  the tin, and the gate
import build_21_frames_picture as F21         # noqa: E402  the landing this fills
import cutmarks as CM                         # noqa: E402  the cutting standard

REPO = HERE.parents[2]
BANK = REPO / "docs" / "picture-bank" / "photos"
OUT_DIR = REPO / "public" / "dark-phonics-shelf" / "v2"
ART_DIR = HERE / ".build" / "picture-tiles"
PROOF_DIR = HERE / ".build" / "proof"
SCRATCH = HERE / ".build" / "scratch"
NAME = "23-picture-tiles.pdf"

PDF_TITLE = "Dark Phonics · Writing Shelf · picture tiles"
PDF_AUTHOR = W12.PDF_AUTHOR
PRINT_NOTE = (
    "Dark Phonics · The Writing Shelf · Tray 5, free composition — print 1-up "
    "onto A4, portrait, 100%, single-sided, onto 250 gsm card. Laminate, then "
    "cut along every grey line, down and across, for FORTY picture tiles of "
    "44 mm — 24 off sheet 1 and 16 off sheet 2, with no blank cell anywhere; the "
    "paper under sheet 2's last row is trim. They land on the dashed square of "
    "sheet 22 and they carry NO WORD: the child chooses a tile, then goes to his "
    "word tins for the noun."
)

# THE SOURCE OF EVERY TILE, named once.  `star` takes the bank's REPLACED file
# and not its live star.jpg, which is a starfruit — the right shape and the
# wrong thing, and a child reading `star` should not be shown fruit.  The bank
# is not edited from here; this file states which frame it uses and why.
STAR = "star.replaced-1784789837207.8455.jpg"
TILES = [
    "ant", "bed", "bee", "bell", "blob", "box", "bug", "cat",
    "chick", "chip", "cot", "crab", "dog", "duck", "fish", "fox",
    "frog", "hat", "hen", "hut", "log", "mat", "moth", "mud",
    "nut", "pan", "pen", "penguin", "pig", "pup", "rat", "rug",
    "sheep", "star", "sun", "top", "tree", "truck", "tub", "wig",
]
SOURCE = {w: (BANK / w / ("%s.jpg" % w)) for w in TILES}
SOURCE["star"] = BANK / "star" / STAR
# the two named exceptions to the one-source rule, and the reason each is one
SOURCE["cot"] = REPO / "phonics-images" / "satpin-v2" / "cvc-photos" / "cot.png"
SOURCE["rug"] = REPO / "phonics-images" / "satpin-v2" / "cvc-photos" / "rug.png"
SOURCE["blob"] = REPO / "phonics-images" / "satpin-v2" / "blends" / "blob.png"

# THE NOUNS THE TIN HOLDS AND THIS SHEET DOES NOT PRINT, and why — two different
# problems with two different fixes, kept apart so neither is mistaken for the
# other.  check() asserts this list is EXACTLY the tin's nouns minus TILES, so it
# cannot quietly go stale when a tile is added.
HELD_BACK = {
    "cats": "NO ARTWORK anywhere in the repo — needs drawing",
    "moths": "NO ARTWORK anywhere in the repo — needs drawing",
    "bog": "art exists (pink1) but it is a snowy forest path — the wrong thing "
           "entirely, not a bog",
    "cub": "art exists (pink2_short_u) but it is a bear in a field, a wildlife "
           "scene rather than an object on a ground",
    "dad": "art exists (pink2_short_a) but it is a lifestyle photograph of a man "
           "and a baby, not an object on a ground",
    "hill": "art exists (blue3_doubles_ck) but it is a landscape",
    "sand": "art exists (blue2_final_blends) but it is a dusk landscape that "
            "reads as dune or beach; the shelf's own sand art is a whole scene",
    "tip": "art exists (pink2_short_i) but it is a macro of a pen nib, too "
           "abstract to name; the pink-series alternative carries a stock "
           "watermark",
}

# ------------------------------------------------------------------ page ----
PAGE_W, PAGE_H = F21.PAGE_W, F21.PAGE_H         # the frames' page, imported
MARGIN = F21.MARGIN                             # and the frames' margin
TILE = F21.PIC                          # 44.0 — sheet 22's landing, imported
COLS, ROWS = 4, 6                       # the FULL page: 24 cells
PER_PAGE = COLS * ROWS
INSET = 4.0                             # mm — the set's own content-stops-inside
FIELD = TILE - 2.0 * INSET              # 36.0 — the photograph's square
MIN_DPI = 300                           # the floor a tile may be drawn at
CAP_DPI = 400                           # and the ceiling it is prepared to: the
                                        # bank's frames are 900+ dpi in a 36 mm
                                        # field, which is six megabytes of detail
                                        # no printer will lay down and nobody can
                                        # see.  Capping here, once, at prepare
                                        # time, is the whole difference between a
                                        # sheet that opens and one that hangs.

GRID_W, GRID_H = COLS * TILE, ROWS * TILE       # 176 x 264, a FULL page
GRID_X = (PAGE_W - GRID_W) / 2.0                # 17.0 — centred across the page
GRID_TOP = PAGE_H - MARGIN                      # 289.0 — hung from the top margin
GRID_BOT = GRID_TOP - GRID_H                    # 25.0 on a full page

ADULT_FONT, FOOT_SIZE, FOOT_C = F21.ADULT_FONT, F21.FOOT_SIZE, F21.FOOT_C
FOOT_AIR, SAFE = F21.FOOT_AIR, F21.SAFE
CLEAR_DPI, CLEAR_MIN = F21.CLEAR_DPI, F21.CLEAR_MIN

CAPTION = ("picture tiles · %d of them, %.0f mm square, one object a tile and no "
           "word on any — he takes one, lays it on sheet 22's dashed square, then "
           "goes to his word tins · cut every grey line%s")

# HOW THE OBJECT IS FOUND, AND WHY THE THRESHOLD IS NOT A CONSTANT.  A pixel
# carries mass when it is far enough from the ground; the question is how far.  A
# flat studio white needs almost nothing — 10 is plenty.  A textured paper, a
# vignette or a graded backdrop does not: the blob is drawn on a grainy sheet
# whose grain clears a floor of 10 everywhere, so every column carried mass, the
# mass quantile landed on the frame edges and the blob came out printed at a
# fifth of the size it should be.  The floor is therefore READ OFF EACH PICTURE'S
# OWN GROUND — the 99.5th percentile of how far the border ring wanders from its
# median, plus a margin — so it sits just above that ground's noise whatever the
# ground is.  BG_FLOOR is only the floor of the floor.
BG_FLOOR = 10                           # 0-255: the least floor, for a clean white
RING_PCT = 99.5                         # percentile of ring deviation the floor clears
RING_PAD = 6.0                          # and the margin above it
MASS_Q = 0.003                          # the tail of ink mass cut off each end
PAD_FRAC = 0.12                         # breathing room, as a fraction of the crop.
                                        # 0.04 was measured first and was too mean:
                                        # a soft edge or a cast shadow reached past
                                        # it, the crop's own border read as object
                                        # and eight tiles fell back to their whole
                                        # frame — the blob among them, printed at a
                                        # fifth of the size it should be. At 0.12
                                        # every one of the forty comes in under a
                                        # tenth of a percent of edge and not one
                                        # falls back.
# AND THE CROP IS CHECKED AGAINST ITS OWN EDGES.  A floor set too high finds only
# the middle of an object and crops through it — which the old check could not
# see, because it compared the crop with a box measured at the same floor.  So
# after cropping, the crop's OWN border ring is measured: if more than RING_MAX of
# it is object rather than ground, the blade went through something, and the tile
# falls back to the conservative BG_FLOOR box.  Any fallback is named in the
# report.
RING_MAX = 0.02                         # of the crop's border may be object


# ------------------------------------------------------------------- art ----
def ground(a):
    """(bg colour, the floor this picture's own ground asks for)."""
    ring = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3),
                           a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(ring, axis=0)
    noise = float(np.percentile(np.abs(ring - bg).max(axis=1), RING_PCT))
    return bg, max(BG_FLOOR, noise + RING_PAD)


def mass_box(a, bg, floor):
    """The span holding all but MASS_Q of the ink mass at each end of each axis.

    Every pixel gets a WEIGHT — its distance from the ground, with anything under
    `floor` zeroed — and the box is read off the cumulative weight.  A hard
    threshold was tried first and a soft vignette or a spread shadow dragged the
    box to the frame edge on eight of the first twenty-two; mass ignores a wide
    faint smear and finds the object.
    """
    h, w, _ = a.shape
    dev = np.abs(a - bg).max(axis=2)
    dev = np.where(dev < floor, 0.0, dev)
    if dev.sum() <= 0:
        return (0, 0, w, h), 0.0

    def span(v):
        c = np.cumsum(v)
        return (int(np.searchsorted(c, c[-1] * MASS_Q)),
                int(np.searchsorted(c, c[-1] * (1.0 - MASS_Q))) + 1)

    x0, x1 = span(dev.sum(axis=0))
    y0, y1 = span(dev.sum(axis=1))
    return (x0, y0, min(x1, w), min(y1, h)), float((dev > 0).mean())


def pad_box(box, w, h):
    """The box with PAD_FRAC of breathing room, clamped to the frame."""
    l, t, r, b = box
    pad = int(round(PAD_FRAC * max(r - l, b - t)))
    return (max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad))


def ring_object(a, bg, crop, floor):
    """What fraction of a crop's OWN border ring is object rather than ground.

    This is the control of error on the threshold.  A correct crop is padded, so
    its edges are ground; a crop taken at too high a floor runs through the object
    and its edges are full of it.
    """
    l, t, r, b = crop
    sub = a[t:b, l:r]
    if sub.shape[0] < 6 or sub.shape[1] < 6:
        return 1.0
    ring = np.concatenate([sub[:3].reshape(-1, 3), sub[-3:].reshape(-1, 3),
                           sub[:, :3].reshape(-1, 3), sub[:, -3:].reshape(-1, 3)])
    return float((np.abs(ring - bg).max(axis=1) >= floor).mean())


def object_crop(im):
    """(crop, object box, bg, cover, floor, ring fraction, fell back).

    The floor comes off this picture's own ground; if the crop it produces cuts
    through the object — which its own border ring reveals — the tile falls back
    to the conservative BG_FLOOR box, and the fallback is named in the report.
    NOTHING IS EVER CUT OFF: the crop only ever GROWS the box the ink was measured
    into, and check() re-asserts that per tile.
    """
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    bg, floor = ground(a)
    box, cover = mass_box(a, bg, floor)
    crop = pad_box(box, w, h)
    # THE RING IS ALWAYS READ AT THE GROUND'S OWN FLOOR, in both branches.  Reading
    # it at the fallback's floor instead asks "is this edge pixel above 10?" of a
    # grainy paper whose grain is above 10 everywhere, which answers itself and
    # fails every textured picture on the sheet.  `floor` is what separates this
    # ground from an object; the question is only ever asked at that level.
    ring = ring_object(a, bg, crop, floor)

    # THE TEST IS COMPARATIVE, NOT ABSOLUTE, and it has to be.  An absolute
    # threshold fails a picture whose object simply reaches the frame edge in the
    # SOURCE — the ladybird and the log both do — which is the source's property
    # and not this crop's fault, and no crop can fix it.  What is worth catching
    # is a floor that cut into something the conservative floor kept, so the
    # adaptive crop's edges are measured against the CONSERVATIVE crop's edges,
    # and the tile falls back only when the adaptive one is genuinely worse.
    safe_box, safe_cover = mass_box(a, bg, BG_FLOOR)
    safe = pad_box(safe_box, w, h)
    ring_safe = ring_object(a, bg, safe, floor)
    fell = ring > max(RING_MAX, ring_safe)
    if fell:
        crop, box, cover, ring = safe, safe_box, safe_cover, ring_safe
    return (crop, box, tuple(int(v) for v in bg), cover, floor, ring, ring_safe,
            fell)


def prepare(force=False):
    """Crop every source square round its object and write the tile art.

    Returns [(word, source, src px, object box, crop box, out path, out px, dpi)].
    """
    ART_DIR.mkdir(parents=True, exist_ok=True)
    out = []
    for word in TILES:
        src = SOURCE[word]
        if not src.exists():
            raise SystemExit("missing source art for %r: %s" % (word, src))
        dst = ART_DIR / ("%s.jpg" % word)
        with Image.open(src) as im:
            im.load()
            spx = im.size
            crop, box, bg, cover, floor, ring, ring_safe, fell = object_crop(im)
            clipped = not (crop[0] <= box[0] and crop[1] <= box[1]
                           and crop[2] >= box[2] and crop[3] >= box[3])
            if force or not dst.exists():
                cut = im.crop(crop).convert("RGB")
                cap = int(round(CAP_DPI * FIELD / 25.4))
                if max(cut.size) > cap:
                    k = cap / float(max(cut.size))
                    cut = cut.resize((max(1, int(round(cut.size[0] * k))),
                                      max(1, int(round(cut.size[1] * k)))),
                                     Image.LANCZOS)
                cut.save(dst, "JPEG", quality=92, optimize=True, subsampling=0)
        with Image.open(dst) as o:
            opx = o.size
        dw, dh = drawn_mm(opx)
        dpi = opx[0] / (dw / 25.4)
        out.append((word, src, spx, box, crop, bg, cover, clipped, dst, opx,
                    dpi, dw, dh, floor, ring, ring_safe, fell))
    return out


def drawn_mm(px):
    """(w, h) in mm of a picture CONTAINED in the tile's square field."""
    k = FIELD / float(max(px))
    return px[0] * k, px[1] * k


# ---------------------------------------------------------------- layout ----
# THE PAGE IS A WHOLE NUMBER OF FULL ROWS OR IT IS NOT PRINTED.  Twenty-four cells
# fill an A4; forty tiles fill one page and FOUR ROWS of a second, and the two
# rows of paper left under them are trim, not blanks.  check() refuses any tile
# count that would leave a hole in a row, because a cut sheet with a blank card in
# the middle of it is a sheet somebody has to sort.
def pages(art):
    """[[record …]] — the tiles of each page, in order."""
    return [art[i:i + PER_PAGE] for i in range(0, len(art), PER_PAGE)]


def rows_on(n):
    """How many full rows n tiles take."""
    return (n + COLS - 1) // COLS


def cell(i):
    """(x0, y0) of cell i WITHIN ITS PAGE, reading across then down."""
    col, row = i % COLS, i // COLS
    return GRID_X + col * TILE, GRID_TOP - (row + 1) * TILE


def field(i):
    """(x0, y0, side) of cell i's photograph field."""
    x, y = cell(i)
    return x + INSET, y + INSET, FIELD


def cut_xs():
    return [GRID_X + c * TILE for c in range(COLS + 1)]


def cut_ys(n):
    """The row boundaries of a page carrying n tiles — only the rows it uses."""
    return [GRID_TOP - r * TILE for r in range(rows_on(n) + 1)]


def grid_bot(n):
    return GRID_TOP - rows_on(n) * TILE


def caption_text(pno, npages):
    of = "" if npages == 1 else " · sheet %d of %d" % (pno, npages)
    return CAPTION % (len(TILES), TILE, of)


def caption_y():
    down = min(F21.F20.caption_ink(caption_text(i, 9))[0] for i in (1, 9))
    return MARGIN + FOOT_AIR - down


def caption_extent():
    inks = [F21.F20.caption_ink(caption_text(i, 9)) for i in (1, 9)]
    y = caption_y()
    return y + min(d for d, _u in inks), y + max(u for _d, u in inks)


# ------------------------------------------------------------------ check ----
def tin_nouns():
    """build_12's own noun list — the gate, read from the tin and never re-typed."""
    return sorted(w for key, _l, _s, ws in W12.CATEGORIES if key == "noun" for w in ws)


def check(art):
    """The gate, the grid and the resolution, before a single mark is made."""
    bad = []
    nouns = set(tin_nouns())
    for word in TILES:
        if word not in nouns:
            bad.append("%r is on a tile and is not a noun the tin holds — he would "
                       "choose it and find no card" % word)
        if W12.CLASS_OF.get(word) != "noun":
            bad.append("the tin classes %r as %s, not a noun"
                       % (word, W12.CLASS_OF.get(word)))
    if len(set(TILES)) != len(TILES):
        bad.append("a word is printed on two tiles")

    # ---- FULL ROWS, NO HOLES.  A page may be short; a row may not.
    if len(TILES) % COLS:
        bad.append("%d tiles leave %d cell(s) of a row empty — this sheet prints "
                   "whole rows, so a blank card never lands in the middle of a cut "
                   "strip.  Add or hold back %d."
                   % (len(TILES), COLS - len(TILES) % COLS, COLS - len(TILES) % COLS))

    # ---- HELD_BACK is the complement, or the report lies
    absent = sorted(nouns - set(TILES))
    if sorted(HELD_BACK) != absent:
        bad.append("HELD_BACK names %s and the tin minus the tiles is %s — the two "
                   "must agree or the build report lies about what is missing"
                   % (sorted(HELD_BACK), absent))

    for (word, _src, _spx, _box, _crop, _bg, cover, clipped, _dst, opx, dpi,
         dw, dh, floor, ring, ring_safe, _fell) in art:
        if ring > max(RING_MAX, ring_safe) + 1e-9:
            bad.append("%r's crop has %.1f%% object on its own border against the "
                       "conservative crop's %.1f%% — the threshold cut into it"
                       % (word, ring * 100.0, ring_safe * 100.0))
        if clipped:
            bad.append("%r's crop does not contain its whole object box" % word)
        if dpi > CAP_DPI + 1.0:
            bad.append("%r is prepared at %.0f dpi, over the %d dpi cap"
                       % (word, dpi, CAP_DPI))
        if dpi < MIN_DPI:
            bad.append("%r would be drawn at %.0f dpi in a %.1f x %.1f mm picture, "
                       "under the %d dpi floor" % (word, dpi, dw, dh, MIN_DPI))
        if max(dw, dh) > FIELD + 1e-9:
            bad.append("%r's picture is %.1f x %.1f mm, over the %.0f mm field"
                       % (word, dw, dh, FIELD))
        if not 0.01 <= cover <= 0.999:
            bad.append("%r's ink covers %.1f%% of its frame — the ground was "
                       "probably not found" % (word, cover * 100.0))

    if abs(GRID_X * 2.0 + GRID_W - PAGE_W) > 1e-9:
        bad.append("the grid is not centred across the page")
    if GRID_X < MARGIN:
        bad.append("the %d x %.0f mm grid is wider than the page's margins allow"
                   % (COLS, TILE))
    if GRID_BOT < SAFE:
        bad.append("a full grid runs past the printer-safe margin")
    floor, head = caption_extent()
    if floor < MARGIN - 1e-9:
        bad.append("the caption's ink falls to %.2f mm, under the %.1f margin"
                   % (floor, MARGIN))
    if head > GRID_BOT - 1e-9:
        bad.append("the caption's ink reaches %.2f mm, into a full page's last cut "
                   "at %.1f" % (head, GRID_BOT))
    npages = len(pages(art))
    for pno in range(1, npages + 1):
        w = pdfmetrics.stringWidth(caption_text(pno, npages), ADULT_FONT,
                                   FOOT_SIZE) / 72.0 * 25.4
        if w > PAGE_W - 2.0 * MARGIN + 1e-9:
            bad.append("the caption is %.1f mm wide, over the measure" % w)

    if bad:
        raise SystemExit("SPEC FAILURE:\n  " + "\n  ".join(bad))
    return absent


# ------------------------------------------------------------------- draw ----
def draw_page(c, page, pno, npages, cuts=True):
    for i, rec in enumerate(page):
        x, y, side = field(i)
        c.drawImage(str(rec[8]), x * mm, y * mm, side * mm, side * mm,
                    preserveAspectRatio=True, anchor="c", mask=None)
    if cuts:
        CM.cut_lines(c, [(x, grid_bot(len(page)), GRID_TOP) for x in cut_xs()],
                     [(y, 0.0, PAGE_W) for y in cut_ys(len(page))], PAGE_W, PAGE_H)
    c.saveState()
    c.setFillColor(FOOT_C)
    c.setFont(ADULT_FONT, FOOT_SIZE)
    c.drawString(MARGIN * mm, caption_y() * mm, caption_text(pno, npages))
    c.restoreState()


def write_pdf(path, art, cuts=True):
    c = canvas.Canvas(str(path), pagesize=(PAGE_W * mm, PAGE_H * mm))
    c.setTitle(PDF_TITLE)
    c.setAuthor(PDF_AUTHOR)
    c.setSubject(PRINT_NOTE)
    pp = pages(art)
    for pno, page in enumerate(pp, start=1):
        draw_page(c, page, pno, len(pp), cuts=cuts)
        c.showPage()
    c.save()


# ----------------------------------------------------------------- verify ----
def verify(pdf, clean, art):
    """Read the FINISHED PDF back: one image a tile, in its own field, and no word."""
    bad = []
    want_pt = (PAGE_W / 25.4 * 72.0, PAGE_H / 25.4 * 72.0)
    rgb, K = F21.F20.rgb, 25.4 / 72.0
    worst = (0.0, None)
    pp = pages(art)

    with pikepdf.open(pdf) as doc, pikepdf.open(clean) as cdoc:
        if len(doc.pages) != len(pp):
            bad.append("%d pages, not the %d the tiles need" % (len(doc.pages), len(pp)))
        for pno, page_art in enumerate(pp):
            page, cpage = doc.pages[pno], cdoc.pages[pno]
            mb = [float(v) for v in page.MediaBox]
            if (abs(mb[2] - mb[0] - want_pt[0]) > 0.01
                    or abs(mb[3] - mb[1] - want_pt[1]) > 0.01):
                bad.append("page %d is not %.0f x %.0f mm" % (pno + 1, PAGE_W, PAGE_H))

            # ---- one XObject drawn a tile, at its own field, at the right size
            placed = []
            ctm, stack = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0), []
            for operands, op in pikepdf.parse_content_stream(cpage):
                o, a = str(op), list(operands)
                if o == "q":
                    stack.append(ctm)
                elif o == "Q":
                    ctm = stack.pop() if stack else ctm
                elif o == "cm":
                    ctm = F21.F20._mul(tuple(float(v) for v in a), ctm)
                elif o == "Do":
                    placed.append((ctm[4] * K, ctm[5] * K, ctm[0] * K, ctm[3] * K))
            if len(placed) != len(page_art):
                bad.append("page %d draws %d images, not its %d tiles"
                           % (pno + 1, len(placed), len(page_art)))
                continue
            want = []
            for i, rec in enumerate(page_art):
                fx, fy, side = field(i)
                dw, dh = rec[11], rec[12]
                want.append((fx + (side - dw) / 2.0, fy + (side - dh) / 2.0,
                             dw, dh, rec[0]))
            placed.sort(key=lambda p: (-round(p[1] + p[3] / 2.0, 1), p[0]))
            want.sort(key=lambda t: (-round(t[1] + t[3] / 2.0, 1), t[0]))
            for (gx, gy, gw, gh), (wx, wy, ww, wh, word) in zip(placed, want):
                if gw > FIELD + 0.02 or gh > FIELD + 0.02:
                    bad.append("%r is drawn %.2f x %.2f mm, over the %.0f mm field"
                               % (word, gw, gh, FIELD))
                d = max(abs(gx - wx), abs(gy - wy), abs(gw - ww), abs(gh - wh))
                worst = max(worst, (d, word))
                if d > 0.05:
                    bad.append("%r is drawn %.2f x %.2f at %.2f,%.2f mm, %.3f off "
                               "the %.2f x %.2f at %.2f,%.2f it was measured for"
                               % (word, gw, gh, gx, gy, d, ww, wh, wx, wy))

            # ---- the cut lines: the columns, and only the rows this page uses
            M = F21.F20.page_marks(page)
            cuts = [s for s in M["strokes"] if s[0] == rgb(CM.HAIR_C)]
            nrows = rows_on(len(page_art))
            if len(cuts) != COLS + 1 + nrows + 1:
                bad.append("page %d strokes %d cut lines, not the %d its %d rows "
                           "need" % (pno + 1, len(cuts), COLS + 1 + nrows + 1, nrows))
            for _col, wid, pq in cuts:
                if abs(wid - CM.HAIR_W) > 1e-6:
                    bad.append("page %d strokes a cut %.3f mm wide, not the house "
                               "%.2f" % (pno + 1, wid, CM.HAIR_W))
            vert = sorted(round(pq[0][0], 2) for _c, _w, pq in cuts
                          if abs(pq[0][0] - pq[1][0]) < 0.01)
            horz = sorted(round(pq[0][1], 2) for _c, _w, pq in cuts
                          if abs(pq[0][1] - pq[1][1]) < 0.01)
            if vert != sorted(round(v, 2) for v in cut_xs()):
                bad.append("page %d's down cuts are at %s, not on the tile columns"
                           % (pno + 1, vert))
            if horz != sorted(round(v, 2) for v in cut_ys(len(page_art))):
                bad.append("page %d's across cuts are at %s, not on its own %d rows"
                           % (pno + 1, horz, nrows))

            # ---- the type: ONE adult string, in the adult grey, on the margin
            if len(M["text"]) != 1:
                bad.append("page %d sets %d strings, not the caption's one"
                           % (pno + 1, len(M["text"])))
            for col, tx, _ty, _nb in M["text"]:
                if col != rgb(FOOT_C):
                    bad.append("page %d sets type in %s, not the adult grey"
                               % (pno + 1, col))
                if abs(tx - MARGIN) > 0.01:
                    bad.append("page %d's caption sits at x %.2f, not on the margin"
                               % (pno + 1, tx))
        if str(doc.docinfo.get("/Title", "")) != PDF_TITLE:
            bad.append("the PDF Title is not this sheet's")
        if str(doc.docinfo.get("/Author", "")) != PDF_AUTHOR:
            bad.append("the PDF Author is not the set's")

    # ---- NO WORD ON ANY TILE, proved off the extracted text layer
    if shutil.which("pdftotext"):
        for pno in range(1, len(pp) + 1):
            got = " ".join(subprocess.run(
                ["pdftotext", "-f", str(pno), "-l", str(pno), str(pdf), "-"],
                check=True, capture_output=True, text=True).stdout.split())
            want_t = " ".join(caption_text(pno, len(pp)).split())
            if got != want_t:
                bad.append("page %d's text layer reads %r; the only type on it is "
                           "the foot caption" % (pno, got[:120]))
    else:
        bad.append("no pdftotext: the no-word-on-a-tile assertion did NOT run")
    if bad:
        raise SystemExit("VERIFY FAILURE:\n  " + "\n  ".join(bad))
    return worst


# -------------------------------------------------------------- clearance ----
def clearance(clean, art):
    """NOTHING MAY SIT ACROSS A CUT, measured inside the grid rectangle of each
    page.  Only the grid is measured: the foot caption is printed on the trim and
    runs from the left margin, so it passes under the first down cut on its way,
    and measuring it would report a hundredth of a millimetre for a line of adult
    type that is nowhere near a tile."""
    if not shutil.which("pdftoppm"):
        return None
    px = 25.4 / CLEAR_DPI
    tight = (1e9, None)
    for pno, page_art in enumerate(pages(art), start=1):
        stem = SCRATCH / ("tiles-clear-%d" % pno)
        subprocess.run(["pdftoppm", "-r", str(CLEAR_DPI), "-gray", "-png", "-f",
                        str(pno), "-l", str(pno), "-singlefile", str(clean),
                        str(stem)], check=True, capture_output=True)
        a = np.asarray(Image.open(str(stem) + ".png").convert("L"))
        ink = np.zeros_like(a, dtype=bool)
        gb = grid_bot(len(page_art))
        r0, r1 = int((PAGE_H - GRID_TOP) / px), int((PAGE_H - gb) / px) + 1
        c0, c1 = int(GRID_X / px), int((GRID_X + GRID_W) / px) + 1
        ink[r0:r1, c0:c1] = a[r0:r1, c0:c1] < 250
        ys = PAGE_H - (np.nonzero(ink.any(axis=1))[0] + 0.5) * px
        xs = (np.nonzero(ink.any(axis=0))[0] + 0.5) * px
        for y in cut_ys(len(page_art)):
            if len(ys):
                d = float(np.abs(ys - y).min())
                if d < tight[0]:
                    tight = (d, "sheet %d, the across cut at %.1f mm" % (pno, y))
        for x in cut_xs():
            if len(xs):
                d = float(np.abs(xs - x).min())
                if d < tight[0]:
                    tight = (d, "sheet %d, the down cut at %.1f mm" % (pno, x))
    if tight[0] < CLEAR_MIN:
        raise SystemExit("VERIFY FAILURE: ink comes within %.3f mm of a cut line "
                         "(%s); %.2f mm is the floor" % (tight[0], tight[1], CLEAR_MIN))
    return tight


def proof(pdf, npages):
    if not shutil.which("pdftoppm"):
        return None
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(1, npages + 1):
        stem = PROOF_DIR / ("picture-tiles-p%d" % i)
        subprocess.run(["pdftoppm", "-r", "150", "-png", "-f", str(i), "-l", str(i),
                        "-singlefile", str(pdf), str(stem)], check=True,
                       capture_output=True)
        made.append(Path(str(stem) + ".png"))
    return made


# ------------------------------------------------------------------ build ----
def build(force=False):
    W12.register_fonts()
    W12.SIZE, W12.SIZE_FROM = W12.word_size()
    art = prepare(force=force)
    missing = check(art)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / NAME
    write_pdf(out, art)
    clean = SCRATCH / "tiles-nomarks.pdf"
    write_pdf(clean, art, cuts=False)
    worst = verify(out, clean, art)
    tight = clearance(clean, art)
    pp = pages(art)
    made = proof(out, len(pp))

    print("picture tiles -> %s" % OUT_DIR)
    print("  %-24s %d pp · A4 portrait · %d tiles of %.0f mm on a %d-wide grid · "
          "%s · NO BLANK CELL ANYWHERE · %d bytes"
          % (NAME, len(pp), len(TILES), TILE, COLS,
             " + ".join("%d" % len(p) for p in pp), out.stat().st_size))
    print("  the tile IS sheet 22's landing: %.0f mm, imported from "
          "build_21_frames_picture.PIC, so a tile covers a dashed square exactly"
          % TILE)
    print("  WHOLE ROWS ONLY: %d tiles is %d full rows of %d, so a cut strip never "
          "carries a blank card; the paper under the last row of sheet %d is trim"
          % (len(TILES), rows_on(len(TILES)), COLS, len(pp)))
    print("  NO WORD ON ANY TILE: every page's text layer extracts to its foot "
          "caption and nothing else — the picture gives him the subject and the "
          "noun card is still his to find")
    print("  EVERY TILE IS A NOUN THE TIN HOLDS, checked against build_12's own "
          "word list: %d of the tin's %d nouns are printed"
          % (len(TILES), len(tin_nouns())))
    print("  the %d the tin holds and this sheet does not print — two different "
          "problems, kept apart because the fix differs:" % len(missing))
    for word in missing:
        print("    %-7s %s" % (word, HELD_BACK[word]))
    print("  grid %.0f mm wide centred at x %.1f, hung from the %.1f mm top margin "
          "· %d down cuts and %d/%d across, cutmarks' %.2f mm hairline, butted "
          "with NO gutter so one stroke of the blade is one tile edge"
          % (GRID_W, GRID_X, MARGIN, COLS + 1, rows_on(len(pp[0])) + 1,
             rows_on(len(pp[-1])) + 1, CM.HAIR_W))
    print("  content stops %.0f mm inside every tile edge: the photograph is a "
          "%.0f mm square field, so no two grounds ever touch and no blade ever "
          "reaches a photograph" % (INSET, FIELD))
    print("  art prepared into %s — the dead margin cropped away ROUND THE OBJECT, "
          "then contained in the %.0f mm field at its own aspect, %d-%d dpi:"
          % (ART_DIR.relative_to(REPO), FIELD, MIN_DPI, CAP_DPI))
    for (word, src, spx, box, crop, bg, cov, _cl, _dst, opx, dpi, dw, dh,
         floor, ring, _rs, fell) in art:
        tag = "" if src.is_relative_to(BANK) else "  <- %s" % src.parent.name
        print("    %-9s %4dx%-4d ground %s floor %5.1f%s  ink %4d,%-4d-%4d,%-4d "
              "(%4.1f%%)  crop %4dx%-4d edge %4.1f%%  drawn %5.1f x %4.1f mm at "
              "%4.0f dpi%s"
              % (word, spx[0], spx[1], "%3d,%3d,%3d" % bg, floor,
                 " FELL BACK" if fell else "         ", box[0], box[1], box[2],
                 box[3], cov * 100.0, opx[0], opx[1], ring * 100.0, dw, dh, dpi, tag))
    print("  NOT ONE OBJECT WAS CROPPED INTO: the crop only ever GROWS the box the "
          "ink was measured into, and check() re-asserts that per tile — a square "
          "crop was measured first and would have cut objects wider than their "
          "own frames are tall")
    print("  images read back off the content streams and matched to their fields, "
          "worst %.3f mm (%s)" % worst)
    if tight:
        print("  nothing crosses a cut: tightest ink-to-cut %.2f mm (%s) on a %d dpi "
              "raster of the pages without their marks; floor %.2f"
              % (tight[0], tight[1], CLEAR_DPI, CLEAR_MIN))
    else:
        print("  ! no pdftoppm: the cut clearance was NOT measured")
    cfloor, chead = caption_extent()
    print("  caption: Andika %.1f pt, one line a page — ink %.2f to %.2f mm, below "
          "a full page's last cut at %.1f and clear of the %.1f mm margin"
          % (FOOT_SIZE, cfloor, chead, GRID_BOT, MARGIN))
    if made:
        print("  proof %s: %s" % (PROOF_DIR.relative_to(REPO),
                                  ", ".join(p.name for p in made)))


if __name__ == "__main__":
    build(force="--force" in sys.argv)
